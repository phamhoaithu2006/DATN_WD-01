import { useEffect, useMemo, useState } from "react";
import { readSession } from "../../services/authStorage";
import {
  getGuideTourCompleted,
  getGuideTourDetail,
  getGuideTourCustomers,
  getGuideTourOngoing,
  getGuideTourUpcoming,
  getGuideTours,
} from "../../services/guideTourApi";
import {
  formatDate,
  formatMoney,
  formatNumber,
  getDestination,
  getInitials,
  getTourImage,
  getTourStateClass,
  getTourStateLabel,
  getTourTitle,
  normalizePaginator,
} from "./guidePageUtils";

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function getTourDescription(item) {
  return stripHtml(
    item?.tour?.description ||
      item?.tour?.summary ||
      item?.description ||
      item?.summary,
  );
}

const tabs = [
  { key: "all", label: "Tất cả" },
  { key: "upcoming", label: "Sắp diễn ra" },
  { key: "ongoing", label: "Đang dẫn Tour" },
  { key: "pending", label: "Đang chờ xét duyệt" },
  { key: "completed", label: "Hoàn thành" },
];
const fetchers = {
  all: getGuideTours,
  upcoming: getGuideTourUpcoming,
  ongoing: getGuideTourOngoing,
  completed: getGuideTourCompleted,
  pending: getGuideTours,
};
function TourRow({ customerCount, item, onDetail }) {
  const image = getTourImage(item);
  const title = getTourTitle(item);
  return (
    <article className="guide-shot-tour-row">
      <div className="guide-shot-tour-thumb">
        {image ? (
          <img src={image} alt={title} />
        ) : (
          <span>{getInitials(title)}</span>
        )}
      </div>
      <div className="guide-shot-tour-main">
        <h3>{title}</h3>
        <div className="guide-shot-tour-meta">
          <span>
            <svg viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {formatDate(item?.departure_date)} -{" "}
            {formatDate(item?.return_date || item?.departure_date)}
          </span>
          <span>
            <svg viewBox="0 0 24 24">
              <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {formatNumber(
              customerCount ??
                item?.booked_slots ??
                item?.customers_count ??
                item?.participants_count ??
                0,
            )}{" "}
            khách
          </span>
          <span>
            <svg viewBox="0 0 24 24">
              <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {getDestination(item)}
          </span>
        </div>
      </div>
      <div className="guide-shot-row-actions">
        <span className={`guide-shot-status ${getTourStateClass(item)}`}>
          {getTourStateLabel(item)}
        </span>
        <button type="button" onClick={() => onDetail(item)}>
          Chi tiết
        </button>
      </div>
    </article>
  );
}

