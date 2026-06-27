import { useCallback, useEffect, useMemo, useState } from 'react'
import apiClient from '../../services/apiClient'
import { searchAccounts } from '../../services/adminAccountApi'

const mauFormApiTrong = {
  user_name: '',
  user_id: '',
  certificate_type: '',
  experience_years: '',
  status: 'active',
  languages: [],
  experiences: [],
}

const mauDongNgoaiNgu = { language_id: '' }
const mauDongChungChi = { certificate_id: '', issued_year: '' }

const danhSachTrangThaiApi = ['active', 'inactive', 'locked']

const nhanTrangThai = {
  active: 'Đang hoạt động',
  inactive: 'Ngừng hoạt động',
  locked: 'Tạm khóa',
}

const nhanLoaiTour = {
  all: 'Tất cả loại tour',
  international: 'Tour quốc tế',
  domestic: 'Tour trong nước',
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

function layMangDuLieuTuPhanHoi(phanHoi) {
  const duLieu = phanHoi?.data

  if (Array.isArray(duLieu)) {
    return duLieu
  }

  if (Array.isArray(duLieu?.data)) {
    return duLieu.data
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

function chuanHoaTenNguoiDung(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
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

function layTenNgoaiNgu(ngoaiNgu) {
  return ngoaiNgu.language?.name || ngoaiNgu.language_name || ngoaiNgu.language || '-'
}

function layTenChungChi(kinhNghiem) {
  return kinhNghiem.certificate?.name || kinhNghiem.certificate_name || '-'
}

function layNoiCapChungChi(kinhNghiem) {
  return kinhNghiem.certificate?.issued_by || kinhNghiem.issued_by || ''
}

function laySoTourPhuTrach(hdv) {
  return hdv.assigned_tours_count || hdv.tours_count || hdv.current_tours_count || 0
}

function taoDongNgoaiNgu() {
  return { ...mauDongNgoaiNgu }
}

function taoDongChungChi() {
  return { ...mauDongChungChi }
}

function chuyenNgoaiNguThanhForm(languages = []) {
  return languages.map((item) => ({
    language_id: String(item.language_id || item.language?.id || ''),
  }))
}

function chuyenKinhNghiemThanhForm(experiences = []) {
  return experiences.map((item) => ({
    certificate_id: String(item.certificate_id || item.certificate?.id || ''),
    issued_year: item.issued_year ? String(item.issued_year) : '',
  }))
}

function taoGuidePayload(formHdv) {
  const payload = {
    certificate_type: formHdv.certificate_type.trim() || null,
    experience_years: Number(formHdv.experience_years),
    status: formHdv.status,
    languages: formHdv.languages
      .filter((item) => item.language_id)
      .map((item) => ({
        language_id: Number(item.language_id),
      })),
    experiences: formHdv.experiences
      .filter((item) => item.certificate_id)
      .map((item) => ({
        certificate_id: Number(item.certificate_id),
        issued_year: item.issued_year ? Number(item.issued_year) : null,
      })),
  }

  return payload
}

function validateGuideForm(formHdv) {
  const loiMoi = {}
  const experienceYears = Number(formHdv.experience_years)

  if (!formHdv.user_name.trim()) {
    loiMoi.user_id = 'Vui lòng nhập họ và tên.'
  }

  if (formHdv.certificate_type.trim().length > 100) {
    loiMoi.certificate_type = 'Chuyên môn/Chứng chỉ tối đa 100 ký tự.'
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

  const ngoaiNguKhongHopLe = formHdv.languages.find((item) => item.language_id === '')

  if (ngoaiNguKhongHopLe) {
    loiMoi.languages = 'Mỗi dòng ngoại ngữ cần chọn ngôn ngữ.'
  }

  const trungNgoaiNgu =
    new Set(formHdv.languages.filter((item) => item.language_id).map((item) => item.language_id))
      .size !== formHdv.languages.filter((item) => item.language_id).length

  if (trungNgoaiNgu) {
    loiMoi.languages = 'Không chọn trùng ngôn ngữ.'
  }

  const kinhNghiemKhongHopLe = formHdv.experiences.find(
    (item) =>
      (item.certificate_id || item.issued_year) &&
      (!item.certificate_id ||
        (item.issued_year && !Number.isInteger(Number(item.issued_year)))),
  )

  if (kinhNghiemKhongHopLe) {
    loiMoi.experiences = 'Mỗi dòng chứng chỉ cần chọn chứng chỉ, năm cấp nếu có phải là số nguyên.'
  }

  const trungChungChi =
    new Set(
      formHdv.experiences.filter((item) => item.certificate_id).map((item) => item.certificate_id),
    ).size !== formHdv.experiences.filter((item) => item.certificate_id).length

  if (trungChungChi) {
    loiMoi.experiences = 'Không chọn trùng chứng chỉ.'
  }

  return loiMoi
}

async function timNguoiDungTheoHoTen(hoTen) {
  const phanHoi = await searchAccounts({ search: hoTen.trim() })
  const danhSach = Array.isArray(phanHoi) ? phanHoi : []
  const tenCanTim = chuanHoaTenNguoiDung(hoTen)

  return (
    danhSach.find((nguoiDung) => {
      const ten = chuanHoaTenNguoiDung(nguoiDung.full_name || nguoiDung.name)
      return ten && ten === tenCanTim
    }) || null
  )
}

function GuideManagementApiPage() {
  const [danhSachHdv, setDanhSachHdv] = useState([])
  const [thongKeHdv, setThongKeHdv] = useState({ total: 0, active: 0, inactive: 0, locked: 0 })
  const [tuKhoa, setTuKhoa] = useState('')
  const [locTrangThai, setLocTrangThai] = useState('all')
  const [locLoaiTour, setLocLoaiTour] = useState('all')
  const [phanTrang, setPhanTrang] = useState({ currentPage: 1, lastPage: 1, total: 0 })
  const [danhSachNgonNgu, setDanhSachNgonNgu] = useState([])
  const [danhSachChungChi, setDanhSachChungChi] = useState([])
  const [dangTaiDanhMuc, setDangTaiDanhMuc] = useState(false)
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

  const coLoc = locTrangThai !== 'all' || locLoaiTour !== 'all'

  const taiThongKeHdv = useCallback(async () => {
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
  }, [danhSachHdv.length])

  const taiDanhMucHdv = useCallback(async () => {
    setDangTaiDanhMuc(true)

    try {
      const [phanHoiNgonNgu, phanHoiChungChi] = await Promise.all([
        apiClient.get('/admin/languages'),
        apiClient.get('/admin/certificates'),
      ])

      setDanhSachNgonNgu(layMangDuLieuTuPhanHoi(phanHoiNgonNgu))
      setDanhSachChungChi(layMangDuLieuTuPhanHoi(phanHoiChungChi))
    } catch (error) {
      setLoi(layThongBaoLoi(error, 'Không tải được danh mục ngôn ngữ/chứng chỉ.'))
    } finally {
      setDangTaiDanhMuc(false)
    }
  }, [])

  const taiDanhSachHdv = useCallback(async (page = 1) => {
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

      if (locLoaiTour !== 'all') {
        params.certificate_type = locLoaiTour === 'international' ? 'Quốc tế' : 'Nội địa'
      }

      const phanHoi = await apiClient.get(endpoint, { params })
      setDanhSachHdv(layDanhSachGuideTuPhanHoi(phanHoi))
      setPhanTrang(layMetaTuPhanHoi(phanHoi))
    } catch (error) {
      setLoi(layThongBaoLoi(error, 'Không tải được danh sách hướng dẫn viên.'))
    } finally {
      setDangTai(false)
    }
  }, [coLoc, locLoaiTour, locTrangThai, tuKhoa])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      taiThongKeHdv()
      taiDanhMucHdv()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [taiDanhMucHdv, taiThongKeHdv])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      taiDanhSachHdv(1)
    }, 350)

    return () => window.clearTimeout(timer)
  }, [taiDanhSachHdv])

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

  function capNhatNgoaiNgu(index, truong, giaTri) {
    setFormHdv((formHienTai) => ({
      ...formHienTai,
      languages: formHienTai.languages.map((item, viTri) =>
        viTri === index
          ? {
              ...item,
              [truong]: giaTri,
            }
          : item,
      ),
    }))
    setLoiForm((loiHienTai) => ({ ...loiHienTai, languages: '' }))
  }

  function themNgoaiNgu() {
    setFormHdv((formHienTai) => ({
      ...formHienTai,
      languages: [...formHienTai.languages, taoDongNgoaiNgu()],
    }))
  }

  function xoaNgoaiNgu(index) {
    setFormHdv((formHienTai) => ({
      ...formHienTai,
      languages: formHienTai.languages.filter((_, viTri) => viTri !== index),
    }))
    setLoiForm((loiHienTai) => ({ ...loiHienTai, languages: '' }))
  }

  function capNhatChungChi(index, truong, giaTri) {
    setFormHdv((formHienTai) => ({
      ...formHienTai,
      experiences: formHienTai.experiences.map((item, viTri) =>
        viTri === index ? { ...item, [truong]: giaTri } : item,
      ),
    }))
    setLoiForm((loiHienTai) => ({ ...loiHienTai, experiences: '' }))
  }

  function themChungChi() {
    setFormHdv((formHienTai) => ({
      ...formHienTai,
      experiences: [...formHienTai.experiences, taoDongChungChi()],
    }))
  }

  function xoaChungChi(index) {
    setFormHdv((formHienTai) => ({
      ...formHienTai,
      experiences: formHienTai.experiences.filter((_, viTri) => viTri !== index),
    }))
    setLoiForm((loiHienTai) => ({ ...loiHienTai, experiences: '' }))
  }

  function moFormThemMoi() {
    setFormHdv({
      ...mauFormApiTrong,
      user_name: '',
      languages: [taoDongNgoaiNgu()],
      experiences: [taoDongChungChi()],
    })
    setIdDangSua(null)
    setLoi('')
    setLoiForm({})
    setThongBao('')
    setHienForm(true)
  }

  function moFormChinhSua(hdv) {
    setFormHdv({
      user_name: layTenNguoiDung(hdv),
      user_id: String(hdv.user_id || ''),
      certificate_type: hdv.certificate_type || '',
      experience_years: String(hdv.experience_years ?? ''),
      status: hdv.status || 'active',
      languages: chuyenNgoaiNguThanhForm(hdv.languages),
      experiences: chuyenKinhNghiemThanhForm(hdv.experiences),
    })
    setIdDangSua(hdv.id)
    setLoi('')
    setLoiForm({})
    setThongBao('')
    setHienForm(true)
  }

  function dongForm() {
    setFormHdv({
      ...mauFormApiTrong,
      user_name: '',
      languages: [],
      experiences: [],
    })
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

    const loiMoi = validateGuideForm(formHdv)

    if (Object.keys(loiMoi).length > 0) {
      setLoiForm(loiMoi)
      setDangLuu(false)
      return
    }

    try {
      const payload = taoGuidePayload(formHdv)

      if (!idDangSua) {
        const nguoiDung = await timNguoiDungTheoHoTen(formHdv.user_name)

        if (!nguoiDung?.id) {
          setLoiForm({ user_id: 'Không tìm thấy người dùng có họ và tên này.' })
          setDangLuu(false)
          return
        }

        payload.user_id = Number(nguoiDung.id)
      }

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
          <div className="guide-breadcrumb">ViVuGo / Quản Lý Hướng Dẫn Viên</div>
          <h1>Quản Lý Hướng Dẫn Viên</h1>
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
        <article className="guide-stat-card blue">
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
        <article className="guide-stat-card purple">
          <strong>{thongKeTheoTrangThai.locked || 0}</strong>
          <span>Tạm khóa</span>
          <small>Chưa thể nhận tour</small>
        </article>
      </div>

      <div className="guide-content-grid">
        <div className="guide-main-panel">
          <div className="guide-filter-bar">
            <label className="guide-search">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <input
                value={tuKhoa}
                aria-label="Tìm kiếm HĐV"
                placeholder="Tìm theo tên, email hoặc SĐT"
                onChange={(event) => setTuKhoa(event.target.value)}
              />
            </label>
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
            <select
              value={locLoaiTour}
              onChange={(event) => setLocLoaiTour(event.target.value)}
            >
              <option value="all">{nhanLoaiTour.all}</option>
              <option value="international">{nhanLoaiTour.international}</option>
              <option value="domestic">{nhanLoaiTour.domestic}</option>
            </select>
          </div>

          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Mã HDV</th>
                  <th>Họ Tên</th>
                  <th>Chuyên Môn</th>
                  <th>Kinh Nghiệm</th>
                  <th>Ngoại Ngữ</th>
                  <th>Tour Phụ Trách</th>
                  <th>Trạng Thái</th>
                  <th>Thao Tác</th>
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
                                <span key={ngoaiNgu.id || ngoaiNgu.language_id}>
                                  {layTenNgoaiNgu(ngoaiNgu)}
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
                Họ và tên
                <input
                  readOnly={Boolean(idDangSua)}
                  required
                  value={formHdv.user_name}
                  onChange={(event) => capNhatForm('user_name', event.target.value)}
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
                <div className="guide-repeat-list">
                  {formHdv.languages.map((ngoaiNgu, index) => {
                    return (
                      <div className="guide-repeat-row" key={`language-${index}`}>
                        <select
                          disabled={dangTaiDanhMuc}
                          value={ngoaiNgu.language_id}
                          onChange={(event) =>
                            capNhatNgoaiNgu(index, 'language_id', event.target.value)
                          }
                        >
                          <option value="">Chọn ngôn ngữ</option>
                          {danhSachNgonNgu.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                        <button type="button" onClick={() => xoaNgoaiNgu(index)}>
                          Xóa
                        </button>
                      </div>
                    )
                  })}
                  <button className="guide-repeat-add" type="button" onClick={themNgoaiNgu}>
                    Thêm ngôn ngữ
                  </button>
                </div>
                {loiForm.languages ? (
                  <span className="guide-field-error">{loiForm.languages}</span>
                ) : null}
              </label>
              <label className="guide-form-wide">
                Chứng chỉ/Kinh nghiệm
                <div className="guide-repeat-list">
                  {formHdv.experiences.map((chungChi, index) => (
                    <div className="guide-repeat-row certificate" key={`certificate-${index}`}>
                      <select
                        disabled={dangTaiDanhMuc}
                        value={chungChi.certificate_id}
                        onChange={(event) =>
                          capNhatChungChi(index, 'certificate_id', event.target.value)
                        }
                      >
                        <option value="">Chọn chứng chỉ</option>
                        {danhSachChungChi.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <input 
                        min="1900"
                        type="number"
                        value={chungChi.issued_year}
                        onChange={(event) =>
                          capNhatChungChi(index, 'issued_year', event.target.value)
                        }
                      />
                      <button type="button" onClick={() => xoaChungChi(index)}>
                        Xóa
                      </button>
                    </div>
                  ))}
                  <button className="guide-repeat-add" type="button" onClick={themChungChi}>
                    Thêm chứng chỉ
                  </button>
                </div>
                {loiForm.experiences ? (
                  <span className="guide-field-error">{loiForm.experiences}</span>
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
                    <span key={ngoaiNgu.id || ngoaiNgu.language_id}>
                      {layTenNgoaiNgu(ngoaiNgu)}
                    </span>
                  ))
                ) : (
                  <span>Chưa có</span>
                )}
              </div>
            </div>

            <div className="guide-detail-section">
              <h3>Chứng chỉ/Kinh nghiệm</h3>
              {Array.isArray(hdvChiTiet.experiences) && hdvChiTiet.experiences.length > 0 ? (
                <div className="guide-certificate-list">
                  {hdvChiTiet.experiences.map((kinhNghiem) => (
                    <div key={kinhNghiem.id || kinhNghiem.certificate_id}>
                      <strong>{layTenChungChi(kinhNghiem)}</strong>
                      <span>
                        {[layNoiCapChungChi(kinhNghiem), kinhNghiem.issued_year]
                          .filter(Boolean)
                          .join(' - ') || 'Chưa cập nhật nơi cấp'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="guide-empty-text">Chưa có chứng chỉ/kinh nghiệm.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default GuideManagementApiPage
