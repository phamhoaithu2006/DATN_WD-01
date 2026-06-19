import { useState } from "react";
import { Link } from "react-router-dom";
import { changePassword, updateProfile } from "../../services/customerApi";
import { readSession, saveSession } from "../../services/authStorage";

function ProfileForm({ profile, setProfile, password = false }) {
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(
    password
      ? {
          current_password: "",
          new_password: "",
          new_password_confirmation: "",
        }
      : profile,
  );

  async function submit(event) {
    event.preventDefault();
    try {
      if (password) await changePassword(form);
      else {
        await updateProfile({ full_name: form.full_name, phone: form.phone });
        setProfile(form);
        saveSession({ ...readSession(), ...form });
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
        <Link to="/customer/profile">← Quay lại hồ sơ</Link>
        <h1>{password ? "Đổi mật khẩu" : "Chỉnh sửa hồ sơ"}</h1>
        {password ? (
          <>
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
            <label>
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
          </>
        ) : (
          <>
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
            <label>
              Số điện thoại
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
              />
            </label>
          </>
        )}
        <button type="submit">Lưu thay đổi</button>
        {notice ? <p>{notice}</p> : null}
      </form>
    </main>
  );
}

export default ProfileForm;