function TourDetailModal({ customerTotal, customers, item, loading, onClose }) {
  if (!item) return null;

  const image = getTourImage(item);
  const title = getTourTitle(item);
  const itineraries = Array.isArray(item?.tour?.itineraries)
    ? item.tour.itineraries
    : [];

  return (
    <div
      className="guide-tour-detail-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="guide-tour-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết tour"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="guide-tour-detail-close"
          onClick={onClose}
          aria-label="Đóng"
        >
          ×
        </button>
        <div className="guide-tour-detail-hero">
          {image ? (
            <img src={image} alt={title} />
          ) : (
            <span>{getInitials(title)}</span>
          )}
          <div>
            <small>{getTourStateLabel(item)}</small>
            <h2>{title}</h2>
            <p>{getDestination(item)}</p>
          </div>
        </div>
        <div className="guide-tour-detail-grid">
          <article>
            <span>Khởi hành</span>
            <strong>{formatDate(item?.departure_date)}</strong>
          </article>
          <article>
            <span>Ngày về</span>
            <strong>
              {formatDate(item?.return_date || item?.departure_date)}
            </strong>
          </article>
          <article>
            <span>Số khách</span>
            <strong>
              {formatNumber(
                customerTotal ??
                  item?.booked_slots ??
                  item?.customers_count ??
                  item?.participants_count ??
                  0,
              )}{" "}
              khách
            </strong>
          </article>
          <article>
            <span>Giá tour</span>
            <strong>
              {formatMoney(
                item?.price || item?.tour?.price || item?.tour?.base_price || 0,
              )}
            </strong>
          </article>
        </div>
        <div className="guide-tour-detail-section">
          <h3>Mô tả tour</h3>
          <p>
            {loading
              ? "Đang tải chi tiết..."
              : getTourDescription(item) || "Tour này chưa có mô tả chi tiết."}
          </p>
        </div>
        <div className="guide-tour-detail-section">
          <h3>Lịch trình</h3>
          {itineraries.length > 0 ? (
            <div className="guide-tour-detail-steps">
              {itineraries.map((step, index) => (
                <article key={step.id || index}>
                  <span>Ngày {step.day_number || index + 1}</span>
                  <strong>{step.title || "Hành trình"}</strong>
                  <p>{stripHtml(step.description) || "Chưa có mô tả."}</p>
                </article>
              ))}
            </div>
          ) : (
            <p>Chưa có lịch trình chi tiết cho tour này.</p>
          )}
        </div>
        <div className="guide-tour-detail-section">
          <h3>Danh sách khách hàng</h3>
          {customers.length > 0 ? (
            <div className="guide-tour-customer-list">
              {customers.map((customer, index) => (
                <article key={customer.id}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>
                      {customer.full_name || customer.name || "Khách hàng"}
                    </strong>
                    <small>
                      {customer.phone ||
                        customer.customer_phone ||
                        customer.contact_phone ||
                        "Chưa có số điện thoại"}
                    </small>
                  </div>
                  <em>
                    {customer.participant_type === "child"
                      ? "Trẻ em"
                      : "Người lớn"}
                  </em>
                </article>
              ))}
            </div>
          ) : (
            <p>
              {loading
                ? "Đang tải danh sách khách..."
                : "Tour này chưa có khách hàng."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function GuideToursPage() {
  const guide = readSession();
  const [activeTab, setActiveTab] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
  });
  const [totals, setTotals] = useState({
    all: 0,
    upcoming: 0,
    ongoing: 0,
    pending: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailItem, setDetailItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailCustomers, setDetailCustomers] = useState([]);
  const [detailCustomerTotal, setDetailCustomerTotal] = useState(0);
  const [customerCounts, setCustomerCounts] = useState({});
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = {
          page,
          per_page: 4,
          keyword: keyword.trim() || undefined,
        };
        const [all, upcoming, ongoing, completed, active] = await Promise.all([
          getGuideTours({ per_page: 1 }),
          getGuideTourUpcoming({ per_page: 1 }),
          getGuideTourOngoing({ per_page: 1 }),
          getGuideTourCompleted({ per_page: 1 }),
          fetchers[activeTab](
            activeTab === "pending" ? { ...params, status: "pending" } : params,
          ),
        ]);
        if (!mounted) return;
        const activePage = normalizePaginator(active);
        setItems(activePage.items);
        setMeta(activePage.meta);
        setTotals({
          all: normalizePaginator(all).meta.total,
          upcoming: normalizePaginator(upcoming).meta.total,
          ongoing: normalizePaginator(ongoing).meta.total,
          pending: 0,
          completed: normalizePaginator(completed).meta.total,
        });

        const countEntries = await Promise.all(
          activePage.items.map(async (item) => {
            try {
              const payload = await getGuideTourCustomers(item.id, {
                per_page: 1,
              });
              return [item.id, normalizePaginator(payload).meta.total];
            } catch {
              return [
                item.id,
                Number(
                  item?.booked_slots ||
                    item?.customers_count ||
                    item?.participants_count ||
                    0,
                ),
              ];
            }
          }),
        );
        if (mounted) setCustomerCounts(Object.fromEntries(countEntries));
      } catch (err) {
        if (mounted)
          setError(
            err?.response?.data?.message || "Không tải được danh sách tour.",
          );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [activeTab, keyword, page]);
  const heroItem = items[0];
  const heroImage = getTourImage(heroItem);
  const stats = useMemo(() => {
    const customers = items.reduce(
      (sum, item) =>
        sum +
        Number(
          customerCounts[item.id] ??
            item?.booked_slots ??
            item?.customers_count ??
            item?.participants_count ??
            0,
        ),
      0,
    );
    const revenue = items.reduce(
      (sum, item) =>
        sum +
        Number(item?.price || item?.tour?.price || item?.tour?.base_price || 0),
      0,
    );
    const ratings = items
      .map((item) =>
        Number(
          item?.tour?.average_rating ||
            item?.average_rating ||
            item?.rating ||
            0,
        ),
      )
      .filter(Boolean);
    const avgRating = ratings.length
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : 0;
    return { customers, revenue, avgRating };
  }, [customerCounts, items]);

  async function openDetail(item) {
    setDetailItem(item);
    setDetailCustomers([]);
    setDetailCustomerTotal(0);
    setDetailLoading(true);
    try {
      const [detail, customerPayload] = await Promise.all([
        getGuideTourDetail(item.id),
        getGuideTourCustomers(item.id, { per_page: 100 }),
      ]);
      const customerPage = normalizePaginator(customerPayload);
      setDetailItem(detail || item);
      setDetailCustomers(customerPage.items);
      setDetailCustomerTotal(customerPage.meta.total);
      setCustomerCounts((current) => ({
        ...current,
        [item.id]: customerPage.meta.total,
      }));
    } catch (err) {
      setError(err?.response?.data?.message || "Không tải được chi tiết tour.");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="guide-shot-page">
      <header className="guide-shot-page-head">
        <div>
          <h1>Tour của tôi</h1>
          <p>
            Chào mừng trở lại,{" "}
            {guide?.full_name || guide?.name || "Hướng dẫn viên"}
          </p>
        </div>
      </header>
      <section
        className="guide-shot-hero"
        style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}
      >
        <div>
          <span>Hôm nay</span>
          <h2>
            {heroItem ? getTourTitle(heroItem) : "Xin chào, Hướng dẫn viên"}
          </h2>
          <p>
            Hành trình hôm nay sẽ là nơi mọi khoảnh khắc du lịch đáng nhớ chờ
            đợi.
          </p>
        </div>
      </section>
      <section className="guide-shot-stats-grid">
        <article className="guide-shot-stat tone-blue">
          <span>Tổng tour đã dẫn</span>
          <strong>{formatNumber(totals.all)}</strong>
          <small>Từ dữ liệu database</small>
        </article>
        <article className="guide-shot-stat tone-amber">
          <span>Đánh giá trung bình</span>
          <strong>
            {stats.avgRating ? stats.avgRating.toFixed(1) : "0"}/5
          </strong>
          <small>Dựa trên tour đang tải</small>
        </article>
        <article className="guide-shot-stat tone-green">
          <span>Tổng lượt khách</span>
          <strong>{formatNumber(stats.customers)}</strong>
          <small>Số khách trong danh sách</small>
        </article>
        <article className="guide-shot-stat tone-red">
          <span>Thu nhập tháng này</span>
          <strong>{formatMoney(stats.revenue)}</strong>
          <small>Tính từ tour hiển thị</small>
        </article>
      </section>
      <section className="guide-shot-card">
        <nav className="guide-shot-tabs" aria-label="Trạng thái tour">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? "is-active" : ""}
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="guide-shot-filterbar">
          <label>
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm kiếm tour..."
            />
          </label>
          <button type="button">Thời gian</button>
          <button type="button">Địa điểm</button>
          <button type="button">Sắp xếp: Mới nhất</button>
        </div>
        {error ? (
          <div className="guide-profile-alert is-error">{error}</div>
        ) : null}
        {loading ? (
          <div className="guide-shot-empty">Đang tải danh sách tour...</div>
        ) : null}
        {!loading && items.length === 0 ? (
          <div className="guide-shot-empty">Chưa có tour phù hợp.</div>
        ) : null}
        {!loading && items.length > 0 ? (
          <div className="guide-shot-tour-list">
            {items.map((item) => (
              <TourRow
                key={item.id}
                customerCount={customerCounts[item.id]}
                item={item}
                onDetail={openDetail}
              />
            ))}
          </div>
        ) : null}
        <footer className="guide-shot-pagination">
          <span>
            Hiển thị {items.length ? `1-${items.length}` : "0"} /{" "}
            {formatNumber(meta.total)} tour
          </span>
          <div>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              ‹
            </button>
            <button type="button" className="is-active">
              {meta.current_page}
            </button>
            <button
              type="button"
              disabled={page >= meta.last_page}
              onClick={() => setPage((current) => current + 1)}
            >
              ›
            </button>
          </div>
          <span>
            Hiển thị <b>{meta.per_page}/trang</b>
          </span>
        </footer>
      </section>
      <TourDetailModal
        customerTotal={detailCustomerTotal}
        customers={detailCustomers}
        item={detailItem}
        loading={detailLoading}
        onClose={() => setDetailItem(null)}
      />
    </div>
  );
}
export default GuideToursPage;
