import { useEffect, useMemo, useState } from 'react'
import apiClient from '../../services/apiClient'

const mauFormApiTrong = {
  user_id: '',
  certificate_type: '',
  experience_years: '',
  average_rating: '',
  review_count: '',
  status: 'active',
}

const danhSachTrangThaiApi = ['Đang hoạt động', 'Ngừng hoạt động', 'Tạm khóa']

function layDanhSachGuideTuPhanHoi(phanHoi) {
  const duLieu = phanHoi?.data

  if (Array.isArray(duLieu)) {
    return duLieu
  }

  if (Array.isArray(duLieu?.data)) {
    return duLieu.data
  }

  if (Array.isArray(duLieu?.data?.data)) {
    return duLieu.data.data
  }

  return []
}

function layThongBaoLoi(error, fallback) {
  const errors = error.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  return error.response?.data?.message || fallback
}

function taoGuidePayload(formHdv, dangSua) {
  const payload = {
    certificate_type: formHdv.certificate_type.trim() || null,
    experience_years: Number(formHdv.experience_years),
    average_rating: Number(formHdv.average_rating) || 0,
    review_count: Number(formHdv.review_count) || 0,
    status: formHdv.status,
  }

  if (!dangSua) {
    payload.user_id = Number(formHdv.user_id)
  }

  return payload
}

function validateGuideForm(formHdv, dangSua) {
  const loiMoi = {}
  const userId = Number(formHdv.user_id)
  const experienceYears = Number(formHdv.experience_years)
  const averageRating = Number(formHdv.average_rating)
  const reviewCount = Number(formHdv.review_count)

  if (!dangSua && (!Number.isInteger(userId) || userId <= 0)) {
    loiMoi.user_id = 'User ID phải là số nguyên lớn hơn 0.'
  }

  if (formHdv.certificate_type.trim().length > 100) {
    loiMoi.certificate_type = 'Loại chứng chỉ tối đa 100 ký tự.'
  }

  if (
    formHdv.experience_years === '' ||
    !Number.isInteger(experienceYears) ||
    experienceYears < 0
  ) {
    loiMoi.experience_years = 'Số năm kinh nghiệm phải là số nguyên từ 0.'
  }

  if (
    formHdv.average_rating !== '' &&
    (Number.isNaN(averageRating) || averageRating < 0 || averageRating > 5)
  ) {
    loiMoi.average_rating = 'Đánh giá trung bình phải từ 0 đến 5.'
  }

  if (
    formHdv.review_count === '' ||
    !Number.isInteger(reviewCount) ||
    reviewCount < 0
  ) {
    loiMoi.review_count = 'Số lượt đánh giá phải là số nguyên từ 0.'
  }

  if (!danhSachTrangThaiApi.includes(formHdv.status)) {
    loiMoi.status = 'Trạng thái không hợp lệ.'
  }

  return loiMoi
}

