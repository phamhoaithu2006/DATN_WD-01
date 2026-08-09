import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "../../components/customer/Icon";
import TourCard from "../../components/customer/TourCard";
import FilterSidebar from "../../components/customer/tours/FilterSidebar";
import { useLocale } from "../../contexts/LocaleContext";
import {
  fetchTourFilterOptions,
  fetchToursWithMeta,
} from "../../services/customerApi";
import { isDomesticTour, normalizeTour } from "../../utils/tourNormalizer";

const SORT_OPTIONS = [
  { value: "latest", label: "Mới nhất" },
  { value: "discount", label: "Ưu đãi tốt nhất" },
  { value: "popular", label: "Phổ biến nhất" },
  { value: "price_asc", label: "Giá thấp đến cao" },
  { value: "price_desc", label: "Giá cao đến thấp" },
  { value: "rating_desc", label: "Đánh giá cao nhất" },
  { value: "departure_soon", label: "Khởi hành gần nhất" },
];

const PER_PAGE = 12;
const DURATION_LABELS = { "1-3": "1–3 ngày", "4-7": "4–7 ngày", "8+": "8+ ngày" };

/**
 * URL là nguồn chân lý của toàn bộ trạng thái bộ lọc:
 * F5 / chia sẻ link / back-forward đều giữ nguyên kết quả.
 */
function parseParams(search) {
  const query = new URLSearchParams(search);

  return {
    q: query.get("q") || "",
    price_min: query.get("price_min") || "",
    price_max: query.get("price_max") || "",
    departure_location: query.get("departure_location") || "",
    destinations: query.getAll("destinations"),
    categories: query.getAll("categories"),
    duration: query.getAll("duration"),
    departure_date: query.get("departure_date") || "",
    date_from: query.get("date_from") || "",
    date_to: query.get("date_to") || "",
    rating_min: query.get("rating_min") || "",
    sort: query.get("sort") || "latest",
    page: Math.max(1, Number(query.get("page")) || 1),
    scope: query.get("scope") || "",
  };
}

function buildSearch(params) {
  const query = new URLSearchParams();

  if (params.q) query.set("q", params.q);
  if (params.price_min) query.set("price_min", params.price_min);
  if (params.price_max) query.set("price_max", params.price_max);
  if (params.departure_location) query.set("departure_location", params.departure_location);
  params.destinations.forEach((id) => query.append("destinations", id));
  params.categories.forEach((id) => query.append("categories", id));
  params.duration.forEach((bucket) => query.append("duration", bucket));
  if (params.departure_date) query.set("departure_date", params.departure_date);
  if (params.date_from) query.set("date_from", params.date_from);
  if (params.date_to) query.set("date_to", params.date_to);
  if (params.rating_min) query.set("rating_min", params.rating_min);
  if (params.sort && params.sort !== "latest") query.set("sort", params.sort);
  if (params.page > 1) query.set("page", String(params.page));
  if (params.scope) query.set("scope", params.scope);

  return query.toString();
}

function countActiveFilters(params) {
  return (
    (params.q ? 1 : 0) +
    (params.price_min || params.price_max ? 1 : 0) +
    (params.departure_location ? 1 : 0) +
    params.destinations.length +
    params.categories.length +
    params.duration.length +
    (params.departure_date ? 1 : 0) +
    (params.date_from || params.date_to ? 1 : 0) +
    (params.rating_min ? 1 : 0)
  );
}

function SkeletonCard() {
  return (
    <div className="vg-skeleton-card" aria-hidden="true">
      <div className="vg-skeleton-image" />
      <div className="vg-skeleton-line wide" />
      <div className="vg-skeleton-line" />
      <div className="vg-skeleton-line narrow" />
    </div>
  );
}

function Pagination({ meta, onPage }) {
  if (!meta || meta.last_page <= 1) return null;

  const current = meta.current_page;
  const pages = [];

  for (
    let page = Math.max(1, current - 2);
    page <= Math.min(meta.last_page, current + 2);
    page += 1
  ) {
    pages.push(page);
  }

  return (
    <nav className="vg-pagination" aria-label="Phân trang">
      <button
        type="button"
        disabled={current <= 1}
        onClick={() => onPage(current - 1)}
      >
        ‹ Trước
      </button>
      {pages[0] > 1 ? <span>…</span> : null}
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          className={page === current ? "active" : ""}
          onClick={() => onPage(page)}
        >
          {page}
        </button>
      ))}
      {pages[pages.length - 1] < meta.last_page ? <span>…</span> : null}
      <button
        type="button"
        disabled={current >= meta.last_page}
        onClick={() => onPage(current + 1)}
      >
        Sau ›
      </button>
    </nav>
  );
}

