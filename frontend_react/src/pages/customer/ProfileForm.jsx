import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/customer/Icon";
import { changePassword, updateProfile } from "../../services/customerApi";
import { readSession, saveSession } from "../../services/authStorage";
import { mediaUrl } from "../../utils/mediaUrl";

function ProfileForm({ profile, setProfile, password = false }) {
  const [notice, setNotice] = useState("");
  const [avatarName, setAvatarName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(() => mediaUrl(profile.avatar_url));
  const [form, setForm] = useState(
    password
      ? {
          current_password: "",
          new_password: "",
          new_password_confirmation: "",
        }
      : {
          ...profile,
          avatar: null,
        },
  );
  const avatarSrc = password ? mediaUrl(profile.avatar_url) : avatarPreview;

  function changeAvatar(event) {
    const file = event.target.files?.[0] || null;

    setForm((current) => ({ ...current, avatar: file }));
    setAvatarPreview(file ? URL.createObjectURL(file) : mediaUrl(profile.avatar_url));
    setAvatarName(file?.name || "");
  }

  async function submit(event) {
    event.preventDefault();
    try {
      if (password) await changePassword(form);
      else {
        const response = await updateProfile({
          full_name: form.full_name,
          phone: form.phone,
          avatar: form.avatar,
        });
        const nextProfile = {
          ...profile,
          ...form,
          ...(response.data?.data || {}),
          avatar: null,
        };

        setForm(nextProfile);
        setProfile(nextProfile);
        saveSession({ ...readSession(), ...nextProfile });
        setAvatarPreview(mediaUrl(nextProfile.avatar_url));
        setAvatarName("");
      }
      setNotice(
        password ? "Đổi mật khẩu thành công." : "Cập nhật hồ sơ thành công.",
      );
    } catch {
      setNotice("Không thể cập nhật. Vui lòng kiểm tra kết nối và thử lại.");
    }
  }

  return (
    <main className="vg-form-page">
      <form onSubmit={submit}>
        <Link className="vg-form-back" to="/customer/profile">
          ← Quay lại hồ sơ
        </Link>
        <div className="vg-form-heading">
          <div className="vg-form-avatar">
            {avatarSrc ? (
              <img src={avatarSrc} alt={profile.full_name || "Ảnh đại diện"} />
            ) : (
              <span>{profile.full_name?.charAt(0)?.toUpperCase() || "V"}</span>
            )}
          </div>
          <div>
            <span>{password ? "Bảo mật tài khoản" : "Thông tin cá nhân"}</span>
            <h1>{password ? "Đổi mật khẩu" : "Chỉnh sửa hồ sơ"}</h1>
            <p>
              {password
                ? "Cập nhật mật khẩu định kỳ để bảo vệ tài khoản của bạn."
                : "Giữ thông tin liên hệ chính xác để ViVuGo hỗ trợ tốt hơn."}
            </p>
          </div>
        </div>

        {password ? (
          <div className="vg-form-grid">
            <label>
              Mật khẩu hiện tại
              <input
                type="password"
                value={form.current_password}
                onChange={(event) =>
                  setForm({ ...form, current_password: event.target.value })
                }
              />
            </label>
            <label>
              Mật khẩu mới
              <input
                type="password"
                value={form.new_password}
                onChange={(event) =>
                  setForm({ ...form, new_password: event.target.value })
                }
              />
            </label>
            <label className="wide">
              Nhập lại mật khẩu mới
              <input
                type="password"
                value={form.new_password_confirmation}
                onChange={(event) =>
                  setForm({
                    ...form,
                    new_password_confirmation: event.target.value,
                  })
                }
              />
            </label>
          </div>
        ) : (
          <>
            <div className="vg-avatar-upload-panel">
              <div className="vg-avatar-upload-preview">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={form.full_name || "Ảnh đại diện"} />
                ) : (
                  <span>{form.full_name?.charAt(0)?.toUpperCase() || "V"}</span>
                )}
              </div>
              <div>
                <strong>Ảnh đại diện</strong>
                <p>Chọn ảnh JPG, PNG hoặc WebP, dung lượng tối đa 2MB.</p>
                <label className="vg-avatar-upload-button">
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    type="file"
                    onChange={changeAvatar}
                  />
                  <Icon name="camera" size={18} />
                  Chọn ảnh mới
                </label>
                {avatarName ? <small>{avatarName}</small> : null}
              </div>
            </div>

            <div className="vg-form-grid">
              <label>
                Họ và tên
                <input
                  value={form.full_name}
                  onChange={(event) =>
                    setForm({ ...form, full_name: event.target.value })
                  }
                />
              </label>
              <label>
                Email
                <input readOnly value={form.email} />
              </label>
              <label className="wide">
                Số điện thoại
                <input
                  value={form.phone || ""}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                />
              </label>
            </div>
          </>
        )}

        <button type="submit">
          <Icon name="shield" size={18} /> Lưu thay đổi
        </button>
        {notice ? <p>{notice}</p> : null}
      </form>
    </main>
  );
}

export default ProfileForm;
