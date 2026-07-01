import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../services/apiClient'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { getAccountRoles, searchAccounts } from '../../services/adminAccountApi'
import Icon from '../../components/customer/Icon'
import '../../styles/support-staff.css'

const DEFAULT_FORM = {
  user_id: '',
  specialization_id: '',
  experience_years: '',
  status: '',
  languages: [],
  experiences: [],
}

const EMPTY_LANGUAGE_ROW = { language_id: '', level_id: '' }
const EMPTY_CERTIFICATE_ROW = { certificate_id: '', issued_year: '' }
const danhSachTrangThaiApi = ['active', 'inactive', 'locked']
const nhanTrangThai = {
  active: 'Đang hoạt động',
  inactive: 'Ngừng hoạt động',
  locked: 'Tạm khóa',
}

function unwrapList(response) {
  const payload = response?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

function unwrapMeta(response) {
  const payload = response?.data?.data
  if (!payload || Array.isArray(payload)) {
    return { currentPage: 1, lastPage: 1, total: 0 }
  }

  return {
    currentPage: payload.current_page || 1,
    lastPage: payload.last_page || 1,
    total: payload.total || 0,
  }
}

function getErrorMessage(error, fallback) {
  const errors = error.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }
  return error.response?.data?.message || fallback
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function isGuideRole(role) {
  const name = normalizeText(role?.name)
  const description = normalizeText(role?.description)
  return (
    name.includes('tour guide') ||
    name.includes('hdv') ||
    description.includes('huong dan vien') ||
    description.includes('guide')
  )
}

function layTenNguoiDung(hdv) {
  return hdv.user?.full_name || hdv.user?.name || 'Chưa có tên'
}

function layTenNguoiDungTaiKhoan(nguoiDung) {
  return nguoiDung.full_name || nguoiDung.name || nguoiDung.email || 'Chua có tên'
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
  const tenNgonNgu = ngoaiNgu.language?.name || ngoaiNgu.language_name || ngoaiNgu.language || '-'
  const tenTrinhDo =
    ngoaiNgu.level?.level_name || ngoaiNgu.level?.name || ngoaiNgu.level_name || ''
  return tenTrinhDo ? `${tenNgonNgu} (${tenTrinhDo})` : tenNgonNgu
}

function layTenChungChi(kinhNghiem) {
  return kinhNghiem.certificate?.name || kinhNghiem.certificate_name || '-'
}

function layNoiCapChungChi(kinhNghiem) {
  return kinhNghiem.certificate?.issued_by || kinhNghiem.issued_by || ''
}

function layTenChuyenMon(chuyenMon) {
  return chuyenMon.name || chuyenMon.specialization_name || chuyenMon.title || '-'
}

function layNhanChuyenMon(hdv) {
  const chuyenMon = Array.isArray(hdv.specializations) ? hdv.specializations : []
  if (chuyenMon.length === 0) {
    return 'Chưa cập nhật chuyên môn'
  }
  return chuyenMon.map(layTenChuyenMon).join(', ')
}

function layDanhSachTrinhDo(danhSachNgonNgu, languageId) {
  const ngonNguDaChon = danhSachNgonNgu.find((item) => String(item.id) === String(languageId))
  if (!languageId) {
    return []
  }
  if (Array.isArray(ngonNguDaChon?.levels) && ngonNguDaChon.levels.length > 0) {
    return Array.from(
      new Map(
        ngonNguDaChon.levels.map((level) => [
          String(level.id),
          level,
        ]),
      ).values(),
    )
  }
  return []
}

function laySoTourPhuTrach(hdv) {
  return hdv.assigned_tours_count || hdv.tours_count || hdv.current_tours_count || 0
}

function taoDongNgoaiNgu() {
  return { ...EMPTY_LANGUAGE_ROW }
}

function taoDongChungChi() {
  return { ...EMPTY_CERTIFICATE_ROW }
}

function chuyenNgoaiNguThanhForm(languages = []) {
  return languages.map((item) => ({
    language_id: String(item.language_id || item.language?.id || ''),
    level_id: String(item.level_id || item.level?.id || ''),
  }))
}

function chuyenKinhNghiemThanhForm(experiences = []) {
  return experiences.map((item) => ({
    certificate_id: String(item.certificate_id || item.certificate?.id || ''),
    issued_year: item.issued_year ? String(item.issued_year) : '',
  }))
}

function taoGuidePayload(formHdv) {
  return {
    user_id: formHdv.user_id ? Number(formHdv.user_id) : null,
    specialization_ids: formHdv.specialization_id ? [Number(formHdv.specialization_id)] : [],
    experience_years: Number(formHdv.experience_years),
    status: formHdv.status,
    languages: formHdv.languages
      .filter((item) => item.language_id)
      .map((item) => ({
        language_id: Number(item.language_id),
        level_id: item.level_id ? Number(item.level_id) : null,
      })),
    experiences: formHdv.experiences
      .filter((item) => item.certificate_id)
      .map((item) => ({
        certificate_id: Number(item.certificate_id),
        issued_year: item.issued_year ? Number(item.issued_year) : null,
      })),
  }
}

function layDanhSachIdUserDaCoHdv(danhSachHdv) {
  return new Set(
    danhSachHdv
      .map((hdv) => String(hdv.user_id || hdv.user?.id || ''))
      .filter(Boolean),
  )
}

function validateGuideForm(formHdv) {
  const loiMoi = {}
  const experienceYears = Number(formHdv.experience_years)
  const namHienTai = new Date().getFullYear()
  const languages = Array.isArray(formHdv.languages) ? formHdv.languages : []
  const experiences = Array.isArray(formHdv.experiences) ? formHdv.experiences : []

  if (!formHdv.user_id) {
    loiMoi.user_id = 'Vui lòng chọn tài khoản HDV.'
  }

  if (!formHdv.specialization_id) {
    loiMoi.specialization_id = 'Vui lòng chọn chuyên môn.'
  }

  if (
    formHdv.experience_years === '' ||
    !Number.isInteger(experienceYears) ||
    experienceYears < 0
  ) {
    loiMoi.experience_years = 'Số năm kinh nghiệm phải là số nguyên từ 0.'
  }

  if (!danhSachTrangThaiApi.includes(formHdv.status)) {
    loiMoi.status = 'Vui lòng chọn trạng thái.'
  }
  if (languages.length === 0) {
    loiMoi.languages = 'Vui lòng thêm ít nhất một ngôn ngữ.'
  }

  const ngoaiNguKhongHopLe = languages.find((item) => !item.language_id)

  if (ngoaiNguKhongHopLe) {
    loiMoi.languages = 'Mỗi dòng ngoại ngữ cần chọn ngôn ngữ.'
  }
  const thieuTrinhDo = languages.find((item) => item.language_id && !item.level_id)

  if (thieuTrinhDo) {
    loiMoi.languages = 'Mỗi dòng ngoại ngữ cần chọn trình độ.'
  }

  const trungNgoaiNgu =
    new Set(languages.filter((item) => item.language_id).map((item) => item.language_id)).size !==
    languages.filter((item) => item.language_id).length

  if (trungNgoaiNgu) {
    loiMoi.languages = 'Không chọn trùng ngôn ngữ.'
  }

  if (experiences.length === 0) {
    loiMoi.experiences = 'Vui lòng thêm ít nhất một chứng chỉ.'
  }

  const kinhNghiemKhongHopLe = experiences.find(
    (item) =>
      !item.certificate_id ||
      !item.issued_year ||
      !Number.isInteger(Number(item.issued_year)) ||
      Number(item.issued_year) < 1900 ||
      Number(item.issued_year) > namHienTai,
  )

  if (kinhNghiemKhongHopLe) {
    loiMoi.experiences = 'Mỗi dòng chứng chỉ cần chọn chứng chỉ và năm cấp hợp lệ.'
  }

  const trungChungChi =
    new Set(
      experiences.filter((item) => item.certificate_id).map((item) => item.certificate_id),
    ).size !== experiences.filter((item) => item.certificate_id).length

  if (trungChungChi) {
    loiMoi.experiences = 'Không chọn trùng chứng chỉ.'
  }

  return loiMoi
}

function GuideManagementPage() {
  const [danhSachHdv, setDanhSachHdv] = useState([])
  const [thongKeHdv, setThongKeHdv] = useState({ total: 0, active: 0, inactive: 0, locked: 0 })
  const [tuKhoa, setTuKhoa] = useState('')
  const [locTrangThai, setLocTrangThai] = useState('all')
  const [locChuyenMon, setLocChuyenMon] = useState('all')
  const [phanTrang, setPhanTrang] = useState({ currentPage: 1, lastPage: 1, total: 0 })
  const [danhSachNgonNgu, setDanhSachNgonNgu] = useState([])
  const [danhSachChungChi, setDanhSachChungChi] = useState([])
  const [danhSachChuyenMon, setDanhSachChuyenMon] = useState([])
  const [danhSachTaiKhoanHdv, setDanhSachTaiKhoanHdv] = useState([])
  const [formHdv, setFormHdv] = useState(DEFAULT_FORM)
  const [idDangSua, setIdDangSua] = useState(null)
  const [hdvChiTiet, setHdvChiTiet] = useState(null)
  const [dangTaiChiTiet, setDangTaiChiTiet] = useState(false)
  const [hienForm, setHienForm] = useState(false)
  const [dangTai, setDangTai] = useState(false)
  const [dangLuu, setDangLuu] = useState(false)
  const [loi, setLoi] = useState('')
  const [loiForm, setLoiForm] = useState({})
  const [thongBao, setThongBao] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const coLoc = locTrangThai !== 'all' || locChuyenMon !== 'all'
  const thongKeTheoTrangThai = useMemo(
    () => ({
      active: thongKeHdv.active || 0,
      inactive: thongKeHdv.inactive || 0,
      locked: thongKeHdv.locked || 0,
    }),
    [thongKeHdv],
  )
  const idUserDaCoHdv = useMemo(() => layDanhSachIdUserDaCoHdv(danhSachHdv), [danhSachHdv])

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
    try {
      const [phanHoiNgonNgu, phanHoiChungChi, phanHoiChuyenMon, phanHoiRoles] = await Promise.all([
        apiClient.get('/admin/languages'),
        apiClient.get('/admin/certificates'),
        apiClient.get('/admin/guide-specializations'),
        getAccountRoles().catch(() => []),
      ])
      const dsRoles = Array.isArray(phanHoiRoles) ? phanHoiRoles : []
      const roleHDV = dsRoles.find(isGuideRole) || null
      setDanhSachNgonNgu(unwrapList(phanHoiNgonNgu))
      setDanhSachChungChi(unwrapList(phanHoiChungChi))
      setDanhSachChuyenMon(unwrapList(phanHoiChuyenMon))
      const danhSachTaiKhoan = roleHDV?.id ? await searchAccounts({ role_id: roleHDV.id }) : []
      setDanhSachTaiKhoanHdv(Array.isArray(danhSachTaiKhoan) ? danhSachTaiKhoan : [])
    } catch (error) {
      setLoi(getErrorMessage(error, 'Không tải được danh mục ngôn ngữ/chứng chỉ/chuyên môn.'))
    }
  }, [])
  const taiDanhSachHdv = useCallback(
    async (page = 1) => {
      setDangTai(true)
      setLoi('')
      try {
        const params = { page, per_page: 10 }
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
        if (locChuyenMon !== 'all') {
          params.specialization_id = locChuyenMon
        }
        const phanHoi = await apiClient.get(endpoint, { params })
        setDanhSachHdv(unwrapList(phanHoi))
        setPhanTrang(unwrapMeta(phanHoi))
      } catch (error) {
        setLoi(getErrorMessage(error, 'Không tải được danh sách hướng dẫn viên.'))
      } finally {
        setDangTai(false)
      }
    },
    [coLoc, locChuyenMon, locTrangThai, tuKhoa],
  )
  function chonThongKeTrangThai(trangThai) {
    if (trangThai === 'all') {
      setLocTrangThai('all')
      setLocChuyenMon('all')
      setPhanTrang((current) => ({ ...current, currentPage: 1 }))
      return
    }
    setLocTrangThai(trangThai)
    setPhanTrang((current) => ({ ...current, currentPage: 1 }))
  }
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
              ...(truong === 'language_id' ? { level_id: '' } : {}),
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
      ...DEFAULT_FORM,
      status: '',
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
      user_id: String(hdv.user_id || ''),
      specialization_id: String(hdv.specializations?.[0]?.id || ''),
      experience_years: String(hdv.experience_years ?? ''),
      status: hdv.status || '',
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
    setFormHdv(DEFAULT_FORM)
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
      setLoi(getErrorMessage(error, 'Không tải được chi tiết hướng dẫn viên.'))
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
      const phanHoi = idDangSua
        ? await apiClient.put(`/admin/guides/${idDangSua}`, payload)
        : await apiClient.post('/admin/guides', payload)
      await taiDanhSachHdv(phanTrang.currentPage)
      await taiThongKeHdv()
      dongForm()
      setThongBao(
        phanHoi.data?.message ||
          (idDangSua ? 'Cập nhật hướng dẫn viên thành công.' : 'Thêm hướng dẫn viên thành công.'),
      )
    } catch (error) {
      setLoi(getErrorMessage(error, 'Không lưu được thông tin hướng dẫn viên.'))
    } finally {
      setDangLuu(false)
    }
  }
  async function confirmDelete() {
    if (!deleteTarget) return

    setLoi('')
    setThongBao('')
    try {
      const phanHoi = await apiClient.delete(`/admin/guides/${deleteTarget.id}`)
      await taiDanhSachHdv(phanTrang.currentPage)
      await taiThongKeHdv()
      setThongBao(phanHoi.data?.message || 'Đã chuyển hướng dẫn viên vào thùng rác.')
      setDeleteTarget(null)
    } catch (error) {
      setLoi(getErrorMessage(error, 'Không xóa được hướng dẫn viên.'))
    }
  }
  return (
    <section className="guide-page">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Quản Lý Hướng Dẫn Viên']}
        title="Quản Lý Hướng Dẫn Viên"
        description="Quản lý và phân công hướng dẫn viên du lịch."
        actions={
          <>
            <Link className="guide-trash-button" to="/admin/guides/trash">
              <Icon name="trash" size={16} />
              Thùng rác
            </Link>
            <button className="guide-add-button" type="button" onClick={moFormThemMoi}>
              <Icon name="plus" size={16} />
              Thêm HDV
            </button>
          </>
        }
      />
      {thongBao ? (
        <div className="support-toast success">
          <div>
            <strong>Thành công</strong>
            <p>{thongBao}</p>
          </div>
          <button type="button" onClick={() => setThongBao('')}>
            ×
          </button>
        </div>
      ) : null}
      {loi ? (
        <div className="support-toast error">
          <div>
            <strong>Có lỗi xảy ra</strong>
            <p>{loi}</p>
          </div>
          <button type="button" onClick={() => setLoi('')}>
            ×
          </button>
        </div>
      ) : null}
      <div className="guide-stat-grid">
        <button
          className={`guide-stat-card blue ${locTrangThai === 'all' && locChuyenMon === 'all' ? 'is-active' : ''}`}
          type="button"
          onClick={() => chonThongKeTrangThai('all')}
        >
          <strong>{thongKeHdv.total || phanTrang.total || danhSachHdv.length}</strong>
          <span>Tổng HDV</span>
          <small>Toàn bộ HDV</small>
        </button>
        <button
          className={`guide-stat-card green ${locTrangThai === 'active' ? 'is-active' : ''}`}
          type="button"
          onClick={() => chonThongKeTrangThai('active')}
        >
          <strong>{thongKeTheoTrangThai.active || 0}</strong>
          <span>Đang hoạt động</span>
          <small>Sẵn sàng nhận tour</small>
        </button>
        <button
          className={`guide-stat-card amber ${locTrangThai === 'inactive' ? 'is-active' : ''}`}
          type="button"
          onClick={() => chonThongKeTrangThai('inactive')}
        >
          <strong>{thongKeTheoTrangThai.inactive || 0}</strong>
          <span>Ngừng hoạt động</span>
          <small>Tạm ngừng nhận tour</small>
        </button>
        <button
          className={`guide-stat-card purple ${locTrangThai === 'locked' ? 'is-active' : ''}`}
          type="button"
          onClick={() => chonThongKeTrangThai('locked')}
        >
          <strong>{thongKeTheoTrangThai.locked || 0}</strong>
          <span>Tạm khóa</span>
          <small>Tạm ẩn HDV</small>
        </button>
      </div>
      <div className="guide-content-grid">
        <div className="guide-main-panel">
          <div className="guide-filter-bar">
            <label className="guide-search">
              <Icon name="search" size={18} />
              <input
                aria-label="Tìm kiếm HDV"
                value={tuKhoa}
                placeholder="Tìm theo mã HDV hoặc tên"
                onChange={(event) => {
                  setTuKhoa(event.target.value)
                  setPhanTrang((current) => ({ ...current, currentPage: 1 }))
                }}
              />
            </label>
            <select
              value={locTrangThai}
              onChange={(event) => {
                setLocTrangThai(event.target.value)
                setPhanTrang((current) => ({ ...current, currentPage: 1 }))
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              {danhSachTrangThaiApi.map((trangThai) => (
                <option key={trangThai} value={trangThai}>
                  {nhanTrangThai[trangThai]}
                </option>
              ))}
            </select>
            <select
              value={locChuyenMon}
              onChange={(event) => {
                setLocChuyenMon(event.target.value)
                setPhanTrang((current) => ({ ...current, currentPage: 1 }))
              }}
            >
              <option value="all">Tất cả chuyên môn</option>
              {danhSachChuyenMon.map((item) => (
                <option key={item.id} value={item.id}>
                  {layTenChuyenMon(item)}
                </option>
              ))}
            </select>
          </div>
          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Mã HDV</th>
                  <th>Họ và tên</th>
                  <th>Chuyên môn</th>
                  <th>Kinh nghiệm</th>
                  <th>Ngoại ngữ</th>
                  <th>Tour phụ trách</th>
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
                          <strong className="guide-code">{hdv.guide_code || '-'}</strong>
                        </td>
                        <td>
                          <strong>{layTenNguoiDung(hdv)}</strong>
                          <span>{hdv.user?.email || 'Chua có email'}</span>
                        </td>
                        <td>
                          <span>{layNhanChuyenMon(hdv)}</span>
                        </td>
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
                              <span>Chua có</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <strong className="guide-tour-count">{laySoTourPhuTrach(hdv)} tour</strong>
                        </td>
                        <td>
                          <span className={`guide-status ${hdv.status}`}>
                            {nhanTrangThai[hdv.status] || hdv.status}
                          </span>
                        </td>
                        <td>
                          <div className="guide-actions">
                            <button
                              className="guide-action-icon"
                              type="button"
                              title="Xem chi tiết"
                              aria-label="Xem chi tiết"
                              onClick={() => moChiTiet(hdv)}
                            >
                              <Icon name="eye" size={16} />
                            </button>
                            <button
                              className="guide-action-icon"
                              type="button"
                              title="Chỉnh sửa"
                              aria-label="Chỉnh sửa"
                              onClick={() => moFormChinhSua(hdv)}
                            >
                              <Icon name="edit" size={16} />
                            </button>
                            <button
                              className="guide-action-icon danger"
                              type="button"
                              title="Xóa"
                              aria-label="Xóa"
                              onClick={() => setDeleteTarget(hdv)}
                            >
                              <Icon name="trash" size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
          <div className="guide-pagination">
            <button
              disabled={phanTrang.currentPage <= 1 || dangTai}
              type="button"
              onClick={() => taiDanhSachHdv(phanTrang.currentPage - 1)}
              aria-label="Trang trước"
            >
              ←
            </button>
            <span>
              {phanTrang.currentPage} / {phanTrang.lastPage}
            </span>
            <button
              disabled={phanTrang.currentPage >= phanTrang.lastPage || dangTai}
              type="button"
              onClick={() => taiDanhSachHdv(phanTrang.currentPage + 1)}
              aria-label="Trang sau"
            >
              →
            </button>
          </div>
        </div>
      {hienForm ? (
        <div className="guide-modal-backdrop">
          <form className="guide-modal" onSubmit={luuHuongDanVien} noValidate>
            <div className="guide-modal-header">
              <div>
                <h2>{idDangSua ? 'Sửa hướng dẫn viên' : 'Thêm hướng dẫn viên'}</h2>
                <p>Thông tin tài khoản hướng dẫn viên</p>
              </div>
              <button type="button" onClick={dongForm}>
                Đóng
              </button>
            </div>
            <div className="guide-form-grid">
              <label>
                Họ và tên
                <select
                  required
                  value={formHdv.user_id}
                  disabled={Boolean(idDangSua)}
                  onChange={(event) => capNhatForm('user_id', event.target.value)}
                >
                  <option value="" disabled>
                    Chọn HDV
                  </option>
                  {danhSachTaiKhoanHdv
                    .filter((user) => {
                      if (idDangSua && String(user.id) === String(formHdv.user_id)) {
                        return true
                      }
                      return !idUserDaCoHdv.has(String(user.id))
                    })
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {layTenNguoiDungTaiKhoan(user)}
                      </option>
                    ))}
                </select>
                {loiForm.user_id ? <span className="guide-field-error">{loiForm.user_id}</span> : null}
              </label>
              <label>
                Chuyên môn
                <select
                  required
                  value={formHdv.specialization_id}
                  onChange={(event) => capNhatForm('specialization_id', event.target.value)}
                >
                  <option value="" disabled>
                    Chọn chuyên môn
                  </option>
                  {danhSachChuyenMon.map((item) => (
                    <option key={item.id} value={item.id}>
                      {layTenChuyenMon(item)}
                    </option>
                  ))}
                </select>
                {loiForm.specialization_id ? (
                  <span className="guide-field-error">{loiForm.specialization_id}</span>
                ) : null}
              </label>
              <label>
                Số năm kinh nghiệm
                <input
                  min="0"
                  required
                  type="number"
                  value={formHdv.experience_years}
                  onChange={(event) => capNhatForm('experience_years', event.target.value)}
                />
                {loiForm.experience_years ? (
                  <span className="guide-field-error">{loiForm.experience_years}</span>
                ) : null}
              </label>
              <label>
                Trạng thái
                <select value={formHdv.status} onChange={(event) => capNhatForm('status', event.target.value)}>
                  <option value="" disabled>
                    Chọn trạng thái
                  </option>
                  {danhSachTrangThaiApi.map((trangThai) => (
                    <option key={trangThai} value={trangThai}>
                      {nhanTrangThai[trangThai]}
                    </option>
                  ))}
                </select>
                {loiForm.status ? <span className="guide-field-error">{loiForm.status}</span> : null}
              </label>
              <label className="guide-form-wide">
                Ngoại ngữ
                <div className="guide-repeat-list">
                  {formHdv.languages.map((ngoaiNgu, index) => {
                    const danhSachTrinhDo = layDanhSachTrinhDo(danhSachNgonNgu, ngoaiNgu.language_id)
                    const idsNgonNguDaChon = formHdv.languages
                      .filter((_, viTri) => viTri !== index)
                      .map((item) => item.language_id)
                    return (
                      <div className="guide-repeat-row" key={`language-${index}`}>
                        <select
                          value={ngoaiNgu.language_id}
                          onChange={(event) => capNhatNgoaiNgu(index, 'language_id', event.target.value)}
                        >
                          <option value="" disabled>
                            Chọn ngôn ngữ
                          </option>
                          {danhSachNgonNgu
                            .filter((item) => !idsNgonNguDaChon.includes(String(item.id)))
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                        </select>
                        <select
                          disabled={!ngoaiNgu.language_id}
                          value={ngoaiNgu.level_id}
                          onChange={(event) => capNhatNgoaiNgu(index, 'level_id', event.target.value)}
                        >
                          <option value="" disabled>
                            Chọn trình độ
                          </option>
                          {danhSachTrinhDo.map((level) => (
                            <option key={level.id} value={level.id}>
                              {level.level_name || level.name}
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
                {loiForm.languages ? <span className="guide-field-error">{loiForm.languages}</span> : null}
              </label>
              <label className="guide-form-wide">
                Chứng chỉ
                <div className="guide-repeat-list">
                  {formHdv.experiences.map((chungChi, index) => {
                    const idsChungChiDaChon = formHdv.experiences
                      .filter((_, viTri) => viTri !== index)
                      .map((item) => item.certificate_id)
                    return (
                      <div className="guide-repeat-row certificate" key={`certificate-${index}`}>
                        <select
                          value={chungChi.certificate_id}
                          onChange={(event) => capNhatChungChi(index, 'certificate_id', event.target.value)}
                        >
                          <option value="" disabled>
                            Chọn chứng chỉ
                          </option>
                          {danhSachChungChi
                            .filter((item) => !idsChungChiDaChon.includes(String(item.id)))
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                        </select>
                        <input
                          min="1900"
                          placeholder="Năm cấp"
                          type="number"
                          value={chungChi.issued_year}
                          onChange={(event) => capNhatChungChi(index, 'issued_year', event.target.value)}
                        />
                        <button type="button" onClick={() => xoaChungChi(index)}>
                          Xóa
                        </button>
                      </div>
                    )
                  })}
                  <button className="guide-repeat-add" type="button" onClick={themChungChi}>
                    Thêm chứng chỉ
                  </button>
                </div>
                {loiForm.experiences ? <span className="guide-field-error">{loiForm.experiences}</span> : null}
              </label>
            </div>
            <div className="guide-modal-actions">
              <button type="button" onClick={dongForm}>
                Hủy
              </button>
              <button disabled={dangLuu} type="submit">
                {dangLuu ? 'Đang lưu...' : idDangSua ? 'Lưu thay đổi' : 'Thêm HDV'}
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
                <p>{layNhanChuyenMon(hdvChiTiet)}</p>
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
                    <span key={ngoaiNgu.id || ngoaiNgu.language_id}>{layTenNgoaiNgu(ngoaiNgu)}</span>
                  ))
                ) : (
                  <span>Chua có</span>
                )}
              </div>
            </div>
            <div className="guide-detail-section">
              <h3>Chứng chỉ</h3>
              {Array.isArray(hdvChiTiet.experiences) && hdvChiTiet.experiences.length > 0 ? (
                <div className="guide-certificate-list">
                  {hdvChiTiet.experiences.map((kinhNghiem) => (
                    <div key={kinhNghiem.id || kinhNghiem.certificate_id}>
                      <strong>{layTenChungChi(kinhNghiem)}</strong>
                      <span>
                        {[layNoiCapChungChi(kinhNghiem), kinhNghiem.issued_year]
                          .filter(Boolean)
                          .join(' - ') || 'Chưa cập nhật năm cấp'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="guide-empty-text">Chưa có chứng chỉ.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {deleteTarget ? (
        <div
          className="support-modal-backdrop"
          role="presentation"
          onMouseDown={() => setDeleteTarget(null)}
        >
          <div
            className="support-delete-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="support-delete-icon">!</div>
            <h3>Xóa hướng dẫn viên?</h3>
            <p>
              Bạn có chắc muốn xóa <strong>{layTenNguoiDung(deleteTarget)}</strong> khỏi hệ thống?
              Thao tác này sẽ chuyển hướng dẫn viên vào thùng rác.
            </p>
            <div className="support-modal-actions">
              <button type="button" onClick={() => setDeleteTarget(null)}>
                Hủy
              </button>
              <button className="danger primary" type="button" onClick={confirmDelete}>
                Xóa
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </section>
  )
}
export default GuideManagementPage
