import { useEffect, useMemo, useState } from 'react'
import apiClient from '../../services/apiClient'

const mauFormApiTrong = {
  user_id: '',
  certificate_type: '',
  experience_years: '',
  status: 'active',
  languages_text: '',
  experiences_text: '',
}

const danhSachTrangThaiApi = ['active', 'inactive', 'locked']

const nhanTrangThai = {
  active: 'Đang hoạt động',
  inactive: 'Ngừng hoạt động',
  locked: 'Tạm khóa',
}

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

function layMetaTuPhanHoi(phanHoi) {
  const duLieu = phanHoi?.data?.data

  if (!duLieu || Array.isArray(duLieu)) {
    return { currentPage: 1, lastPage: 1, total: 0 }
  }

  return {
    currentPage: duLieu.current_page || 1,
    lastPage: duLieu.last_page || 1,
    total: duLieu.total || 0,
  }
}

function layTenNguoiDung(hdv) {
  return hdv.user?.full_name || hdv.user?.name || 'Chưa có tên'
}

function layChuCaiAvatar(hdv) {
  return layTenNguoiDung(hdv)
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((phan) => phan[0])
    .join('')
    .toUpperCase()
}

function layNgoaiNgu(hdv) {
  return Array.isArray(hdv.languages) ? hdv.languages : []
}

function laySoTourPhuTrach(hdv) {
  return hdv.assigned_tours_count || hdv.tours_count || hdv.current_tours_count || 0
}

function chuyenNgoaiNguThanhText(languages = []) {
  return languages
    .map((item) => [item.language, item.level].filter(Boolean).join(' - '))
    .join('\n')
}

function chuyenKinhNghiemThanhText(experiences = []) {
  return experiences
    .map((item) =>
      [item.certificate_name, item.issued_by, item.issued_year].filter(Boolean).join(' | '),
    )
    .join('\n')
}

function tachNgoaiNgu(text) {
  return text
    .split('\n')
    .map((dong) => dong.trim())
    .filter(Boolean)
    .map((dong) => {
      const [language, level] = dong.split(/\s*-\s*/).map((phan) => phan.trim())

      return {
        language,
        level: level || null,
      }
    })
}

function tachKinhNghiem(text) {
  return text
    .split('\n')
    .map((dong) => dong.trim())
    .filter(Boolean)
    .map((dong) => {
      const [certificateName, issuedBy, issuedYear] = dong
        .split('|')
        .map((phan) => phan.trim())

      return {
        certificate_name: certificateName,
        issued_by: issuedBy || null,
        issued_year: issuedYear ? Number(issuedYear) : null,
      }
    })
}

