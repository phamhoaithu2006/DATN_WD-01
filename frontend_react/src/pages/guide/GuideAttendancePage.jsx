import { useEffect, useMemo, useState } from "react";
import {
  checkInGuideCustomer,
  checkInAllGuideCustomers,
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
function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .trim();
}
function getPageNumbers(currentPage, lastPage) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(lastPage, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
function isSameLocalDate(value) {
  if (!value) return false;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}
function getSessionScheduledDate(session, tour) {
  const providedDate = session?.scheduled_date || session?.scheduledDate;
  if (providedDate) return providedDate;

  const departureDate = tour?.departure_date;
  const dayNumber = Number(
    session?.itinerary?.day_number || session?.tour_itinerary?.day_number,
  );
  if (!departureDate || !Number.isFinite(dayNumber) || dayNumber < 1) return null;

  const date = new Date(`${String(departureDate).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + dayNumber - 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function getApiErrorMessage(error, fallback) {
  const validationErrors = error?.response?.data?.errors;
  const firstValidationError = validationErrors
    ? Object.values(validationErrors).flat().find(Boolean)
    : null;

  return firstValidationError || error?.response?.data?.message || error?.message || fallback;
}
function AttendanceTourDetailModal({ item, onClose }) {
  if (!item) return null;
  const image = getTourImage(item);
  const itineraries = Array.isArray(item?.tour?.itineraries)
    ? item.tour.itineraries
    : [];
  const description = stripHtml(
    item?.tour?.description || item?.tour?.summary || item?.description,
  );
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
        <div className="guide-tour-detail-section">
          <h3>Mô tả tour</h3>
          <p>{description || "Tour này chưa có mô tả chi tiết."}</p>
        </div>
        <div className="guide-tour-detail-section">
          <h3>Lịch trình đầy đủ</h3>
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
      </section>
    </div>
  );
}
function GuideAttendancePage() {
  const [selectedTour, setSelectedTour] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [customerType, setCustomerType] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [attendanceSessions, setAttendanceSessions] = useState([]);
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
        const ongoing = await getGuideTourOngoing({ per_page: 1 });
        if (!mounted) return;
        const list = normalizePaginator(ongoing).items;
        const tour = list[0] || null;
        setSelectedTour(tour);
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
  }, []);
  const selectedTourId = selectedTour?.id;
  const selectedTourDepartureDate = selectedTour?.departure_date;

  useEffect(() => {
    if (!selectedTourId) return undefined;
    let mounted = true;
    async function loadCustomers() {
      setLoading(true);
      setError("");
      try {
        const sessionsPayload = await getGuideAttendanceSessions(selectedTourId);
        const rawSessions = Array.isArray(sessionsPayload) ? sessionsPayload : sessionsPayload?.data || [];
        const sessions = rawSessions.map((session) => ({
          ...session,
          scheduled_date: getSessionScheduledDate(session, {
            departure_date: selectedTourDepartureDate,
          }),
        }));
        const currentSession = sessions.find((session) => String(session.id) === String(sessionId))
          || sessions.find((session) => session.can_take_attendance === true)
          || sessions.find((session) => isSameLocalDate(session.scheduled_date))
          || sessions[0]
          || null;
        const status = activeFilter === "checked" ? "checked_in" : activeFilter === "unchecked" ? "not_checked_in" : activeFilter === "absent" ? "absent" : undefined;
        const [detail, customerPayload, statistics] = await Promise.all([
          getGuideTourDetail(selectedTourId).catch(() => null),
          getGuideTourCustomers(selectedTourId, {
            page,
            per_page: 10,
            keyword: keyword.trim() || undefined,
            status,
            attendance_session_id: currentSession?.id,
          }),
          getGuideAttendanceStatistics(selectedTourId, {
            attendance_session_id: currentSession?.id,
          }),
        ]);
        if (!mounted) return;
        const customerPage = normalizePaginator(customerPayload);
        setSelectedTour((current) => detail || current);
        setAttendanceSessions(sessions);
        setCustomers(customerPage.items);
        setCustomerMeta(customerPage.meta);
        setSessionId(currentSession?.id || null);
        setAttendanceStats(statistics);
      } catch (err) {
        if (mounted)
          setError(
            getApiErrorMessage(err, "Không tải được danh sách khách."),
          );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadCustomers();
    return () => {
      mounted = false;
    };
  }, [activeFilter, keyword, page, selectedTourDepartureDate, selectedTourId, sessionId]);
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
    throw new Error("Tour chưa có phiên điểm danh theo lịch trình.");
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
        getApiErrorMessage(err, "Không điểm danh được khách này."),
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
      await checkInAllGuideCustomers(selectedTour.id, activeSession);
      const [customerPayload, statistics] = await Promise.all([
        getGuideTourCustomers(selectedTour.id, {
          page,
          per_page: 10,
          keyword: keyword.trim() || undefined,
          attendance_session_id: activeSession,
        }),
        getGuideAttendanceStatistics(selectedTour.id, {
          attendance_session_id: activeSession,
        }),
      ]);
      const customerPage = normalizePaginator(customerPayload);
      setCustomers(customerPage.items);
      setCustomerMeta(customerPage.meta);
      setAttendanceStats(statistics);
      setMessage("Đã điểm danh tất cả khách chưa có mặt.");
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Không thể điểm danh tất cả khách."),
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
        getApiErrorMessage(err, "Không lưu được ghi chú."),
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
  const selectedSession = attendanceSessions.find(
    (session) => String(session.id) === String(sessionId),
  );
  const canOperateSession =
    canOperate &&
    Boolean(selectedSession) &&
    selectedSession?.can_take_attendance === true;
  const isReadOnlySession = Boolean(selectedSession) && !canOperateSession;
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
            {attendanceSessions.length === 0 ? (
              <div className="guide-attendance-readonly-notice" role="status">
                Tour chưa có lịch trình để tạo phiên điểm danh.
              </div>
            ) : null}
            {isReadOnlySession ? (
              <div className="guide-attendance-readonly-notice" role="status">
                Mốc này không diễn ra hôm nay nên chỉ có thể xem lịch sử điểm danh.
              </div>
            ) : null}
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
                disabled={busy || !canOperateSession}
              >
                Điểm danh tất cả
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
                        disabled={busy || !canOperateSession || isChecked(customer)}
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
                        title={
                          isReadOnlySession
                            ? "Xem ghi chú khách hàng"
                            : "Ghi chú khách hàng"
                        }
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
              readOnly={isReadOnlySession}
              rows={5}
              placeholder="Nhập yêu cầu, lưu ý sức khỏe, ăn uống hoặc vấn đề cần chú ý..."
            />
            <div>
              <button type="button" onClick={() => setNoteTarget(null)}>
                Hủy
              </button>
              {!isReadOnlySession ? (
                <button type="submit" disabled={busy}>
                  Lưu ghi chú
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}
      <AttendanceTourDetailModal item={detailOpen ? selectedTour : null} onClose={() => setDetailOpen(false)} />
    </div>
  );
}
export default GuideAttendancePage;
