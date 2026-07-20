import { useEffect, useState } from "react";
import { readSession } from "../../services/authStorage";
import {
  getGuideTourCompleted,
  getGuideTourDetail,
  getGuideTourCustomers,
  getGuideTourOngoing,
  getGuideTourUpcoming,
  getGuideTours,
  requestGuideReplacement,
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

function getReplacementEligibility(item) {
  const status = String(item?.guide_status || item?.status || "").toLowerCase();
  const hasPendingRequest = Boolean(
    Number(item?.replacement_request_pending) ||
      item?.pending_replacement_request,
  );

  if (hasPendingRequest) {
    return {
      allowed: false,
      buttonLabel: "Đã gửi yêu cầu đổi HDV",
      message: "Yêu cầu đổi HDV đã được gửi và đang chờ quản trị viên xử lý.",
    };
  }

  if (status === "ongoing") {
    return {
      allowed: false,
      buttonLabel: "Không thể đổi HDV",
      message: "Tour đang diễn ra nên không thể yêu cầu đổi HDV nữa.",
    };
  }

  if (["completed", "cancelled", "canceled"].includes(status)) {
    return {
      allowed: false,
      buttonLabel: "Không thể đổi HDV",
      message: "Tour đã kết thúc hoặc đã bị hủy nên không thể đổi HDV.",
    };
  }

  const departureDate = new Date(`${item?.departure_date || ""}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minimumDepartureDate = new Date(today);
  minimumDepartureDate.setDate(minimumDepartureDate.getDate() + 5);

  if (
    Number.isNaN(departureDate.getTime()) ||
    departureDate < minimumDepartureDate
  ) {
    return {
      allowed: false,
      buttonLabel: "Đã quá hạn đổi HDV",
      message: "Chỉ có thể yêu cầu đổi HDV trước ngày khởi hành ít nhất 5 ngày.",
    };
  }

  return {
    allowed: true,
    buttonLabel: "Yêu cầu đổi HDV",
    message: "Bạn có thể gửi yêu cầu đổi HDV trước ngày khởi hành ít nhất 5 ngày.",
  };
}

const tabs = [
  { key: "all", label: "Tất cả" },
  { key: "upcoming", label: "Sắp diễn ra" },
  { key: "ongoing", label: "Đang dẫn Tour" },
  { key: "completed", label: "Hoàn thành" },
];
const fetchers = {
  all: getGuideTours,
  upcoming: getGuideTourUpcoming,
  ongoing: getGuideTourOngoing,
  completed: getGuideTourCompleted,
};
function getPageNumbers(currentPage, lastPage) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(lastPage, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
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

function TourDetailModal({
  customerTotal,
  customers,
  item,
  loading,
  onClose,
  onOpenReplacement,
}) {
  if (!item) return null;

  const image = getTourImage(item);
  const title = getTourTitle(item);
  const itineraries = Array.isArray(item?.tour?.itineraries)
    ? item.tour.itineraries
    : [];
  const replacementEligibility = getReplacementEligibility(item);

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
        <div className="guide-tour-detail-section guide-replacement-section">
          <div className="guide-replacement-head">
            <div>
              <h3>Yêu cầu đổi HDV</h3>
              <p>
                Gửi yêu cầu cho admin nếu bạn không thể tiếp tục phụ trách tour
                này.
              </p>
            </div>
            <button
              type="button"
              disabled={!replacementEligibility.allowed}
              onClick={() => onOpenReplacement(item)}
            >
              {replacementEligibility.buttonLabel}
            </button>
          </div>
          <p className="guide-replacement-muted">
            {replacementEligibility.message}
          </p>
        </div>
      </section>
    </div>
  );
}

function ReplacementRequestModal({
  item,
  replacement,
  onClose,
  onReasonChange,
  onFileChange,
  onSubmit,
}) {
  if (!item) return null;

  return (
    <div className="guide-tour-detail-backdrop" role="presentation" onClick={onClose}>
      <form
        className="guide-replacement-modal"
        onSubmit={onSubmit}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="guide-tour-detail-close" onClick={onClose} aria-label="Đóng">×</button>
        <h2>Yêu cầu đổi hướng dẫn viên</h2>
        <p className="guide-replacement-tour-name">{getTourTitle(item)}</p>
        <p>Yêu cầu này được gửi riêng đến quản trị viên để xem xét phân công lại tour.</p>
        <label>
          <span>Lý do đổi HDV <b className="guide-required-mark" aria-hidden="true">*</b></span>
          <textarea
            rows={5}
            value={replacement.reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Nêu rõ lý do cần đổi hướng dẫn viên phụ trách tour..."
            disabled={replacement.submitting}
            maxLength={2000}
            required
          />
          <small>{replacement.reason.trim().length}/2000 ký tự</small>
        </label>
        <label>
          <span>File/ảnh minh chứng (không bắt buộc)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => onFileChange(event.target.files?.[0] || null)} disabled={replacement.submitting} />
        </label>
        {replacement.error ? <p className="guide-replacement-error">{replacement.error}</p> : null}
        <div className="guide-replacement-actions">
          <button type="button" onClick={onClose} disabled={replacement.submitting}>Hủy</button>
          <button type="submit" disabled={replacement.submitting}>{replacement.submitting ? "Đang gửi..." : "Gửi yêu cầu"}</button>
        </div>
      </form>
    </div>
  );
}

function GuideToursPage() {
  const guide = readSession();
  const [activeTab, setActiveTab] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sort, setSort] = useState("priority");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
  });
  const summary = {
    all: 0,
    totalCustomers: 0,
    averageRating: 0,
    reviewCount: 0,
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [detailItem, setDetailItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailCustomers, setDetailCustomers] = useState([]);
  const [detailCustomerTotal, setDetailCustomerTotal] = useState(0);
  const [customerCounts, setCustomerCounts] = useState({});
  const [replacementTour, setReplacementTour] = useState(null);
  const [replacementReason, setReplacementReason] = useState("");
  const [replacementFile, setReplacementFile] = useState(null);
  const [replacementError, setReplacementError] = useState("");
  const [replacementSubmitting, setReplacementSubmitting] = useState(false);

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
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          sort,
        };
        const active = await fetchers[activeTab](params);
        if (!mounted) return;
        const activePage = normalizePaginator(active);
        setItems(activePage.items);
        setMeta(activePage.meta);
        if (mounted) {
          setCustomerCounts(
            Object.fromEntries(
              activePage.items.map((item) => [item.id, Number(item.customer_count || 0)]),
            ),
          );
        }
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
  }, [activeTab, fromDate, keyword, page, sort, toDate]);

  const heroItem = items[0];
  const heroImages = items.map(getTourImage).filter(Boolean);
  const heroImage = heroImages[heroIndex % Math.max(heroImages.length, 1)];

  useEffect(() => {
    if (heroImages.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroImages.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [heroImages.length]);
  async function openDetail(item) {
    setDetailItem(item);
    setDetailCustomers([]);
    setDetailCustomerTotal(0);
    setReplacementReason("");
    setReplacementFile(null);
    setReplacementError("");
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

  async function submitReplacementRequest(event) {
    event.preventDefault();
    if (!replacementTour) return;
    const reason = replacementReason.trim();

    if (reason.length < 10) {
      setReplacementError("Vui lòng nhập lý do ít nhất 10 ký tự.");
      return;
    }

    setReplacementSubmitting(true);
    setReplacementError("");
    try {
      await requestGuideReplacement(replacementTour.id, {
        reason,
        evidence: replacementFile,
      });
      setError("");
      setMessage("Đã gửi yêu cầu đổi HDV. Admin sẽ xem xét và phản hồi.");
      setReplacementTour(null);
      setReplacementReason("");
      setReplacementFile(null);
      setItems((current) => current.map((item) => item.id === replacementTour.id ? { ...item, replacement_request_pending: true } : item));
    } catch (err) {
      setReplacementError(
        err?.response?.data?.message || "Không gửi được yêu cầu đổi HDV.",
      );
    } finally {
      setReplacementSubmitting(false);
    }
  }

  function handleReplacementFileChange(file) {
    if (!file) {
      setReplacementFile(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setReplacementError("Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc PDF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setReplacementError("File minh chứng không được vượt quá 5MB.");
      return;
    }

    setReplacementFile(file);
    setReplacementError("");
  }
  const firstItem = items.length ? (meta.current_page - 1) * meta.per_page + 1 : 0;
  const lastItem = Math.min(meta.current_page * meta.per_page, meta.total);

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
      <section className="guide-shot-stats-grid" hidden>
        <article className="guide-shot-stat tone-blue">
          <span>Tổng tour đã dẫn</span>
          <strong>{formatNumber(summary.all)}</strong>
          <small>Từ dữ liệu database</small>
        </article>
        <article className="guide-shot-stat tone-amber">
          <span>Đánh giá trung bình</span>
          <strong>
            {summary.averageRating ? summary.averageRating.toFixed(1) : "0"}/5
          </strong>
          <small>{formatNumber(summary.reviewCount)} đánh giá từ khách hàng</small>
        </article>
        <article className="guide-shot-stat tone-green">
          <span>Tổng lượt khách</span>
          <strong>{formatNumber(summary.totalCustomers)}</strong>
          <small>Khách của các booking đã thanh toán</small>
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
          <label className="guide-shot-date-filter">
            <span>Thời gian</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
              aria-label="Từ ngày"
            />
            <b>–</b>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
              aria-label="Đến ngày"
            />
          </label>
          <label className="guide-shot-select-filter">
            <span>Sắp xếp</span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
              aria-label="Sắp xếp tour"
            >
              <option value="priority">Ưu tiên trạng thái</option>
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
            </select>
          </label>
          <label className="guide-shot-search-filter">
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
        </div>
        {error || message ? (
          <div
            className={
              error ? "guide-profile-alert is-error" : "guide-profile-alert"
            }
          >
            {error || message}
          </div>
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
            Hiển thị {items.length ? `${firstItem}-${lastItem}` : "0"} /{" "}
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
            {getPageNumbers(meta.current_page, meta.last_page).map((pageNumber) => (
              <button key={pageNumber} type="button" className={pageNumber === meta.current_page ? "is-active" : ""} onClick={() => setPage(pageNumber)}>
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= meta.last_page}
              onClick={() => setPage((current) => current + 1)}
            >
              ›
            </button>
          </div>
        </footer>
      </section>
      <TourDetailModal
        customerTotal={detailCustomerTotal}
        customers={detailCustomers}
        item={detailItem}
        loading={detailLoading}
        onClose={() => setDetailItem(null)}
        onOpenReplacement={(item) => {
          setDetailItem(null);
          setReplacementTour(item);
        }}
      />
      <ReplacementRequestModal
        item={replacementTour}
        replacement={{ error: replacementError, reason: replacementReason, submitting: replacementSubmitting }}
        onClose={() => {
          if (!replacementSubmitting) setReplacementTour(null);
        }}
        onReasonChange={(value) => {
          setReplacementReason(value);
          setReplacementError("");
        }}
        onFileChange={handleReplacementFileChange}
        onSubmit={submitReplacementRequest}
      />
    </div>
  );
}
export default GuideToursPage;
