import {
  useCallback,
  useEffect,
  useState,
} from "react";
import CustomerSupportPage from "./CustomerSupportPage";
import {
  getMySupportRequestDetail,
  getMySupportRequests,
  getMySupportRequestUnreadCount,
  supplementMySupportRequest,
} from "../../services/supportWorkflowApi";

const STATUS_LABELS = {
  pending: "Đang chờ",
  in_progress: "Đã được tiếp nhận",
  cancelled: "Yêu cầu đã bị hủy",
  resolved: "Đã được xử lý",
};

function formatTime(value) {
  if (!value) return "";

  const date = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("vi-VN");
}

function CustomerSupportCenterPage({ profile }) {
  const [activeTab, setActiveTab] = useState("form");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [supplementLoading, setSupplementLoading] =
    useState(false);

  const [supplementText, setSupplementText] = useState("");
  const [supplementFiles, setSupplementFiles] = useState([]);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      setError("");

      const [payload, totalUnread] = await Promise.all([
        getMySupportRequests(),
        getMySupportRequestUnreadCount(),
      ]);

      /*
       * getMySupportRequests trả về Laravel paginator:
       * { data: [...] }
       */
      const requestItems = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

      setItems(requestItems);
      setUnreadCount(Number(totalUnread || 0));
    } catch (requestError) {
      console.error(
        "Không thể tải danh sách yêu cầu hỗ trợ:",
        requestError,
      );

      setItems([]);

      setError(
        requestError?.response?.data?.message ||
          "Không thể tải danh sách yêu cầu hỗ trợ.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function openRequest(item) {
    if (!item?.id) return;

    setDetailLoading(true);
    setNotice("");
    setError("");

    try {
      const detail =
        await getMySupportRequestDetail(item.id);

      setSelected(detail);

      await loadRequests();

      window.dispatchEvent(
        new Event("customer-support-unread-changed"),
      );
    } catch (requestError) {
      console.error(requestError);

      setError(
        requestError?.response?.data?.message ||
          "Không thể mở chi tiết yêu cầu.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleCreated() {
    await loadRequests();
  }

  async function submitSupplement(event) {
    event.preventDefault();

    if (
      !selected?.id ||
      supplementLoading ||
      !supplementText.trim()
    ) {
      return;
    }

    setSupplementLoading(true);
    setNotice("");
    setError("");

    try {
      await supplementMySupportRequest(
        selected.id,
        {
          message: supplementText.trim(),
          attachments: supplementFiles,
        },
      );

      setSupplementText("");
      setSupplementFiles([]);
      setNotice("Đã gửi thông tin bổ sung.");

      const detail =
        await getMySupportRequestDetail(selected.id);

      setSelected(detail);

      await loadRequests();

      window.dispatchEvent(
        new Event("customer-support-unread-changed"),
      );
    } catch (requestError) {
      console.error(requestError);

      setError(
        requestError?.response?.data?.message ||
          "Không thể gửi thông tin bổ sung.",
      );
    } finally {
      setSupplementLoading(false);
    }
  }

  return (
    <main className="vg-support-page">
      <div className="vg-container">
        <div className="vg-support-tabs">
          <button
            type="button"
            className={activeTab === "form" ? "active" : ""}
            onClick={() => {
              setActiveTab("form");
              setNotice("");
            }}
          >
            Form hỗ trợ
          </button>

          <button
            type="button"
            className={activeTab === "requests" ? "active" : ""}
            onClick={() => {
              setActiveTab("requests");
              setNotice("");
              void loadRequests();
            }}
          >
            Yêu cầu hỗ trợ của bạn

            {unreadCount > 0 ? (
              <span className="vg-support-tab-badge">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </button>
        </div>

        {error ? (
          <div className="vg-support-error">
            {error}
          </div>
        ) : null}

        {activeTab === "form" ? (
          <CustomerSupportPage
            profile={profile}
            embedded
            onCreated={handleCreated}
          />
        ) : null}

        {activeTab === "requests" ? (
          <section className="vg-my-support-requests">
            {loading ? (
              <div className="vg-support-empty">
                Đang tải yêu cầu hỗ trợ...
              </div>
            ) : items.length === 0 ? (
              <div className="vg-support-empty">
                <h2>
                  Bạn chưa có yêu cầu hỗ trợ nào
                </h2>

                <p>
                  Khi cần hỗ trợ, hãy gửi yêu cầu để đội ngũ ViVuGo giúp bạn.
                </p>

                <button
                  type="button"
                  onClick={() => setActiveTab("form")}
                >
                  Gửi yêu cầu hỗ trợ
                </button>
              </div>
            ) : (
              <div className="vg-my-support-layout">
                <div className="vg-my-support-list">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={[
                        "vg-my-support-card",
                        item.customer_has_unread_update
                          ? "unread"
                          : "",
                        selected?.id === item.id
                          ? "active"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => openRequest(item)}
                    >
                      <div>
                        <strong>
                          {item.ticket_code}
                        </strong>

                        <h3>
                          {item.subject}
                        </h3>

                        <small>
                          {formatTime(item.created_at)}
                        </small>
                      </div>

                      <span>
                        {STATUS_LABELS[item.status] ||
                          item.status}
                      </span>

                      {item.needs_more_info ? (
                        <p className="vg-support-more-info-warning">
                          ⚠ Cần bổ sung thông tin
                        </p>
                      ) : null}
                    </button>
                  ))}
                </div>

                <aside className="vg-my-support-detail">
                  {!selected ? (
                    <p>
                      Chọn một yêu cầu để xem chi tiết.
                    </p>
                  ) : detailLoading ? (
                    <p>
                      Đang tải chi tiết...
                    </p>
                  ) : (
                    <>
                      <strong>
                        {selected.ticket_code}
                      </strong>

                      <h2>
                        {selected.subject}
                      </h2>

                      <p>
                        Trạng thái:{" "}
                        <b>
                          {STATUS_LABELS[selected.status] ||
                            selected.status}
                        </b>
                      </p>

                      <div className="vg-support-customer-description">
                        {selected.description}
                      </div>

                      {selected.needs_more_info ? (
                        <form
                          onSubmit={submitSupplement}
                          className="vg-support-supplement-form"
                        >
                          <h3>
                            Bổ sung thông tin
                          </h3>

                          <div className="vg-support-more-info-request">
                            <strong>
                              ViVuGo yêu cầu:
                            </strong>

                            <p>
                              {selected.info_request_message}
                            </p>
                          </div>

                          <textarea
                            value={supplementText}
                            onChange={(event) =>
                              setSupplementText(
                                event.target.value,
                              )
                            }
                            rows="5"
                            placeholder="Mô tả chi tiết lỗi bạn đang gặp..."
                            required
                          />

                          <input
                            type="file"
                            multiple
                            accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                            onChange={(event) =>
                              setSupplementFiles(
                                Array.from(
                                  event.target.files || [],
                                ),
                              )
                            }
                          />

                          {supplementFiles.length > 0 ? (
                            <div className="vg-support-file-list">
                              {supplementFiles.map((file) => (
                                <p
                                  key={`${file.name}-${file.size}`}
                                >
                                  📎 {file.name}
                                </p>
                              ))}
                            </div>
                          ) : null}

                          <button
                            type="submit"
                            disabled={supplementLoading}
                          >
                            {supplementLoading
                              ? "Đang gửi..."
                              : "Gửi thông tin bổ sung"}
                          </button>
                        </form>
                      ) : null}

                      {notice ? (
                        <div className="vg-support-success">
                          {notice}
                        </div>
                      ) : null}
                    </>
                  )}
                </aside>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default CustomerSupportCenterPage;