function taoGuidePayload(formHdv, dangSua) {
  const payload = {
    certificate_type: formHdv.certificate_type.trim() || null,
    experience_years: Number(formHdv.experience_years),
    status: formHdv.status,
    languages: tachNgoaiNgu(formHdv.languages_text),
    experiences: tachKinhNghiem(formHdv.experiences_text),
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

  if (!dangSua && (!Number.isInteger(userId) || userId <= 0)) {
    loiMoi.user_id = 'User ID phải là số nguyên lớn hơn 0.'
  }

  if (formHdv.certificate_type.trim().length > 100) {
    loiMoi.certificate_type = 'Chuyên môn/chứng chỉ tối đa 100 ký tự.'
  }

  if (
    formHdv.experience_years === '' ||
    !Number.isInteger(experienceYears) ||
    experienceYears < 0
  ) {
    loiMoi.experience_years = 'Số năm kinh nghiệm phải là số nguyên từ 0.'
  }

  if (!danhSachTrangThaiApi.includes(formHdv.status)) {
    loiMoi.status = 'Trạng thái không hợp lệ.'
  }

  const ngoaiNguKhongHopLe = tachNgoaiNgu(formHdv.languages_text).find(
    (item) => !item.language || item.language.length > 100,
  )

  if (ngoaiNguKhongHopLe) {
    loiMoi.languages_text = 'Mỗi ngoại ngữ cần có tên và tối đa 100 ký tự.'
  }

  const kinhNghiemKhongHopLe = tachKinhNghiem(formHdv.experiences_text).find(
    (item) =>
      !item.certificate_name ||
      item.certificate_name.length > 150 ||
      (item.issued_year !== null && !Number.isInteger(item.issued_year)),
  )

  if (kinhNghiemKhongHopLe) {
    loiMoi.experiences_text =
      'Mỗi dòng kinh nghiệm cần tên chứng chỉ, năm cấp nếu có phải là số nguyên.'
  }

  return loiMoi
}

function GuideManagementApiPage() {
  const [danhSachHdv, setDanhSachHdv] = useState([])
  const [thongKeHdv, setThongKeHdv] = useState({ total: 0, active: 0, inactive: 0, locked: 0 })
  const [tuKhoa, setTuKhoa] = useState('')
  const [locTrangThai, setLocTrangThai] = useState('all')
  const [locNgoaiNgu, setLocNgoaiNgu] = useState('')
  const [locKinhNghiem, setLocKinhNghiem] = useState('')
  const [phanTrang, setPhanTrang] = useState({ currentPage: 1, lastPage: 1, total: 0 })
  const [formHdv, setFormHdv] = useState(mauFormApiTrong)
  const [idDangSua, setIdDangSua] = useState(null)
  const [hdvChiTiet, setHdvChiTiet] = useState(null)
  const [dangTaiChiTiet, setDangTaiChiTiet] = useState(false)
  const [hienForm, setHienForm] = useState(false)
  const [dangTai, setDangTai] = useState(false)
  const [dangLuu, setDangLuu] = useState(false)
  const [loi, setLoi] = useState('')
  const [loiForm, setLoiForm] = useState({})
  const [thongBao, setThongBao] = useState('')

  const coLoc = locTrangThai !== 'all' || locNgoaiNgu.trim() || locKinhNghiem

  async function taiThongKeHdv() {
    try {
      const phanHoi = await apiClient.get('/admin/guides/statistics')
      const thongKeMoi = { total: phanHoi.data?.total || 0, active: 0, inactive: 0, locked: 0 }

      if (Array.isArray(phanHoi.data?.data)) {
        phanHoi.data.data.forEach((item) => {
          thongKeMoi[item.status] = item.total
        })
      }

      setThongKeHdv(thongKeMoi)
    } catch {
      setThongKeHdv((hienTai) => ({ ...hienTai, total: danhSachHdv.length }))
    }
  }

  async function taiDanhSachHdv(page = 1) {
    setDangTai(true)
    setLoi('')

    try {
      const params = { page }
      let endpoint = '/admin/guides'

      if (tuKhoa.trim() || coLoc) {
        endpoint = coLoc ? '/admin/guides/filter' : '/admin/guides/search'
      }

      if (tuKhoa.trim()) {
        params.search = tuKhoa.trim()
      }

      if (locTrangThai !== 'all') {
        params.status = locTrangThai
      }

      if (locNgoaiNgu.trim()) {
        params.language = locNgoaiNgu.trim()
      }

      if (locKinhNghiem) {
        params.experience_years = locKinhNghiem
      }

      const phanHoi = await apiClient.get(endpoint, { params })
      setDanhSachHdv(layDanhSachGuideTuPhanHoi(phanHoi))
      setPhanTrang(layMetaTuPhanHoi(phanHoi))
    } catch (error) {
      setLoi(layThongBaoLoi(error, 'Không tải được danh sách hướng dẫn viên.'))
    } finally {
      setDangTai(false)
    }
  }

  useEffect(() => {
    taiThongKeHdv()
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      taiDanhSachHdv(1)
    }, 350)

    return () => window.clearTimeout(timer)
  }, [tuKhoa, locTrangThai, locNgoaiNgu, locKinhNghiem])

  const thongKeTheoTrangThai = useMemo(
    () => ({
      active: thongKeHdv.active || 0,
      inactive: thongKeHdv.inactive || 0,
      locked: thongKeHdv.locked || 0,
    }),
    [thongKeHdv],
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
      status: hdv.status || 'active',
      languages_text: chuyenNgoaiNguThanhText(hdv.languages),
      experiences_text: chuyenKinhNghiemThanhText(hdv.experiences),
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

  async function moChiTiet(hdv) {
    setDangTaiChiTiet(true)
    setLoi('')
    setHdvChiTiet(hdv)

    try {
      const phanHoi = await apiClient.get(`/admin/guides/${hdv.id}`)
      setHdvChiTiet(phanHoi.data?.data || hdv)
    } catch (error) {
      setLoi(layThongBaoLoi(error, 'Không tải được chi tiết hướng dẫn viên.'))
    } finally {
      setDangTaiChiTiet(false)
    }
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

      await taiDanhSachHdv(phanTrang.currentPage)
      await taiThongKeHdv()
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
      await taiDanhSachHdv(phanTrang.currentPage)
      await taiThongKeHdv()
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
          <p>Quản lý và phân công hướng dẫn viên du lịch</p>
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
          <strong>{thongKeHdv.total || phanTrang.total || danhSachHdv.length}</strong>
          <span>Tổng HDV</span>
          <small>Toàn hệ thống</small>
        </article>
        <article className="guide-stat-card green">
          <strong>{thongKeTheoTrangThai.active || 0}</strong>
          <span>Đang hoạt động</span>
          <small>Sẵn sàng nhận tour</small>
        </article>
        <article className="guide-stat-card amber">
          <strong>{thongKeTheoTrangThai.inactive || 0}</strong>
          <span>Ngừng hoạt động</span>
          <small>Tạm ngưng nhận tour</small>
        </article>
        <article className="guide-stat-card blue">
          <strong>{thongKeTheoTrangThai.locked || 0}</strong>
          <span>Tạm khóa</span>
          <small>Chưa thể sử dụng</small>
        </article>
      </div>

      <div className="guide-content-grid">
        <div className="guide-main-panel">
          <div className="guide-filter-bar">
            <input
              value={tuKhoa}
              placeholder="Tìm hướng dẫn viên theo tên, email, SĐT, mã HDV..."
              onChange={(event) => setTuKhoa(event.target.value)}
            />
            <select
              value={locTrangThai}
              onChange={(event) => setLocTrangThai(event.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              {danhSachTrangThaiApi.map((trangThai) => (
                <option key={trangThai} value={trangThai}>
                  {nhanTrangThai[trangThai]}
                </option>
              ))}
            </select>
            <input
              value={locNgoaiNgu}
              placeholder="Lọc ngoại ngữ..."
              onChange={(event) => setLocNgoaiNgu(event.target.value)}
            />
            <input
              min="0"
              type="number"
              value={locKinhNghiem}
              placeholder="KN tối thiểu"
              onChange={(event) => setLocKinhNghiem(event.target.value)}
            />
          </div>

          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Mã HDV</th>
                  <th>Họ Tên</th>
                  <th>Chuyên Môn</th>
                  <th>Kinh nghiệm</th>
                  <th>Ngoại Ngữ</th>
                  <th>Tour Phụ Trách</th>
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

                {!dangTai && danhSachHdv.length === 0 ? (
                  <tr>
                    <td colSpan="9">Chưa có hướng dẫn viên.</td>
                  </tr>
                ) : null}

                {!dangTai
                  ? danhSachHdv.map((hdv) => (
                      <tr key={hdv.id}>
                        <td>
                          {hdv.user?.avatar_url ? (
                            <img
                              alt={layTenNguoiDung(hdv)}
                              className="guide-avatar image"
                              src={hdv.user.avatar_url}
                            />
                          ) : (
                            <span className="guide-avatar">{layChuCaiAvatar(hdv)}</span>
                          )}
                        </td>
                        <td>
                          <strong className="guide-code">
                            {hdv.guide_code || '-'}
                          </strong>
                        </td>
                        <td>
                          <strong>{layTenNguoiDung(hdv)}</strong>
                          <span>{hdv.certificate_type || 'Chưa cập nhật chuyên môn'}</span>
                        </td>
                        <td>{hdv.certificate_type || '-'}</td>
                        <td>{hdv.experience_years ?? 0} năm</td>
                        <td>
                          <div className="guide-language-list">
                            {layNgoaiNgu(hdv).length > 0 ? (
                              layNgoaiNgu(hdv).slice(0, 3).map((ngoaiNgu) => (
                                <span key={ngoaiNgu.id || ngoaiNgu.language}>
                                  {[ngoaiNgu.language, ngoaiNgu.level].filter(Boolean).join(' ')}
                                </span>
                              ))
                            ) : (
                              <span>Chưa có</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <strong className="guide-tour-count">
                            {laySoTourPhuTrach(hdv)} tour
                          </strong>
                        </td>
                        <td>
                          <span className={`guide-status ${hdv.status}`}>
                            {nhanTrangThai[hdv.status] || hdv.status}
                          </span>
                        </td>
                        <td>
                          <div className="guide-actions">
                            <button
                              type="button"
                              onClick={() => moChiTiet(hdv)}
                            >
                              Chi tiết
                            </button>
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
          {phanTrang.lastPage > 1 ? (
            <div className="guide-pagination">
              <button
                disabled={phanTrang.currentPage <= 1 || dangTai}
                type="button"
                onClick={() => taiDanhSachHdv(phanTrang.currentPage - 1)}
              >
                Trước
              </button>
              <span>
                Trang {phanTrang.currentPage} / {phanTrang.lastPage}
              </span>
              <button
                disabled={phanTrang.currentPage >= phanTrang.lastPage || dangTai}
                type="button"
                onClick={() => taiDanhSachHdv(phanTrang.currentPage + 1)}
              >
                Sau
              </button>
            </div>
          ) : null}
        </div>

        <aside className="guide-side-panel">
          <h2>Tổng Theo Trạng Thái</h2>
          {danhSachTrangThaiApi.map((trangThai) => (
            <div className="guide-status-row" key={trangThai}>
              <span>{nhanTrangThai[trangThai]}</span>
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
                <p>Thông tin họ tên, email, SĐT lấy từ tài khoản user đã liên kết.</p>
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
                Chuyên môn
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
                Trạng thái
                <select
                  value={formHdv.status}
                  onChange={(event) => capNhatForm('status', event.target.value)}
                >
                  {danhSachTrangThaiApi.map((trangThai) => (
                    <option key={trangThai} value={trangThai}>
                      {nhanTrangThai[trangThai]}
                    </option>
                  ))}
                </select>
                {loiForm.status ? (
                  <span className="guide-field-error">{loiForm.status}</span>
                ) : null}
              </label>
              <label className="guide-form-wide">
                Ngoại ngữ
                <textarea
                  placeholder="Tiếng Anh - C1&#10;Tiếng Trung - B2"
                  value={formHdv.languages_text}
                  onChange={(event) => capNhatForm('languages_text', event.target.value)}
                />
                {loiForm.languages_text ? (
                  <span className="guide-field-error">{loiForm.languages_text}</span>
                ) : null}
              </label>
              <label className="guide-form-wide">
                Chứng chỉ / kinh nghiệm
                <textarea
                  placeholder="Thẻ HDV Quốc Tế | Tổng Cục Du Lịch Việt Nam | 2020"
                  value={formHdv.experiences_text}
                  onChange={(event) => capNhatForm('experiences_text', event.target.value)}
                />
                {loiForm.experiences_text ? (
                  <span className="guide-field-error">{loiForm.experiences_text}</span>
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

      {hdvChiTiet ? (
        <div className="guide-modal-backdrop">
          <div className="guide-modal guide-detail-modal">
            <div className="guide-modal-header">
              <div>
                <h2>Chi tiết hướng dẫn viên</h2>
                <p>{dangTaiChiTiet ? 'Đang tải dữ liệu mới nhất...' : hdvChiTiet.guide_code}</p>
              </div>
              <button type="button" onClick={() => setHdvChiTiet(null)}>
                Đóng
              </button>
            </div>

            <div className="guide-detail-head">
              {hdvChiTiet.user?.avatar_url ? (
                <img
                  alt={layTenNguoiDung(hdvChiTiet)}
                  className="guide-avatar image large"
                  src={hdvChiTiet.user.avatar_url}
                />
              ) : (
                <span className="guide-avatar large">{layChuCaiAvatar(hdvChiTiet)}</span>
              )}
              <div>
                <h3>{layTenNguoiDung(hdvChiTiet)}</h3>
                <p>{hdvChiTiet.certificate_type || 'Chưa cập nhật chuyên môn'}</p>
              </div>
            </div>

            <div className="guide-detail-grid">
              <div>
                <span>Email</span>
                <strong>{hdvChiTiet.user?.email || '-'}</strong>
              </div>
              <div>
                <span>SĐT</span>
                <strong>{hdvChiTiet.user?.phone || '-'}</strong>
              </div>
              <div>
                <span>Kinh nghiệm</span>
                <strong>{hdvChiTiet.experience_years ?? 0} năm</strong>
              </div>
              <div>
                <span>Đánh giá</span>
                <strong>{Number(hdvChiTiet.average_rating || 0).toFixed(2)}</strong>
              </div>
              <div>
                <span>Lượt đánh giá</span>
                <strong>{hdvChiTiet.review_count ?? 0}</strong>
              </div>
              <div>
                <span>Tour phụ trách</span>
                <strong>{laySoTourPhuTrach(hdvChiTiet)} tour</strong>
              </div>
            </div>

            <div className="guide-detail-section">
              <h3>Ngoại ngữ</h3>
              <div className="guide-language-list">
                {layNgoaiNgu(hdvChiTiet).length > 0 ? (
                  layNgoaiNgu(hdvChiTiet).map((ngoaiNgu) => (
                    <span key={ngoaiNgu.id || ngoaiNgu.language}>
                      {[ngoaiNgu.language, ngoaiNgu.level].filter(Boolean).join(' ')}
                    </span>
                  ))
                ) : (
                  <span>Chưa có</span>
                )}
              </div>
            </div>

            <div className="guide-detail-section">
              <h3>Chứng chỉ / kinh nghiệm</h3>
              {Array.isArray(hdvChiTiet.experiences) && hdvChiTiet.experiences.length > 0 ? (
                <div className="guide-certificate-list">
                  {hdvChiTiet.experiences.map((kinhNghiem) => (
                    <div key={kinhNghiem.id || kinhNghiem.certificate_name}>
                      <strong>{kinhNghiem.certificate_name}</strong>
                      <span>
                        {[kinhNghiem.issued_by, kinhNghiem.issued_year]
                          .filter(Boolean)
                          .join(' - ') || 'Chưa cập nhật nơi cấp'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="guide-empty-text">Chưa có chứng chỉ / kinh nghiệm.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default GuideManagementApiPage
