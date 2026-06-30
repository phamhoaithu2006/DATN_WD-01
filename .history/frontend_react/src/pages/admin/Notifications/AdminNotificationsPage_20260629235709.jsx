import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import adminNotificationApi from '/src/services/adminNotificationApi.js'

const EMPTY_FORM = {
  title: '',
  message: '',
  target_type: 'all',
}

const getArray = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  return []
}

const parseIds = (value) => {
  if (Array.isArray(value)) {
    return value.map(Number).filter(Boolean)
  }

  if (!value) return []

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)

      if (Array.isArray(parsed)) {
        return parsed.map(Number).filter(Boolean)
      }
    } catch {
      return value
        .split(',')
        .map((id) => Number(id.trim()))
        .filter(Boolean)
    }
  }

  return []
}

const formatDate = (dateValue) => {
  if (!dateValue) return '-'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dateValue))
}

export default function AdminNotificationsPage() {
  const [tab, setTab] = useState('compose')

  const [form, setForm] = useState(EMPTY_FORM)
  const [editingDraftId, setEditingDraftId] = useState(null)

  const [users, setUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [previewUsers, setPreviewUsers] = useState([])

  const [roles, setRoles] = useState([])
  const [selectedRoleIds, setSelectedRoleIds] = useState([])
  const [loadingRoles, setLoadingRoles] = useState(true)

  const [drafts, setDrafts] = useState([])
  const [sentNotifications, setSentNotifications] = useState([])
  const [trashDrafts, setTrashDrafts] = useState([])

  const [loadingUsers, setLoadingUsers] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingLists, setLoadingLists] = useState(true)

  const [viewingDraft, setViewingDraft] = useState(null)
  const [loadingDraftDetail, setLoadingDraftDetail] = useState(false)

  const selectedUserIds = useMemo(
    () => selectedUsers.map((user) => Number(user.id)),
    [selectedUsers],
  )

  const roleIds = useMemo(() => parseIds(roleIdsText), [roleIdsText])

  const refreshLists = async () => {
  try {
    setLoadingLists(true)

    const data = await fetchNotificationLists()

    setDrafts(data.drafts)
    setSentNotifications(data.sentNotifications)
    setTrashDrafts(data.trashDrafts)
  } catch (error) {
    console.error('REFRESH NOTIFICATION LISTS ERROR:', error)
    toast.error('Không thể tải dữ liệu thông báo')
  } finally {
    setLoadingLists(false)
  }
}

  const loadUsers = async (keyword = '') => {
    try {
      setLoadingUsers(true)

      const response = await adminNotificationApi.getUsers({
        keyword,
      })

      setUsers(getArray(response))
    } catch (error) {
      console.error(error)
      toast.error('Không tải được danh sách người dùng')
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchNotificationLists = async () => {
  const [draftResponse, sentResponse, trashResponse] = await Promise.all([
    adminNotificationApi.getDrafts(),
    adminNotificationApi.getSentNotifications(),
    adminNotificationApi.getTrash(),
  ])

  return {
    drafts: getArray(draftResponse),
    sentNotifications: getArray(sentResponse),
    trashDrafts: getArray(trashResponse),
  }
}
  const loadRoles = async () => {
  try {
    const response = await adminNotificationApi.getRoles()
    setRoles(getArray(response))
  } catch (error) {
    console.error('LOAD ROLES ERROR:', error)
    toast.error('Không tải được danh sách vai trò')
  } finally {
    setLoadingRoles(false)
  }
}

useEffect(() => {
  let cancelled = false

  const loadInitialLists = async () => {
    try {
      const data = await fetchNotificationLists()

      if (cancelled) return

      setDrafts(data.drafts)
      setSentNotifications(data.sentNotifications)
      setTrashDrafts(data.trashDrafts)
    } catch (error) {
      console.error('LOAD NOTIFICATION LISTS ERROR:', error)

      if (!cancelled) {
        toast.error('Không thể tải dữ liệu thông báo')
      }
    } finally {
      if (!cancelled) {
        setLoadingLists(false)
      }
    }
  }

  void loadInitialLists()

  return () => {
    cancelled = true
  }
}, [])

  useEffect(() => {
    if (form.target_type !== 'specific') return

    const timer = setTimeout(() => {
      loadUsers(searchKeyword)
    }, 350)

    return () => clearTimeout(timer)
  }, [searchKeyword, form.target_type])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingDraftId(null)
    setSelectedUsers([])
    setRoleIdsText('')
    setPreviewUsers([])
    setSearchKeyword('')
  }

  const toggleUser = (user) => {
    setSelectedUsers((current) => {
      const exists = current.some((item) => Number(item.id) === Number(user.id))

      if (exists) {
        return current.filter((item) => Number(item.id) !== Number(user.id))
      }

      return [...current, user]
    })
  }

  const removeSelectedUser = (id) => {
    setSelectedUsers((current) =>
      current.filter((user) => Number(user.id) !== Number(id)),
    )
  }

  const getTargetIds = () => {
    if (form.target_type === 'specific') {
      return selectedUserIds
    }

    if (form.target_type === 'role') {
      return roleIds
    }

    return []
  }

  const validateForm = () => {
    if (!form.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề thông báo')
      return false
    }

    if (!form.message.trim()) {
      toast.error('Vui lòng nhập nội dung thông báo')
      return false
    }

    if (form.target_type === 'specific' && selectedUserIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một người nhận')
      return false
    }

    if (form.target_type === 'role' && roleIds.length === 0) {
      toast.error('Vui lòng nhập ít nhất một ID vai trò')
      return false
    }

    return true
  }

  const saveDraft = async () => {
    if (!validateForm()) return

    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      target_type: form.target_type,
      target_ids: getTargetIds(),
    }

    try {
      setSaving(true)

      if (editingDraftId) {
        await adminNotificationApi.updateDraft(editingDraftId, payload)
        toast.success('Cập nhật bản nháp thành công')
      } else {
        await adminNotificationApi.saveDraft(payload)
        toast.success('Lưu bản nháp thành công')
      }

      await refreshLists()
      resetForm()
      setTab('drafts')
    } catch (error) {
      console.error(error)
      toast.error(
        error.response?.data?.message || 'Không thể lưu bản nháp',
      )
    } finally {
      setSaving(false)
    }
  }

  const previewRecipients = async () => {
    if (form.target_type === 'all') {
      toast.info('Thông báo sẽ được gửi cho toàn bộ người dùng')
      setPreviewUsers([])
      return
    }

    try {
      const response = await adminNotificationApi.previewRecipients({
        user_ids: form.target_type === 'specific' ? selectedUserIds : [],
        role_ids: form.target_type === 'role' ? roleIds : [],
      })

      setPreviewUsers(getArray(response))
      toast.success(`Tìm thấy ${getArray(response).length} người nhận`)
    } catch (error) {
      console.error(error)
      toast.error('Không thể xem trước người nhận')
    }
  }

  const editDraft = (draft) => {
    const targetIds = parseIds(draft.target_ids)

    setEditingDraftId(draft.id)
    setForm({
      title: draft.title || '',
      message: draft.message || '',
      target_type: draft.target_type || 'all',
    })

    if (draft.target_type === 'specific') {
      setSelectedUsers(
        targetIds.map((id) => ({
          id,
          full_name: `Người dùng #${id}`,
        })),
      )
    } else {
      setSelectedUsers([])
    }

    if (draft.target_type === 'role') {
      setRoleIdsText(targetIds.join(', '))
    } else {
      setRoleIdsText('')
    }

    setTab('compose')
  }

  const getTargetLabel = (draft) => {
  const ids = parseIds(draft.target_ids)

  if (draft.target_type === 'all') {
    return 'Toàn bộ người dùng'
  }

  if (draft.target_type === 'specific') {
    return `Người dùng đã chọn (${ids.length} người)`
  }

  if (draft.target_type === 'role') {
    return ids.length > 0
      ? `Theo vai trò: ${ids.map((id) => `#${id}`).join(', ')}`
      : 'Theo vai trò'
  }

  return '-'
}

const openDraftDetail = async (id) => {
  try {
    setLoadingDraftDetail(true)

    const response = await adminNotificationApi.getDraft(id)

    setViewingDraft(response.data || response)
  } catch (error) {
    console.error('GET DRAFT DETAIL ERROR:', error)
    toast.error(
      error.response?.data?.message || 'Không thể tải chi tiết bản nháp',
    )
  } finally {
    setLoadingDraftDetail(false)
  }
}

  const deleteDraft = async (id) => {
    if (!window.confirm('Bạn có chắc muốn chuyển bản nháp vào thùng rác?')) {
        return
    }

    try {
        await adminNotificationApi.deleteDraft(id)
        toast.success('Đã chuyển bản nháp vào thùng rác')
        refreshLists()
    } catch {
        toast.error('Không thể xóa bản nháp')
    }
    }

  const sendDraft = async (id) => {
    if (!window.confirm('Gửi thông báo này ngay bây giờ?')) {
      return
    }

    try {
      const response = await adminNotificationApi.sendDraft(id)
      toast.success(response.message || 'Gửi thông báo thành công')
      refreshLists()
    } catch (error) {
      console.error(error)
      toast.error(
        error.response?.data?.message || 'Không thể gửi thông báo',
      )
    }
  }

  const restoreDraft = async (id) => {
    try {
      await adminNotificationApi.restoreDraft(id)
      toast.success('Khôi phục bản nháp thành công')
      refreshLists()
    } catch {
      toast.error('Không thể khôi phục bản nháp')
    }
  }

  const forceDeleteDraft = async (id) => {
    if (!window.confirm('Xóa vĩnh viễn bản nháp này?')) return

    try {
      await adminNotificationApi.forceDeleteDraft(id)
      toast.success('Đã xóa vĩnh viễn bản nháp')
      refreshLists()
    } catch {
      toast.error('Không thể xóa vĩnh viễn')
    }
  }

  const revokeNotification = async (draftId) => {
    if (!window.confirm('Thu hồi toàn bộ thông báo đã gửi từ chiến dịch này?')) {
      return
    }

    try {
      const response = await adminNotificationApi.revokeNotification(draftId)
      toast.success(response.message || 'Thu hồi thông báo thành công')
      refreshLists()
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Không thể thu hồi thông báo',
      )
    }
  }

  const tabClass = (tabName) =>
  `rounded-xl px-4 py-2.5 text-sm font-bold transition ${
    tab === tabName
      ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
      : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
  }`

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-6 py-7 text-white shadow-xl shadow-blue-200 sm:px-8">
            <div className="relative z-10">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-100">
                Quản trị hệ thống
            </p>

            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                Thông báo người dùng
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                Tạo chiến dịch, lưu bản nháp, chọn người nhận và quản lý lịch sử gửi thông báo.
            </p>
            </div>

            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-20 right-36 h-40 w-40 rounded-full bg-cyan-300/20 blur-2xl" />
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className={tabClass('compose')} onClick={() => setTab('compose')}>
          Soạn thông báo
        </button>

        <button className={tabClass('drafts')} onClick={() => setTab('drafts')}>
          Bản nháp ({drafts.length})
        </button>

        <button className={tabClass('sent')} onClick={() => setTab('sent')}>
          Đã gửi ({sentNotifications.length})
        </button>

        <button className={tabClass('trash')} onClick={() => setTab('trash')}>
          Thùng rác ({trashDrafts.length})
        </button>
      </div>

      {tab === 'compose' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                {editingDraftId ? 'Chỉnh sửa bản nháp' : 'Tạo thông báo mới'}
              </h2>

              {editingDraftId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm font-semibold text-red-500"
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Tiêu đề
              </label>

              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Ví dụ: Bảo trì hệ thống"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Nội dung thông báo
              </label>

              <textarea
                rows="7"
                value={form.message}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                placeholder="Nhập nội dung thông báo gửi đến người dùng..."
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Đối tượng nhận
              </label>

              <select
                value={form.target_type}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    target_type: event.target.value,
                  }))

                  setPreviewUsers([])
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="all">Gửi cho toàn bộ người dùng</option>
                <option value="specific">Chọn một số người dùng</option>
                <option value="role">Gửi theo ID vai trò</option>
              </select>
            </div>

            {form.target_type === 'specific' && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="Tìm theo tên người dùng..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500"
                />

                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {loadingUsers && (
                    <p className="text-sm text-slate-500">Đang tải người dùng...</p>
                  )}

                  {!loadingUsers &&
                    users.map((user) => {
                      const checked = selectedUserIds.includes(Number(user.id))

                      return (
                        <label
                          key={user.id}
                          className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white p-3 hover:border-blue-300"
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              {user.full_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {user.email || user.phone || `ID: ${user.id}`}
                            </p>
                          </div>

                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleUser(user)}
                          />
                        </label>
                      )
                    })}
                </div>

                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                    {selectedUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => removeSelectedUser(user.id)}
                        className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700"
                      >
                        {user.full_name} ×
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {form.target_type === 'role' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <label className="text-sm font-bold text-amber-800">
                  ID vai trò
                </label>

                <input
                  value={roleIdsText}
                  onChange={(event) => setRoleIdsText(event.target.value)}
                  placeholder="Ví dụ: 1, 2, 3"
                  className="mt-2 w-full rounded-lg border border-amber-200 bg-white px-3 py-2.5 outline-none focus:border-amber-500"
                />

                <p className="mt-2 text-xs text-amber-700">
                  Nhập các ID role, cách nhau bởi dấu phẩy.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={saveDraft}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? 'Đang lưu...' : 'Lưu bản nháp'}
              </button>

              <button
                type="button"
                onClick={previewRecipients}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700"
              >
                Xem trước người nhận
              </button>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">
              Xem trước
            </h2>

            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="font-bold text-slate-800">
                {form.title || 'Tiêu đề thông báo'}
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                {form.message || 'Nội dung thông báo sẽ hiển thị tại đây.'}
              </p>
            </div>

            <div className="mt-5">
              <p className="text-sm font-bold text-slate-700">
                Người nhận xem trước
              </p>

              {form.target_type === 'all' && (
                <p className="mt-2 text-sm text-slate-500">
                  Toàn bộ người dùng trong hệ thống.
                </p>
              )}

              {previewUsers.length > 0 && (
                <div className="mt-3 space-y-2">
                  {previewUsers.map((user) => (
                    <div
                      key={user.id}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    >
                      {user.full_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {tab === 'drafts' && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-blue-600">
                Notification Center
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900">
                Bản nháp thông báo
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                Quản lý, xem chi tiết, chỉnh sửa hoặc gửi thông báo.
                </p>
            </div>

            <button
                type="button"
                onClick={refreshLists}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
                Làm mới
            </button>
            </div>

            <div className="p-5 sm:p-6">
            {loadingLists ? (
                <div className="py-14 text-center text-sm font-semibold text-slate-400">
                Đang tải bản nháp...
                </div>
            ) : drafts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-14 text-center">
                <p className="text-base font-bold text-slate-700">
                    Chưa có bản nháp nào
                </p>
                <p className="mt-1 text-sm text-slate-500">
                    Hãy tạo thông báo mới và lưu lại để tiếp tục sau.
                </p>
                </div>
            ) : (
                <div className="grid gap-4">
                {drafts.map((draft) => (
                    <article
                    key={draft.id}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100/60"
                    >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-amber-700">
                            Bản nháp
                            </span>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                            {getTargetLabel(draft)}
                            </span>
                        </div>

                        <h3 className="truncate text-lg font-black text-slate-900">
                            {draft.title}
                        </h3>

                        <p className="mt-2 line-clamp-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            {draft.message}
                        </p>

                        <p className="mt-3 text-xs font-medium text-slate-400">
                            Tạo lúc: {formatDate(draft.created_at)}
                        </p>
                        </div>

                        <div className="flex flex-wrap gap-2 xl:justify-end">
                        <button
                            type="button"
                            onClick={() => openDraftDetail(draft.id)}
                            className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                        >
                            Xem chi tiết
                        </button>

                        <button
                            type="button"
                            onClick={() => editDraft(draft)}
                            className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
                        >
                            Chỉnh sửa
                        </button>

                        <button
                            type="button"
                            onClick={() => sendDraft(draft.id)}
                            className="rounded-xl bg-emerald-600 px-3.5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                        >
                            Gửi ngay
                        </button>

                        <button
                            type="button"
                            onClick={() => deleteDraft(draft.id)}
                            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100"
                        >
                            Xóa
                        </button>
                        </div>
                    </div>
                    </article>
                ))}
                </div>
            )}
            </div>
        </section>
        )}

      {tab === 'sent' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-slate-800">
            Thông báo đã gửi
          </h2>

          {sentNotifications.length === 0 ? (
            <p className="text-slate-500">Chưa có thông báo nào được gửi.</p>
          ) : (
            <div className="space-y-3">
              {sentNotifications.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 p-4 md:flex-row"
                >
                  <div>
                    <h3 className="font-bold text-slate-800">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      Gửi lúc: {formatDate(item.sent_at)} · Người nhận:{' '}
                      {item.total_recipients ?? 0}
                    </p>
                  </div>

                  <button
                    onClick={() => revokeNotification(item.id)}
                    className="h-fit rounded-lg bg-red-100 px-3 py-2 text-sm font-bold text-red-600"
                  >
                    Thu hồi
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'trash' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-slate-800">
            Thùng rác bản nháp
          </h2>

          {trashDrafts.length === 0 ? (
            <p className="text-slate-500">Thùng rác đang trống.</p>
          ) : (
            <div className="space-y-3">
              {trashDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 p-4 md:flex-row"
                >
                  <div>
                    <h3 className="font-bold text-slate-800">{draft.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{draft.message}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      Xóa lúc: {formatDate(draft.deleted_at)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => restoreDraft(draft.id)}
                      className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-700"
                    >
                      Khôi phục
                    </button>

                    <button
                      onClick={() => forceDeleteDraft(draft.id)}
                      className="rounded-lg bg-red-100 px-3 py-2 text-sm font-bold text-red-600"
                    >
                      Xóa vĩnh viễn
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewingDraft && (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
            onMouseDown={() => setViewingDraft(null)}
        >
            <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
            >
            <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
                <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-100">
                    Chi tiết bản nháp
                </p>
                <h2 className="mt-1 text-xl font-black">
                    {viewingDraft.title}
                </h2>
                </div>

                <button
                type="button"
                onClick={() => setViewingDraft(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-xl font-bold transition hover:bg-white/25"
                aria-label="Đóng"
                >
                ×
                </button>
            </div>

            <div className="space-y-6 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                    Đối tượng nhận
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-800">
                    {getTargetLabel(viewingDraft)}
                    </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                    Thời gian tạo
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-800">
                    {formatDate(viewingDraft.created_at)}
                    </p>
                </div>
                </div>

                <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                    Nội dung thông báo
                </p>

                <div className="mt-3 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                    {viewingDraft.message}
                </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                    type="button"
                    onClick={() => setViewingDraft(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                    Đóng
                </button>

                <button
                    type="button"
                    onClick={() => {
                    editDraft(viewingDraft)
                    setViewingDraft(null)
                    }}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                    Chỉnh sửa bản nháp
                </button>
                </div>
            </div>
            </div>
        </div>
        )}
    </div>
  )
}