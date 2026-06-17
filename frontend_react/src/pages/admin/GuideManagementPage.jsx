import { useMemo, useState } from 'react'

const danhSachHuongDanVienMau = [
  {
    id: 1,
    maHdv: 'HDV001',
    hoTen: 'Trần Văn Hùng',
    email: 'hung.hdv@vivugo.vn',
    soDienThoai: '0901234567',
    khuVuc: 'Đà Nẵng',
    soNamKinhNghiem: 8,
    trinhDoNgoaiNgu: 'Quốc tế',
    ngoaiNgu: ['Tiếng Anh', 'Tiếng Pháp'],
    soTourPhuTrach: 3,
    danhGia: 4.9,
    trangThai: 'Đang dẫn tour',
  },
  {
    id: 2,
    maHdv: 'HDV002',
    hoTen: 'Nguyễn Thị Mai',
    email: 'mai.hdv@vivugo.vn',
    soDienThoai: '0912345678',
    khuVuc: 'Hà Nội',
    soNamKinhNghiem: 5,
    trinhDoNgoaiNgu: 'Nội địa',
    ngoaiNgu: ['Tiếng Anh', 'Tiếng Trung'],
    soTourPhuTrach: 2,
    danhGia: 4.8,
    trangThai: 'Đang dẫn tour',
  },
  {
    id: 3,
    maHdv: 'HDV003',
    hoTen: 'Lê Minh Tuấn',
    email: 'tuan.hdv@vivugo.vn',
    soDienThoai: '0987654321',
    khuVuc: 'TP Hồ Chí Minh',
    soNamKinhNghiem: 6,
    trinhDoNgoaiNgu: 'Quốc tế',
    ngoaiNgu: ['Tiếng Anh', 'Tiếng Nhật'],
    soTourPhuTrach: 1,
    danhGia: 4.7,
    trangThai: 'Đang dẫn tour',
  },
  {
    id: 4,
    maHdv: 'HDV004',
    hoTen: 'Phạm Gia Bảo',
    email: 'bao.hdv@vivugo.vn',
    soDienThoai: '0934567890',
    khuVuc: 'Phú Quốc',
    soNamKinhNghiem: 2,
    trinhDoNgoaiNgu: 'Cơ bản',
    ngoaiNgu: ['Tiếng Anh'],
    soTourPhuTrach: 0,
    danhGia: 4.5,
    trangThai: 'Sẵn sàng',
  },
  {
    id: 5,
    maHdv: 'HDV005',
    hoTen: 'Võ Ngọc Anh',
    email: 'anh.hdv@vivugo.vn',
    soDienThoai: '0967890123',
    khuVuc: 'Nha Trang',
    soNamKinhNghiem: 4,
    trinhDoNgoaiNgu: 'Nội địa',
    ngoaiNgu: ['Tiếng Anh', 'Tiếng Hàn'],
    soTourPhuTrach: 0,
    danhGia: 4.6,
    trangThai: 'Nghỉ phép',
  },
]

const mauFormTrong = {
  maHdv: '',
  hoTen: '',
  email: '',
  soDienThoai: '',
  khuVuc: '',
  soNamKinhNghiem: '',
  trinhDoNgoaiNgu: 'Nội địa',
  ngoaiNgu: '',
  soTourPhuTrach: '',
  danhGia: '',
  trangThai: 'Sẵn sàng',
}

const danhSachTrangThai = ['Đang dẫn tour', 'Sẵn sàng', 'Nghỉ phép']
const danhSachTrinhDoNgoaiNgu = ['Cơ bản', 'Nội địa', 'Quốc tế']

function taoChuCaiDaiDien(hoTen) {
  return hoTen
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((tu) => tu[0])
    .join('')
    .toUpperCase()
}

