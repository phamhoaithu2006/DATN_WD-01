import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  checkInGuideCustomer,
  createGuideAttendanceSession,
  getGuideAttendanceSessions,
  getGuideAttendanceStatistics,
  getGuideTourCustomers,
  getGuideTourDetail,
  getGuideTourOngoing,
  updateGuideAttendanceNote,
} from "../../services/guideTourApi";
import {
  formatDate,
  formatNumber,
  getCustomerName,
  getCustomerPhone,
  getCustomerType,
  getDestination,
  getInitials,
  getTourImage,
  getTourState,
  getTourTitle,
  normalizePaginator,
} from "./guidePageUtils";
const attendanceBoundaries = [
  { key: "departure", label: "Ngày khởi hành" },
  { key: "return", label: "Ngày kết thúc" },
];
const filters = [
  { key: "all", label: "Tất cả" },
  { key: "checked", label: "Đã điểm danh" },
  { key: "unchecked", label: "Chưa điểm danh" },
  { key: "absent", label: "Vắng mặt" },
];
function getAttendance(customer) {
  return customer?.attendance || customer?.current_attendance || {};
}
function isChecked(customer) {
  return Boolean(getAttendance(customer)?.checked_in_at);
}
function isAbsent(customer) {
  return String(getAttendance(customer)?.status || "").toLowerCase() === "absent";
}
function isUnchecked(customer) {
  return !isChecked(customer) && !isAbsent(customer);
}
function getCheckTime(customer) {
  const checkedAt = getAttendance(customer)?.checked_in_at;
  if (!checkedAt) return "--:--";
  const date = new Date(checkedAt);
  if (Number.isNaN(date.getTime()))
    return String(checkedAt).slice(11, 16) || "--:--";
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function getPageNumbers(currentPage, lastPage) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(lastPage, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
function AttendanceTourDetailModal({ item, onClose }) {
  if (!item) return null;
  const image = getTourImage(item);
  return (
    <div className="guide-tour-detail-backdrop" role="presentation" onClick={onClose}>
      <section className="guide-tour-detail-modal" role="dialog" aria-modal="true" aria-label="Chi tiết tour" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="guide-tour-detail-close" onClick={onClose} aria-label="Đóng">×</button>
        <div className="guide-tour-detail-hero">
          {image ? <img src={image} alt={getTourTitle(item)} /> : <span>{getInitials(getTourTitle(item))}</span>}
          <div><small>{getTourState(item)}</small><h2>{getTourTitle(item)}</h2><p>{getDestination(item)}</p></div>
        </div>
        <div className="guide-tour-detail-grid">
          <article><span>Khởi hành</span><strong>{formatDate(item.departure_date)}</strong></article>
          <article><span>Kết thúc</span><strong>{formatDate(item.return_date || item.departure_date)}</strong></article>
          <article><span>Trạng thái</span><strong>{getTourState(item)}</strong></article>
        </div>
      </section>
    </div>
  );
}
function GuideAttendancePage() {
  const navigate = useNavigate();
  const { tourId } = useParams();
  const [selectedTour, setSelectedTour] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [customerType, setCustomerType] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [attendanceBoundary, setAttendanceBoundary] = useState("departure");
  const [sessionId, setSessionId] = useState(null);
  const [customerMeta, setCustomerMeta] = useState({ total: 0, per_page: 10 });
  const [attendanceStats, setAttendanceStats] = useState({ total_customers: 0, checked_in: 0, not_checked_in: 0, absent: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [noteTarget, setNoteTarget] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  useEffect(() => {
    let mounted = true;
    async function loadTours() {
      setLoading(true);
      setError("");
      try {
        const ongoing = await getGuideTourOngoing({ per_page: 30 });
        if (!mounted) return;
        const list = normalizePaginator(ongoing).items;
        const picked =
          list.find((item) => String(item.id) === String(tourId)) ||
          list[0] ||
          null;
        if (picked && !tourId)
          navigate(`/guide/attendance/${picked.id}`, { replace: true });
        if (picked && tourId && String(picked.id) !== String(tourId)) {
          navigate(`/guide/attendance/${picked.id}`, { replace: true });
        }
        setSelectedTour(picked);
      } catch (err) {
        if (mounted)
          setError(
            err?.response?.data?.message || "Không tải được tour điểm danh.",
          );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadTours();
    return () => {
      mounted = false;
    };
  }, [navigate, tourId]);
  const selectedTourId = selectedTour?.id;

  useEffect(() => {
    if (!selectedTourId) return undefined;
    let mounted = true;
    async function loadCustomers() {
      setLoading(true);
      setError("");
      try {
        const sessionsPayload = await getGuideAttendanceSessions(selectedTourId);
        const sessions = Array.isArray(sessionsPayload) ? sessionsPayload : sessionsPayload?.data || [];
        const currentSession = sessions.find((session) => session.boundary === attendanceBoundary);
        const status = activeFilter === "checked" ? "checked_in" : activeFilter === "unchecked" ? "not_checked_in" : activeFilter === "absent" ? "absent" : undefined;
        const [detail, customerPayload, statistics] = await Promise.all([
          getGuideTourDetail(selectedTourId).catch(() => null),
          getGuideTourCustomers(selectedTourId, {
            page,
            per_page: 10,
            keyword: keyword.trim() || undefined,
            status,
            attendance_boundary: attendanceBoundary,
            attendance_session_id: currentSession?.id,
          }),
          getGuideAttendanceStatistics(selectedTourId, {
            attendance_boundary: attendanceBoundary,
            attendance_session_id: currentSession?.id,
          }),
        ]);
        if (!mounted) return;
        const customerPage = normalizePaginator(customerPayload);
        setSelectedTour((current) => detail || current);
        setCustomers(customerPage.items);
        setCustomerMeta(customerPage.meta);
        setSessionId(currentSession?.id || null);
        setAttendanceStats(statistics);
      } catch (err) {
        if (mounted)
          setError(
            err?.response?.data?.message || "Không tải được danh sách khách.",
          );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadCustomers();
    return () => {
      mounted = false;
    };
  }, [activeFilter, attendanceBoundary, keyword, page, selectedTourId]);
  const stats = useMemo(() => ({
    total: Number(attendanceStats.total_customers || 0),
    checked: Number(attendanceStats.checked_in || 0),
    unchecked: Number(attendanceStats.not_checked_in || 0),
    absent: Number(attendanceStats.absent || 0),
  }), [attendanceStats]);
  const visibleCustomers = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return customers.filter((customer) => {
      if (activeFilter === "checked" && !isChecked(customer)) return false;
      if (activeFilter === "unchecked" && !isUnchecked(customer)) return false;
      if (activeFilter === "absent" && !isAbsent(customer)) return false;
      if (customerType !== "all" && getCustomerType(customer) !== customerType)
        return false;
      if (!normalizedKeyword) return true;
      return `${getCustomerName(customer)} ${getCustomerPhone(customer)}`
        .toLowerCase()
        .includes(normalizedKeyword);
    });
  }, [activeFilter, customerType, customers, keyword]);
  async function ensureSession() {
    if (sessionId) return sessionId;
    if (!canOperateBoundary) throw new Error("Tour này hiện chưa thể điểm danh.");
    const session = await createGuideAttendanceSession(selectedTour.id, {
      boundary: attendanceBoundary,
    });
    setSessionId(session.id);
    return session.id;
  }
  async function markCustomer(customer) {
    if (isChecked(customer) || busy) return;
    setBusy(true);
    setError("");
    try {
      const activeSession = await ensureSession();
      const updated = await checkInGuideCustomer(
        selectedTour.id,
        activeSession,
        customer.id,
      );
      setCustomers((current) =>
        current.map((item) =>
          item.id === customer.id
            ? { ...item, attendance: updated.attendance || updated }
            : item,
        ),
      );
      setAttendanceStats((current) => ({ ...current, checked_in: Number(current.checked_in || 0) + 1, not_checked_in: Math.max(Number(current.not_checked_in || 0) - 1, 0) }));
      setMessage(`Đã điểm danh ${getCustomerName(customer)}.`);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Không điểm danh được khách này.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function markAll() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const activeSession = await ensureSession();
      const missing = visibleCustomers.filter(isUnchecked);
      for (const customer of missing) {
        const updated = await checkInGuideCustomer(
          selectedTour.id,
          activeSession,
          customer.id,
        );
        setCustomers((current) =>
          current.map((item) =>
            item.id === customer.id
              ? { ...item, attendance: updated.attendance || updated }
              : item,
          ),
        );
        setAttendanceStats((current) => ({ ...current, checked_in: Number(current.checked_in || 0) + 1, not_checked_in: Math.max(Number(current.not_checked_in || 0) - 1, 0) }));
      }
      setMessage("Đã điểm danh tất cả khách chưa có mặt.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể điểm danh tất cả khách.",
      );
    } finally {
      setBusy(false);
    }
  }
  function openNote(customer) {
    setNoteTarget(customer);
    setNoteText(getAttendance(customer)?.note || customer?.note || "");
  }
  async function saveNote(event) {
    event.preventDefault();
    if (!noteTarget) return;
    setBusy(true);
    setError("");
    try {
      const activeSession = await ensureSession();
      const updated = await updateGuideAttendanceNote(
        selectedTour.id,
        activeSession,
        noteTarget.id,
        noteText.trim(),
      );
      setCustomers((current) =>
        current.map((item) =>
          item.id === noteTarget.id
            ? { ...item, attendance: updated.attendance || updated }
            : item,
        ),
      );
      setNoteTarget(null);
      setNoteText("");
      setMessage("Đã lưu ghi chú khách hàng.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Không lưu được ghi chú.",
      );
    } finally {
      setBusy(false);
    }
  }
  const tourImage = getTourImage(selectedTour);
  const totalRows = customerMeta.total || customers.length;
  const canOperate =
    selectedTour?.can_take_attendance ??
    getTourState(selectedTour) === "ongoing";
  const canOperateBoundary = canOperate;
  const firstCustomer = customers.length ? (page - 1) * customerMeta.per_page + 1 : 0;
  const lastCustomer = Math.min(page * customerMeta.per_page, totalRows);

  return (
    <div className="guide-attendance-shot-page">
      {error || message ? (
        <div
          className={
            error ? "guide-profile-alert is-error" : "guide-profile-alert"
          }
        >
          {error || message}
        </div>
      ) : null}
      {selectedTour ? (
        <>
          <section className="guide-attendance-summary">
            <article className="guide-attendance-tour-card">
              <div className="guide-attendance-cover">
                {tourImage ? (
                  <img src={tourImage} alt={getTourTitle(selectedTour)} />
                ) : (
                  <span>{getInitials(getTourTitle(selectedTour))}</span>
                )}
              </div>
              <div className="guide-attendance-tour-copy">
                <div>
                  <h1>{getTourTitle(selectedTour)}</h1>
                  <span>
                    {canOperate ? "Đang diễn ra" : "Chưa thể điểm danh"}
                  </span>
                </div>
                <p>
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  {formatDate(selectedTour.departure_date)} -{" "}
                  {formatDate(
                    selectedTour.return_date || selectedTour.departure_date,
                  )}
                </p>
                <p>
                  <svg viewBox="0 0 24 24">
                    <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {formatNumber(stats.total)} khách
                </p>
                <button type="button" onClick={() => setDetailOpen(true)}>Xem chi tiết &gt;</button>
              </div>
            </article>
          </section>
          <section className="guide-attendance-stats">
            <article className="tone-blue">
              <span>tổng khách</span>
              <strong>{formatNumber(stats.total)}</strong>
              <small>100%</small>
            </article>
            <article className="tone-green">
              <span>đã điểm danh</span>
              <strong>{formatNumber(stats.checked)}</strong>
              <small>
                {stats.total
                  ? Math.round((stats.checked / stats.total) * 100)
                  : 0}
                %
              </small>
            </article>
            <article className="tone-red">
              <span>chưa điểm danh</span>
              <strong>{formatNumber(stats.unchecked)}</strong>
              <small>
                {stats.total
                  ? Math.round((stats.unchecked / stats.total) * 100)
                  : 0}
                %
              </small>
            </article>
          </section>
          <section className="guide-attendance-card">
            <nav className="guide-attendance-boundaries" aria-label="Mốc điểm danh">
              {attendanceBoundaries.map((boundary) => {
                const date = boundary.key === "departure" ? selectedTour.departure_date : selectedTour.return_date || selectedTour.departure_date;
                return (
                  <button
                    key={boundary.key}
                    type="button"
                    className={attendanceBoundary === boundary.key ? "is-active" : ""}
                    onClick={() => {
                      setAttendanceBoundary(boundary.key);
                      setPage(1);
                    }}
                  >
                    {boundary.label}: {formatDate(date)}
                  </button>
                );
              })}
            </nav>
            <nav className="guide-attendance-tabs">
              {filters.map((filter) => {
                const count =
                  filter.key === "checked"
                    ? stats.checked
                    : filter.key === "unchecked"
                      ? stats.unchecked
                      : filter.key === "absent"
                        ? stats.absent
                        : stats.total;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    className={activeFilter === filter.key ? "is-active" : ""}
                    onClick={() => {
                      setActiveFilter(filter.key);
                      setPage(1);
                    }}
                  >
                    {filter.label} ({count})
                  </button>
                );
              })}
            </nav>
            <div className="guide-attendance-toolbar">
              <label>
                <input
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm kiếm tên khách, SĐT..."
                />
              </label>
              <select
                value={customerType}
                onChange={(event) => {
                  setCustomerType(event.target.value);
                  setPage(1);
                }}
                aria-label="Lọc loại khách"
              >
                <option value="all">Tất cả loại khách</option>
                <option value="Người lớn">Người lớn</option>
                <option value="Trẻ em">Trẻ em</option>
              </select>
              <button
                type="button"
                onClick={markAll}
                disabled={busy || !canOperateBoundary}
              >
                Điểm danh trang này
              </button>
            </div>
            <div className="guide-attendance-table">
              <div className="guide-attendance-table-head">
                <span></span>
                <span>STT</span>
                <span>Họ và tên</span>
                <span>Loại khách</span>
                <span>Trạng thái</span>
                <span>Thời gian</span>
                <span>Ghi chú</span>
              </div>
              {loading ? (
                <div className="guide-shot-empty">Đang tải khách hàng...</div>
              ) : null}
              {!loading &&
                visibleCustomers.map((customer, index) => (
                  <div className="guide-attendance-row" key={customer.id}>
                    <span>
                      <input
                        type="checkbox"
                        checked={isChecked(customer)}
                        disabled={busy || !canOperateBoundary || isChecked(customer)}
                        onChange={() => markCustomer(customer)}
                      />
                    </span>
                    <span>{firstCustomer + index}</span>
                    <span className="guide-attendance-person">
                      <b>{getInitials(getCustomerName(customer))}</b>
                      <em>
                        <strong>{getCustomerName(customer)}</strong>
                        <small>{getCustomerPhone(customer)}</small>
                      </em>
                    </span>
                    <span>
                      <i
                        className={
                          getCustomerType(customer) === "Trẻ em"
                            ? "is-child"
                            : ""
                        }
                      >
                        {getCustomerType(customer)}
                      </i>
                    </span>
                    <span>
                      <mark
                        className={
                          isChecked(customer) ? "is-done" : "is-missing"
                        }
                      >
                        {isChecked(customer)
                          ? "Đã điểm danh"
                          : "Chưa điểm danh"}
                      </mark>
                    </span>
                    <span>{getCheckTime(customer)}</span>
                    <span>
                      <button
                        type="button"
                        className="guide-note-btn"
                        onClick={() => openNote(customer)}
                        title="Ghi chú khách hàng"
                      >
                        ✎
                      </button>
                    </span>
                  </div>
                ))}
            </div>
            <footer className="guide-attendance-footer">
              <span>
                Hiển thị {firstCustomer}-{lastCustomer} của {totalRows} khách
              </span>
              <div>
                <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>‹</button>
                {getPageNumbers(page, customerMeta.last_page || 1).map((pageNumber) => (
                  <button key={pageNumber} type="button" className={pageNumber === page ? "is-active" : ""} onClick={() => setPage(pageNumber)}>{pageNumber}</button>
                ))}
                <button type="button" disabled={page >= (customerMeta.last_page || 1)} onClick={() => setPage((current) => current + 1)}>›</button>
              </div>
              <span>
                Hiển thị <b>{customerMeta.per_page || 10} / trang</b>
              </span>
            </footer>
            <p className="guide-attendance-note-line">
              Mẹo: Bạn có thể thêm ghi chú khách hàng bằng tên, số điện thoại
              hoặc loại khách để điểm danh dễ dàng hơn.
            </p>
          </section>
        </>
      ) : (
        <div className="guide-shot-empty">
          {loading ? "Đang tải tour..." : "Chưa có tour để điểm danh."}
        </div>
      )}
      {noteTarget ? (
        <div
          className="guide-note-modal-backdrop"
          role="presentation"
          onClick={() => setNoteTarget(null)}
        >
          <form
            className="guide-note-modal"
            onSubmit={saveNote}
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Ghi chú khách hàng</h2>
            <p>
              {getCustomerName(noteTarget)} - {getDestination(selectedTour)}
            </p>
            <textarea
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              rows={5}
              placeholder="Nhập yêu cầu, lưu ý sức khỏe, ăn uống hoặc vấn đề cần chú ý..."
            />
            <div>
              <button type="button" onClick={() => setNoteTarget(null)}>
                Hủy
              </button>
              <button type="submit" disabled={busy}>
                Lưu ghi chú
              </button>
            </div>
          </form>
        </div>
      ) : null}
      <AttendanceTourDetailModal item={detailOpen ? selectedTour : null} onClose={() => setDetailOpen(false)} />
    </div>
  );
}
export default GuideAttendancePage;
