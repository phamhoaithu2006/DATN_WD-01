import { useState } from "react";
import SettingField from "./SettingField";
import SettingSwitch from "./SettingSwitch";

const emptyBanner = {
  title: "",
  subtitle: "",
  image_url: "",
  button_text: "",
  link_url: "",
  sort_order: 0,
  is_active: true,
};

function BannerManager({ banners, onChange }) {
  const [form, setForm] = useState(emptyBanner);
  const [editingId, setEditingId] = useState(null);
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const reset = () => {
    setForm({ ...emptyBanner, sort_order: banners.length });
    setEditingId(null);
  };

  function saveBanner() {
    if (!form.image_url.trim()) return;
    const banner = {
      ...form,
      id: editingId || `banner-${Date.now()}`,
      sort_order: Number(form.sort_order),
      is_active: Boolean(form.is_active),
    };
    const next = editingId
      ? banners.map((item) => (item.id === editingId ? banner : item))
      : [...banners, banner];
    onChange(next.sort((a, b) => a.sort_order - b.sort_order));
    reset();
  }

  function remove(id) {
    if (window.confirm("Bạn có chắc muốn xóa banner này?"))
      onChange(banners.filter((banner) => banner.id !== id));
  }

  return (
    <div className="banner-manager">
      <div className="banner-manager-head">
        <div>
          <h3>Quản lý banner trang chủ</h3>
          <p>Thêm, sửa, xóa và bật hoặc tắt banner.</p>
        </div>
        <button
          className="setting-refresh-button"
          type="button"
          onClick={reset}
        >
          Thêm mới
        </button>
      </div>
      <div className="banner-editor-grid">
        <div className="banner-form-card">
          <h4>{editingId ? "Sửa banner" : "Thêm banner"}</h4>
          <SettingField label="Tiêu đề">
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </SettingField>
          <SettingField label="Mô tả">
            <textarea
              value={form.subtitle}
              onChange={(e) => update("subtitle", e.target.value)}
            />
          </SettingField>
          <SettingField label="URL hình ảnh" required>
            <input
              value={form.image_url}
              onChange={(e) => update("image_url", e.target.value)}
            />
          </SettingField>
          <div className="setting-form-grid compact">
            <SettingField label="Nút CTA">
              <input
                value={form.button_text}
                onChange={(e) => update("button_text", e.target.value)}
              />
            </SettingField>
            <SettingField label="Liên kết">
              <input
                value={form.link_url}
                onChange={(e) => update("link_url", e.target.value)}
              />
            </SettingField>
            <SettingField label="Thứ tự">
              <input
                type="number"
                min="0"
                value={form.sort_order}
                onChange={(e) => update("sort_order", e.target.value)}
              />
            </SettingField>
            <SettingSwitch
              compact
              title="Hiển thị"
              description="Hiện trên trang chủ."
              checked={form.is_active}
              onChange={(value) => update("is_active", value)}
            />
          </div>
          {form.image_url ? (
            <div className="banner-form-preview">
              <img src={form.image_url} alt="Xem trước banner" />
            </div>
          ) : null}
          <div className="banner-actions-row">
            <button
              className="setting-save-button"
              type="button"
              onClick={saveBanner}
            >
              {editingId ? "Cập nhật banner" : "Thêm banner"}
            </button>
            {editingId ? (
              <button
                className="setting-refresh-button"
                type="button"
                onClick={reset}
              >
                Hủy
              </button>
            ) : null}
          </div>
        </div>
        <div className="banner-list-card">
          <h4>Danh sách banner</h4>
          {banners.length === 0 ? (
            <div className="banner-empty">Chưa có banner nào.</div>
          ) : (
            <div className="banner-list">
              {banners.map((banner) => (
                <article className="banner-item" key={banner.id}>
                  <img src={banner.image_url} alt={banner.title || "Banner"} />
                  <div className="banner-item-body">
                    <strong>{banner.title || "Chưa có tiêu đề"}</strong>
                    <small>{banner.subtitle || "Chưa có mô tả"}</small>
                    <span>
                      Thứ tự: {banner.sort_order} ·{" "}
                      {banner.is_active ? "Đang hiển thị" : "Đang ẩn"}
                    </span>
                  </div>
                  <div className="banner-item-actions">
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          banners.map((item) =>
                            item.id === banner.id
                              ? { ...item, is_active: !item.is_active }
                              : item,
                          ),
                        )
                      }
                    >
                      {banner.is_active ? "Ẩn" : "Hiện"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(banner);
                        setEditingId(banner.id);
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      className="danger"
                      type="button"
                      onClick={() => remove(banner.id)}
                    >
                      Xóa
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BannerManager;