function GuideManagementPage() {
  const [danhSachHdv, setDanhSachHdv] = useState(danhSachHuongDanVienMau)
  const [tuKhoa, setTuKhoa] = useState('')
  const [locTrangThai, setLocTrangThai] = useState('Tất cả')
  const [locTrinhDoNgoaiNgu, setLocTrinhDoNgoaiNgu] = useState('Tất cả')
  const [locSoNamKinhNghiem, setLocSoNamKinhNghiem] = useState('Tất cả')
  const [formHdv, setFormHdv] = useState(mauFormTrong)
  const [idDangSua, setIdDangSua] = useState(null)
  const [hienForm, setHienForm] = useState(false)

  const danhSachDaLoc = useMemo(() => {
    const tuKhoaChuanHoa = tuKhoa.trim().toLowerCase()

    return danhSachHdv.filter((hdv) => {
      const khopTuKhoa =
        !tuKhoaChuanHoa ||
        hdv.hoTen.toLowerCase().includes(tuKhoaChuanHoa) ||
        hdv.email.toLowerCase().includes(tuKhoaChuanHoa) ||
        hdv.soDienThoai.includes(tuKhoaChuanHoa) ||
        hdv.maHdv.toLowerCase().includes(tuKhoaChuanHoa)

      const khopTrangThai =
        locTrangThai === 'Tất cả' || hdv.trangThai === locTrangThai

      const khopTrinhDo =
        locTrinhDoNgoaiNgu === 'Tất cả' ||
        hdv.trinhDoNgoaiNgu === locTrinhDoNgoaiNgu

      const khopKinhNghiem =
        locSoNamKinhNghiem === 'Tất cả' ||
        (locSoNamKinhNghiem === 'Dưới 3 năm' && hdv.soNamKinhNghiem < 3) ||
        (locSoNamKinhNghiem === '3 - 5 năm' &&
          hdv.soNamKinhNghiem >= 3 &&
          hdv.soNamKinhNghiem <= 5) ||
        (locSoNamKinhNghiem === 'Trên 5 năm' && hdv.soNamKinhNghiem > 5)

      return khopTuKhoa && khopTrangThai && khopTrinhDo && khopKinhNghiem
    })
  }, [
    danhSachHdv,
    locSoNamKinhNghiem,
    locTrangThai,
    locTrinhDoNgoaiNgu,
    tuKhoa,
  ])

  const thongKeTheoTrangThai = useMemo(
    () =>
      danhSachTrangThai.reduce((ketQua, trangThai) => {
        ketQua[trangThai] = danhSachHdv.filter(
          (hdv) => hdv.trangThai === trangThai,
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
  }

  function moFormThemMoi() {
    setFormHdv({
      ...mauFormTrong,
      maHdv: `HDV${String(danhSachHdv.length + 1).padStart(3, '0')}`,
    })
    setIdDangSua(null)
    setHienForm(true)
  }

  function moFormChinhSua(hdv) {
    setFormHdv({
      ...hdv,
      soNamKinhNghiem: String(hdv.soNamKinhNghiem),
      soTourPhuTrach: String(hdv.soTourPhuTrach),
      danhGia: String(hdv.danhGia),
      ngoaiNgu: hdv.ngoaiNgu.join(', '),
    })
    setIdDangSua(hdv.id)
    setHienForm(true)
  }

  function dongForm() {
    setFormHdv(mauFormTrong)
    setIdDangSua(null)
    setHienForm(false)
  }

  function luuHuongDanVien(event) {
    event.preventDefault()

    const hdvMoi = {
      ...formHdv,
      id: idDangSua || Date.now(),
      soNamKinhNghiem: Number(formHdv.soNamKinhNghiem) || 0,
      soTourPhuTrach: Number(formHdv.soTourPhuTrach) || 0,
      danhGia: Number(formHdv.danhGia) || 0,
      ngoaiNgu: formHdv.ngoaiNgu
        .split(',')
        .map((ngoaiNgu) => ngoaiNgu.trim())
        .filter(Boolean),
    }

    setDanhSachHdv((danhSachHienTai) => {
      if (idDangSua) {
        return danhSachHienTai.map((hdv) =>
          hdv.id === idDangSua ? hdvMoi : hdv,
        )
      }

      return [hdvMoi, ...danhSachHienTai]
    })
    dongForm()
  }

  function xoaHuongDanVien(id) {
    setDanhSachHdv((danhSachHienTai) =>
      danhSachHienTai.filter((hdv) => hdv.id !== id),
    )
  }

  return (
    <section className="guide-page">
      <div className="guide-heading">
        <div>
          <div className="guide-breadcrumb">ViVuGo / Hướng Dẫn Viên</div>
          <h1>Hướng Dẫn Viên</h1>
          <p>Quản lý hồ sơ, phân công và trạng thái hướng dẫn viên du lịch.</p>
        </div>
        <button className="guide-add-button" type="button" onClick={moFormThemMoi}>
          <span aria-hidden="true">+</span>
          Thêm HDV
        </button>
      </div>

      <div className="guide-stat-grid">
        <article className="guide-stat-card">
          <strong>{danhSachHdv.length}</strong>
          <span>Tổng HDV</span>
          <small>Toàn hệ thống</small>
        </article>
        <article className="guide-stat-card blue">
          <strong>{thongKeTheoTrangThai['Đang dẫn tour']}</strong>
          <span>Đang Dẫn Tour</span>
          <small>Hiện tại</small>
        </article>
        <article className="guide-stat-card green">
          <strong>{thongKeTheoTrangThai['Sẵn sàng']}</strong>
          <span>Sẵn Sàng</span>
          <small>Chưa có tour</small>
        </article>
        <article className="guide-stat-card amber">
          <strong>{thongKeTheoTrangThai['Nghỉ phép']}</strong>
          <span>Nghỉ Phép</span>
          <small>Tạm vắng</small>
        </article>
      </div>

      <div className="guide-content-grid">
        <div className="guide-main-panel">
          <div className="guide-filter-bar">
            <input
              value={tuKhoa}
              placeholder="Tìm theo tên, SĐT, email hoặc mã HDV..."
              onChange={(event) => setTuKhoa(event.target.value)}
            />
            <select
              value={locSoNamKinhNghiem}
              onChange={(event) => setLocSoNamKinhNghiem(event.target.value)}
            >
              <option>Tất cả</option>
              <option>Dưới 3 năm</option>
              <option>3 - 5 năm</option>
              <option>Trên 5 năm</option>
            </select>
            <select
              value={locTrangThai}
              onChange={(event) => setLocTrangThai(event.target.value)}
            >
              <option>Tất cả</option>
              {danhSachTrangThai.map((trangThai) => (
                <option key={trangThai}>{trangThai}</option>
              ))}
            </select>
            <select
              value={locTrinhDoNgoaiNgu}
              onChange={(event) => setLocTrinhDoNgoaiNgu(event.target.value)}
            >
              <option>Tất cả</option>
              {danhSachTrinhDoNgoaiNgu.map((trinhDo) => (
                <option key={trinhDo}>{trinhDo}</option>
              ))}
            </select>
          </div>

          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Mã HDV</th>
                  <th>Họ Tên</th>
                  <th>Kinh Nghiệm</th>
                  <th>Ngoại Ngữ</th>
                  <th>Tour Phụ Trách</th>
                  <th>Đánh Giá</th>
                  <th>Trạng Thái</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {danhSachDaLoc.map((hdv) => (
                  <tr key={hdv.id}>
                    <td>
                      <span className="guide-avatar">{taoChuCaiDaiDien(hdv.hoTen)}</span>
                    </td>
                    <td>
                      <strong className="guide-code">{hdv.maHdv}</strong>
                    </td>
                    <td>
                      <strong>{hdv.hoTen}</strong>
                      <span>{hdv.trinhDoNgoaiNgu}</span>
                      <span>{hdv.email}</span>
                      <span>{hdv.soDienThoai}</span>
                    </td>
                    <td>{hdv.soNamKinhNghiem} năm</td>
                    <td>
                      <div className="guide-language-list">
                        {hdv.ngoaiNgu.map((ngoaiNgu) => (
                          <span key={ngoaiNgu}>{ngoaiNgu}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <strong className="guide-tour-count">
                        {hdv.soTourPhuTrach} tour
                      </strong>
                    </td>
                    <td>
                      <strong className="guide-rating">★ {hdv.danhGia}</strong>
                    </td>
                    <td>
                      <span
                        className={`guide-status ${hdv.trangThai
                          .toLowerCase()
                          .replaceAll(' ', '-')}`}
                      >
                        {hdv.trangThai}
                      </span>
                    </td>
                    <td>
                      <div className="guide-actions">
                        <button type="button" onClick={() => moFormChinhSua(hdv)}>
                          Sửa
                        </button>
                        <button type="button" onClick={() => xoaHuongDanVien(hdv.id)}>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="guide-side-panel">
          <h2>Tổng Theo Trạng Thái</h2>
          {danhSachTrangThai.map((trangThai) => (
            <div className="guide-status-row" key={trangThai}>
              <span>{trangThai}</span>
              <strong>{thongKeTheoTrangThai[trangThai]} HDV</strong>
            </div>
          ))}
        </aside>
      </div>

      {hienForm ? (
        <div className="guide-modal-backdrop">
          <form className="guide-modal" onSubmit={luuHuongDanVien}>
            <div className="guide-modal-header">
              <div>
                <h2>{idDangSua ? 'Sửa hướng dẫn viên' : 'Thêm hướng dẫn viên'}</h2>
                <p>Nhập đầy đủ thông tin hồ sơ HDV.</p>
              </div>
              <button type="button" onClick={dongForm}>
                Đóng
              </button>
            </div>

            <div className="guide-form-grid">
              <label>
                Mã HDV
                <input
                  required
                  value={formHdv.maHdv}
                  onChange={(event) => capNhatForm('maHdv', event.target.value)}
                />
              </label>
              <label>
                Họ tên
                <input
                  required
                  value={formHdv.hoTen}
                  onChange={(event) => capNhatForm('hoTen', event.target.value)}
                />
              </label>
              <label>
                Email
                <input
                  required
                  type="email"
                  value={formHdv.email}
                  onChange={(event) => capNhatForm('email', event.target.value)}
                />
              </label>
              <label>
                Số điện thoại
                <input
                  required
                  value={formHdv.soDienThoai}
                  onChange={(event) =>
                    capNhatForm('soDienThoai', event.target.value)
                  }
                />
              </label>
              <label>
                Khu vực phụ trách
                <input
                  required
                  value={formHdv.khuVuc}
                  onChange={(event) => capNhatForm('khuVuc', event.target.value)}
                />
              </label>
              <label>
                Số năm kinh nghiệm
                <input
                  min="0"
                  required
                  type="number"
                  value={formHdv.soNamKinhNghiem}
                  onChange={(event) =>
                    capNhatForm('soNamKinhNghiem', event.target.value)
                  }
                />
              </label>
              <label>
                Trình độ ngoại ngữ
                <select
                  value={formHdv.trinhDoNgoaiNgu}
                  onChange={(event) =>
                    capNhatForm('trinhDoNgoaiNgu', event.target.value)
                  }
                >
                  {danhSachTrinhDoNgoaiNgu.map((trinhDo) => (
                    <option key={trinhDo}>{trinhDo}</option>
                  ))}
                </select>
              </label>
              <label>
                Ngoại ngữ
                <input
                  required
                  value={formHdv.ngoaiNgu}
                  placeholder="Tiếng Anh, Tiếng Pháp"
                  onChange={(event) => capNhatForm('ngoaiNgu', event.target.value)}
                />
              </label>
              <label>
                Tour phụ trách
                <input
                  min="0"
                  type="number"
                  value={formHdv.soTourPhuTrach}
                  onChange={(event) =>
                    capNhatForm('soTourPhuTrach', event.target.value)
                  }
                />
              </label>
              <label>
                Đánh giá
                <input
                  max="5"
                  min="0"
                  step="0.1"
                  type="number"
                  value={formHdv.danhGia}
                  onChange={(event) => capNhatForm('danhGia', event.target.value)}
                />
              </label>
              <label>
                Trạng thái
                <select
                  value={formHdv.trangThai}
                  onChange={(event) => capNhatForm('trangThai', event.target.value)}
                >
                  {danhSachTrangThai.map((trangThai) => (
                    <option key={trangThai}>{trangThai}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="guide-modal-actions">
              <button type="button" onClick={dongForm}>
                Hủy
              </button>
              <button type="submit">
                {idDangSua ? 'Lưu thay đổi' : 'Thêm HDV'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  )
}

export default GuideManagementPage