function GuideManagementApiPage() {
  const [danhSachHdv, setDanhSachHdv] = useState([])
  const [tuKhoa, setTuKhoa] = useState('')
  const [locTrangThai, setLocTrangThai] = useState('Tất cả')
  const [formHdv, setFormHdv] = useState(mauFormApiTrong)
  const [idDangSua, setIdDangSua] = useState(null)
  const [hienForm, setHienForm] = useState(false)
  const [dangTai, setDangTai] = useState(false)
  const [dangLuu, setDangLuu] = useState(false)
  const [loi, setLoi] = useState('')
  const [loiForm, setLoiForm] = useState({})
  const [thongBao, setThongBao] = useState('')

  async function taiDanhSachHdv() {
    setDangTai(true)
    setLoi('')

    try {
      const phanHoi = await apiClient.get('/admin/guides')
      setDanhSachHdv(layDanhSachGuideTuPhanHoi(phanHoi))
    } catch (error) {
      setLoi(layThongBaoLoi(error, 'Không tải được danh sách hướng dẫn viên.'))
    } finally {
      setDangTai(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      taiDanhSachHdv()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const danhSachDaLoc = useMemo(() => {
    const tuKhoaChuanHoa = tuKhoa.trim().toLowerCase()

    return danhSachHdv.filter((hdv) => {
      const userName = hdv.user?.name || hdv.user?.full_name || ''
      const userEmail = hdv.user?.email || ''
      const khopTuKhoa =
        !tuKhoaChuanHoa ||
        String(hdv.id).includes(tuKhoaChuanHoa) ||
        String(hdv.user_id).includes(tuKhoaChuanHoa) ||
        (hdv.guide_code || '').toLowerCase().includes(tuKhoaChuanHoa) ||
        (hdv.certificate_type || '').toLowerCase().includes(tuKhoaChuanHoa) ||
        userName.toLowerCase().includes(tuKhoaChuanHoa) ||
        userEmail.toLowerCase().includes(tuKhoaChuanHoa)

      const khopTrangThai =
        locTrangThai === 'Tất cả' || hdv.status === locTrangThai

      return khopTuKhoa && khopTrangThai
    })
  }, [danhSachHdv, locTrangThai, tuKhoa])

  const thongKeTheoTrangThai = useMemo(
    () =>
      danhSachTrangThaiApi.reduce((ketQua, trangThai) => {
        ketQua[trangThai] = danhSachHdv.filter(
          (hdv) => hdv.status === trangThai,
        ).length
        return ketQua
      }, {}),
    [danhSachHdv],
  )

  function capNhatForm(truong, giaTri) {
    setFormHdv((formHienTai) => ({
      ...formHienTai,
      [truong]: giaTri,
    }))
    setLoiForm((loiHienTai) => ({
      ...loiHienTai,
      [truong]: '',
    }))
  }

  function moFormThemMoi() {
    setFormHdv(mauFormApiTrong)
    setIdDangSua(null)
    setLoi('')
    setLoiForm({})
    setThongBao('')
    setHienForm(true)
  }

  function moFormChinhSua(hdv) {
    setFormHdv({
      user_id: String(hdv.user_id || ''),
      certificate_type: hdv.certificate_type || '',
      experience_years: String(hdv.experience_years ?? ''),
      average_rating: String(hdv.average_rating ?? 0),
      review_count: String(hdv.review_count ?? 0),
      status: hdv.status || 'active',
    })
    setIdDangSua(hdv.id)
    setLoi('')
    setLoiForm({})
    setThongBao('')
    setHienForm(true)
  }

  function dongForm() {
    setFormHdv(mauFormApiTrong)
    setIdDangSua(null)
    setLoiForm({})
    setHienForm(false)
  }

  async function luuHuongDanVien(event) {
    event.preventDefault()
    setDangLuu(true)
    setLoi('')
    setThongBao('')

    const loiMoi = validateGuideForm(formHdv, Boolean(idDangSua))

    if (Object.keys(loiMoi).length > 0) {
      setLoiForm(loiMoi)
      setDangLuu(false)
      return
    }

    try {
      const payload = taoGuidePayload(formHdv, Boolean(idDangSua))
      const phanHoi = idDangSua
        ? await apiClient.put(`/admin/guides/${idDangSua}`, payload)
        : await apiClient.post('/admin/guides', payload)

      await taiDanhSachHdv()
      dongForm()
      setThongBao(
        phanHoi.data?.message ||
          (idDangSua
            ? 'Cập nhật hướng dẫn viên thành công.'
            : 'Thêm hướng dẫn viên thành công.'),
      )
    } catch (error) {
      setLoi(layThongBaoLoi(error, 'Không lưu được thông tin hướng dẫn viên.'))
    } finally {
      setDangLuu(false)
    }
  }

  async function xoaHuongDanVien(id) {
    if (!window.confirm('Bạn có chắc muốn xóa hướng dẫn viên này?')) {
      return
    }

    setLoi('')
    setThongBao('')

    try {
      const phanHoi = await apiClient.delete(`/admin/guides/${id}`)
      await taiDanhSachHdv()
      setThongBao(
        phanHoi.data?.message || 'Xóa hướng dẫn viên thành công.',
      )
    } catch (error) {
      setLoi(layThongBaoLoi(error, 'Không xóa được hướng dẫn viên.'))
    }
  }

  return (
    <section className="guide-page">
      <div className="guide-heading">
        <div>
          <div className="guide-breadcrumb">ViVuGo / Hướng Dẫn Viên</div>
          <h1>Hướng Dẫn Viên</h1>
          <p>Quản lý dữ liệu bảng guides và trạng thái hướng dẫn viên.</p>
        </div>
        <button className="guide-add-button" type="button" onClick={moFormThemMoi}>
          <span aria-hidden="true">+</span>
          Thêm HDV
        </button>
      </div>

      {thongBao ? (
        <div className="guide-alert success">{thongBao}</div>
      ) : null}
      {loi ? <div className="guide-alert error">{loi}</div> : null}

      <div className="guide-stat-grid">
        <article className="guide-stat-card">
          <strong>{danhSachHdv.length}</strong>
          <span>Tổng HDV</span>
          <small>Toàn hệ thống</small>
        </article>
        <article className="guide-stat-card green">
          <strong>{thongKeTheoTrangThai.active || 0}</strong>
          <span>Active</span>
          <small>Đang hoạt động</small>
        </article>
        <article className="guide-stat-card amber">
          <strong>{thongKeTheoTrangThai.inactive || 0}</strong>
          <span>Inactive</span>
          <small>Ngừng hoạt động</small>
        </article>
        <article className="guide-stat-card blue">
          <strong>{thongKeTheoTrangThai.locked || 0}</strong>
          <span>Locked</span>
          <small>Tạm khóa</small>
        </article>
      </div>

      <div className="guide-content-grid">
        <div className="guide-main-panel">
          <div className="guide-filter-bar">
            <input
              value={tuKhoa}
              placeholder="Tìm theo ID, user ID, mã HDV, chứng chỉ..."
              onChange={(event) => setTuKhoa(event.target.value)}
            />
            <select
              value={locTrangThai}
              onChange={(event) => setLocTrangThai(event.target.value)}
            >
              <option>Tất cả</option>
              {danhSachTrangThaiApi.map((trangThai) => (
                <option key={trangThai}>{trangThai}</option>
              ))}
            </select>
          </div>

          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User ID</th>
                  <th>Mã HDV</th>
                  <th>Chứng chỉ</th>
                  <th>Kinh nghiệm</th>
                  <th>Đánh giá TB</th>
                  <th>Lượt đánh giá</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {dangTai ? (
                  <tr>
                    <td colSpan="9">Đang tải dữ liệu...</td>
                  </tr>
                ) : null}

                {!dangTai && danhSachDaLoc.length === 0 ? (
                  <tr>
                    <td colSpan="9">Chưa có hướng dẫn viên.</td>
                  </tr>
                ) : null}

                {!dangTai
                  ? danhSachDaLoc.map((hdv) => (
                      <tr key={hdv.id}>
                        <td>{hdv.id}</td>
                        <td>{hdv.user_id}</td>
                        <td>
                          <strong className="guide-code">
                            {hdv.guide_code || '-'}
                          </strong>
                        </td>
                        <td>{hdv.certificate_type || '-'}</td>
                        <td>{hdv.experience_years ?? 0} năm</td>
                        <td>{Number(hdv.average_rating || 0).toFixed(2)}</td>
                        <td>{hdv.review_count ?? 0}</td>
                        <td>
                          <span className={`guide-status ${hdv.status}`}>
                            {hdv.status}
                          </span>
                        </td>
                        <td>
                          <div className="guide-actions">
                            <button
                              type="button"
                              onClick={() => moFormChinhSua(hdv)}
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => xoaHuongDanVien(hdv.id)}
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="guide-side-panel">
          <h2>Tổng Theo Trạng Thái</h2>
          {danhSachTrangThaiApi.map((trangThai) => (
            <div className="guide-status-row" key={trangThai}>
              <span>{trangThai}</span>
              <strong>{thongKeTheoTrangThai[trangThai] || 0} HDV</strong>
            </div>
          ))}
        </aside>
      </div>

      {hienForm ? (
        <div className="guide-modal-backdrop">
          <form className="guide-modal" onSubmit={luuHuongDanVien} noValidate>
            <div className="guide-modal-header">
              <div>
                <h2>{idDangSua ? 'Sửa hướng dẫn viên' : 'Thêm hướng dẫn viên'}</h2>
                <p>Guide code sẽ được backend tự tạo khi thêm mới.</p>
              </div>
              <button type="button" onClick={dongForm}>
                Đóng
              </button>
            </div>

            <div className="guide-form-grid">
              <label>
                User ID
                <input
                  disabled={Boolean(idDangSua)}
                  min="1"
                  required
                  type="number"
                  value={formHdv.user_id}
                  onChange={(event) => capNhatForm('user_id', event.target.value)}
                />
                {loiForm.user_id ? (
                  <span className="guide-field-error">{loiForm.user_id}</span>
                ) : null}
              </label>
              <label>
                Loại chứng chỉ
                <input
                  maxLength="100"
                  value={formHdv.certificate_type}
                  onChange={(event) =>
                    capNhatForm('certificate_type', event.target.value)
                  }
                />
                {loiForm.certificate_type ? (
                  <span className="guide-field-error">
                    {loiForm.certificate_type}
                  </span>
                ) : null}
              </label>
              <label>
                Số năm kinh nghiệm
                <input
                  min="0"
                  required
                  type="number"
                  value={formHdv.experience_years}
                  onChange={(event) =>
                    capNhatForm('experience_years', event.target.value)
                  }
                />
                {loiForm.experience_years ? (
                  <span className="guide-field-error">
                    {loiForm.experience_years}
                  </span>
                ) : null}
              </label>
              <label>
                Đánh giá trung bình
                <input
                  max="5"
                  min="0"
                  step="0.01"
                  type="number"
                  value={formHdv.average_rating}
                  onChange={(event) =>
                    capNhatForm('average_rating', event.target.value)
                  }
                />
                {loiForm.average_rating ? (
                  <span className="guide-field-error">
                    {loiForm.average_rating}
                  </span>
                ) : null}
              </label>
              <label>
                Lượt đánh giá
                <input
                  min="0"
                  required
                  type="number"
                  value={formHdv.review_count}
                  onChange={(event) =>
                    capNhatForm('review_count', event.target.value)
                  }
                />
                {loiForm.review_count ? (
                  <span className="guide-field-error">
                    {loiForm.review_count}
                  </span>
                ) : null}
              </label>
              <label>
                Trạng thái
                <select
                  value={formHdv.status}
                  onChange={(event) => capNhatForm('status', event.target.value)}
                >
                  {danhSachTrangThaiApi.map((trangThai) => (
                    <option key={trangThai}>{trangThai}</option>
                  ))}
                </select>
                {loiForm.status ? (
                  <span className="guide-field-error">{loiForm.status}</span>
                ) : null}
              </label>
            </div>

            <div className="guide-modal-actions">
              <button type="button" onClick={dongForm}>
                Hủy
              </button>
              <button disabled={dangLuu} type="submit">
                {dangLuu
                  ? 'Đang lưu...'
                  : idDangSua
                    ? 'Lưu thay đổi'
                    : 'Thêm HDV'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  )
}

export default GuideManagementApiPage