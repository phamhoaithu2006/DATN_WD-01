function CategoryTable({ categories, loading, onEdit, onDelete }) {
  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('vi-VN')
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th className="border-b border-slate-200 px-4 py-4">STT</th>
            <th className="border-b border-slate-200 px-4 py-4">Tên loại tour</th>
            <th className="border-b border-slate-200 px-4 py-4">Slug</th>
            <th className="border-b border-slate-200 px-4 py-4">Mô tả</th>
            <th className="border-b border-slate-200 px-4 py-4">Trạng thái</th>
            <th className="border-b border-slate-200 px-4 py-4">Ngày tạo</th>
            <th className="border-b border-slate-200 px-4 py-4">Hành động</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan="7" className="px-4 py-6 text-slate-500">
                Đang tải dữ liệu...
              </td>
            </tr>
          ) : categories.length > 0 ? (
            categories.map((category, index) => (
              <tr key={category.id} className="text-sm text-slate-700">
                <td className="border-b border-slate-100 px-4 py-4">{index + 1}</td>
                <td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-900">
                  {category.name}
                </td>
                <td className="border-b border-slate-100 px-4 py-4">
                  {category.slug || '-'}
                </td>
                <td className="border-b border-slate-100 px-4 py-4">
                  {category.description || '-'}
                </td>
                <td className="border-b border-slate-100 px-4 py-4">
                  <span
                    className={
                      category.status === 'active'
                        ? 'rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700'
                        : 'rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700'
                    }
                  >
                    {category.status === 'active' ? 'Hoạt động' : 'Tạm ẩn'}
                  </span>
                </td>
                <td className="border-b border-slate-100 px-4 py-4">
                  {formatDate(category.created_at)}
                </td>
                <td className="border-b border-slate-100 px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(category)}
                      className="rounded-lg bg-blue-100 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-200"
                    >
                      Sửa
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(category.id)}
                      className="rounded-lg bg-red-100 px-3 py-2 font-semibold text-red-700 hover:bg-red-200"
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="px-4 py-6 text-slate-500">
                Chưa có loại tour nào.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default CategoryTable