function ToursPage({ favorites = [], onFavorite }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { formatCurrency } = useLocale();

  const params = useMemo(() => parseParams(location.search), [location.search]);

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filterOptions, setFilterOptions] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Giá trị đang gõ/kéo, debounce 350ms rồi mới ghi vào URL.
  const [qDraft, setQDraft] = useState(params.q);
  const [priceDraft, setPriceDraft] = useState({
    min: params.price_min ? Number(params.price_min) : null,
    max: params.price_max ? Number(params.price_max) : null,
  });

  const resultsRef = useRef(null);

  const updateParams = (patch, { resetPage = true } = {}) => {
    const next = { ...params, ...patch };

    if (resetPage) {
      next.page = 1;
    }

    // replace thay vì push: kéo slider liên tiếp không làm bẩn lịch sử back.
    navigate(`${location.pathname}?${buildSearch(next)}`, { replace: true });
  };

  // URL đổi từ bên ngoài (back/forward, share link) → đồng bộ lại draft.
  useEffect(() => {
    // Đồng bộ draft khi URL đổi từ ngoài (back/forward, share link).
    setQDraft(params.q);
  }, [params.q]);

  useEffect(() => {
    setPriceDraft({
      min: params.price_min ? Number(params.price_min) : null,
      max: params.price_max ? Number(params.price_max) : null,
    });
  }, [params.price_min, params.price_max]);

  // Debounce từ khóa.
  useEffect(() => {
    if (qDraft === params.q) return undefined;

    const timeoutId = window.setTimeout(() => {
      updateParams({ q: qDraft.trim() });
    }, 350);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft]);

  // Debounce thanh trượt giá.
  useEffect(() => {
    const urlMin = params.price_min ? Number(params.price_min) : null;
    const urlMax = params.price_max ? Number(params.price_max) : null;

    if (priceDraft.min === urlMin && priceDraft.max === urlMax) return undefined;

    const timeoutId = window.setTimeout(() => {
      const bounds = filterOptions?.price;
      const isFullRange =
        bounds &&
        priceDraft.min !== null &&
        priceDraft.max !== null &&
        priceDraft.min <= Math.floor(bounds.min / 100000) * 100000 &&
        priceDraft.max >= Math.ceil(bounds.max / 100000) * 100000;

      updateParams({
        price_min: isFullRange || priceDraft.min === null ? "" : String(priceDraft.min),
        price_max: isFullRange || priceDraft.max === null ? "" : String(priceDraft.max),
      });
    }, 350);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceDraft]);

  // Metadata bộ lọc: gọi một lần khi vào trang.
  useEffect(() => {
    let active = true;

    fetchTourFilterOptions()
      .then((options) => {
        if (active) setFilterOptions(options);
      })
      .catch(() => {
        // Không có metadata vẫn dùng được bộ lọc với giá trị mặc định.
      });

    return () => {
      active = false;
    };
  }, []);

  // URL đổi → gọi API. AbortController hủy request cũ để tránh race condition.
  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);

    const apiParams = {
      q: params.q || undefined,
      price_min: params.price_min || undefined,
      price_max: params.price_max || undefined,
      departure_location: params.departure_location || undefined,
      destinations: params.destinations.length ? params.destinations : undefined,
      categories: params.categories.length ? params.categories : undefined,
      duration: params.duration.length ? params.duration : undefined,
      departure_date: params.departure_date || undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
      rating_min: params.rating_min || undefined,
      sort: params.sort !== "latest" ? params.sort : undefined,
      page: params.page > 1 ? params.page : undefined,
      per_page: PER_PAGE,
    };

    fetchToursWithMeta(apiParams, controller.signal)
      .then(({ items: rawItems, meta: pageMeta }) => {
        let normalized = rawItems.map(normalizeTour);

        if (params.scope === "domestic") {
          normalized = normalized.filter((tour) => isDomesticTour(tour));
        } else if (params.scope === "international") {
          normalized = normalized.filter((tour) => !isDomesticTour(tour));
        }

        setItems(normalized);
        setMeta(pageMeta);
        setLoadError("");
        setLoading(false);
      })
      .catch((error) => {
        if (controller.signal.aborted || error.code === "ERR_CANCELED") return;

        console.error("Không thể tải danh sách tour:", error);
        setItems([]);
        setMeta(null);
        setLoadError("Không thể tải danh sách tour. Vui lòng thử lại sau.");
        setLoading(false);
      });

    return () => controller.abort();
  }, [location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCount = countActiveFilters(params);

  const optionName = (list, id) =>
    (list || []).find((item) => String(item.id) === id)?.name || `#${id}`;

  const chips = [];

  if (params.q) {
    chips.push({ key: "q", label: `Từ khóa: ${params.q}`, patch: { q: "" } });
  }

  if (params.price_min || params.price_max) {
    const minLabel = params.price_min ? formatCurrency(Number(params.price_min)) : "0";
    const maxLabel = params.price_max
      ? formatCurrency(Number(params.price_max))
      : "không giới hạn";

    chips.push({
      key: "price",
      label: `Giá: ${minLabel} – ${maxLabel}`,
      patch: { price_min: "", price_max: "" },
    });
  }

  if (params.departure_location) {
    chips.push({
      key: "departure-location",
      label: `Khởi hành từ: ${params.departure_location}`,
      patch: { departure_location: "" },
    });
  }

  params.destinations.forEach((id) => {
    chips.push({
      key: `dest-${id}`,
      label: optionName(filterOptions?.destinations, id),
      patch: { destinations: params.destinations.filter((value) => value !== id) },
    });
  });

  params.categories.forEach((id) => {
    chips.push({
      key: `cat-${id}`,
      label: optionName(filterOptions?.categories, id),
      patch: { categories: params.categories.filter((value) => value !== id) },
    });
  });

  params.duration.forEach((bucket) => {
    chips.push({
      key: `dur-${bucket}`,
      label: DURATION_LABELS[bucket] || bucket,
      patch: { duration: params.duration.filter((value) => value !== bucket) },
    });
  });

  if (params.departure_date) {
    chips.push({
      key: "departure-date",
      label: `Ngày đi: ${params.departure_date}`,
      patch: { departure_date: "" },
    });
  }

  if (params.date_from || params.date_to) {
    chips.push({
      key: "dates",
      label: `Khởi hành: ${params.date_from || "..."} → ${params.date_to || "..."}`,
      patch: { date_from: "", date_to: "" },
    });
  }

  if (params.rating_min) {
    chips.push({
      key: "rating",
      label: `Từ ${params.rating_min}★ trở lên`,
      patch: { rating_min: "" },
    });
  }

  const clearAll = () => {
    navigate(
      `${location.pathname}${params.scope ? `?scope=${params.scope}` : ""}`,
      { replace: true },
    );
  };

  const handlePage = (page) => {
    updateParams({ page }, { resetPage: false });
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const sidebar = (closeButton) => (
    <FilterSidebar
      options={filterOptions}
      params={params}
      priceDraft={priceDraft}
      onPriceDraftChange={setPriceDraft}
      onChange={updateParams}
      onClearAll={clearAll}
      activeCount={activeCount}
      onClose={closeButton ? () => setDrawerOpen(false) : null}
    />
  );

  return (
    <main className="vg-listing-page">
      <section className="vg-listing-hero">
        <div className="vg-container">
          <span>KHÁM PHÁ CÙNG VIVUGO</span>
          <h1>Tìm tour phù hợp với bạn</h1>
          <p>
            Chọn hành trình, thời gian và ngân sách — phần còn lại để ViVuGo lo.
          </p>
          <label>
            <Icon name="search" />
            <input
              value={qDraft}
              onChange={(event) => setQDraft(event.target.value)}
              placeholder="Tìm tour hoặc điểm đến..."
            />
          </label>
        </div>
      </section>

      {loadError ? (
        <div className="vg-container">
          <div className="vg-data-alert" role="alert">
            {loadError}
          </div>
        </div>
      ) : null}

      <section className="vg-container vg-listing-layout">
        <div className="vg-filter-desktop">{sidebar(false)}</div>

        {drawerOpen ? (
          <div className="vg-filter-drawer" role="dialog" aria-label="Bộ lọc">
            <button
              type="button"
              className="vg-filter-drawer-backdrop"
              aria-label="Đóng bộ lọc"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="vg-filter-drawer-panel">{sidebar(true)}</div>
          </div>
        ) : null}

        <div ref={resultsRef}>
          <div className="vg-results">
            <h2>
              {loading
                ? "Đang tìm tour..."
                : `Tìm thấy ${meta?.total ?? items.length} tour`}
            </h2>

            <div className="vg-results-actions">
              <button
                type="button"
                className="vg-filter-toggle"
                onClick={() => setDrawerOpen(true)}
              >
                Bộ lọc{activeCount > 0 ? ` (${activeCount})` : ""}
              </button>

              <select
                aria-label="Sắp xếp"
                value={params.sort}
                onChange={(event) => updateParams({ sort: event.target.value })}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {chips.length > 0 ? (
            <div className="vg-active-filter-bar">
              <span className="vg-active-filter-title">
                <Icon name="sparkle" size={13} /> Đang lọc theo:
              </span>
              <div className="vg-chips">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    className="vg-chip"
                    onClick={() => updateParams(chip.patch)}
                  >
                    <span>{chip.label}</span>
                    <span className="vg-chip-close" aria-hidden="true">×</span>
                  </button>
                ))}
                <button type="button" className="vg-chip clear" onClick={clearAll}>
                  Xóa tất cả ({chips.length})
                </button>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="vg-tour-grid">
              {Array.from({ length: 6 }, (_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : items.length > 0 ? (
            <>
              <div className="vg-tour-grid">
                {items.map((tour) => (
                  <TourCard
                    key={tour.id}
                    tour={tour}
                    favorite={favorites.includes(tour.id)}
                    onFavorite={onFavorite}
                  />
                ))}
              </div>
              <Pagination meta={meta} onPage={handlePage} />
            </>
          ) : (
            <div className="vg-empty-state">
              <h3>Không tìm thấy tour phù hợp</h3>
              <p>
                Thử nới lỏng bộ lọc: mở rộng khoảng giá, bỏ bớt điểm đến hoặc
                chọn khoảng ngày khác.
              </p>
              {activeCount > 0 ? (
                <button type="button" onClick={clearAll}>
                  Xóa tất cả bộ lọc
                </button>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default ToursPage;
