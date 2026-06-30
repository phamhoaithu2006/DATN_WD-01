import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import adminNotificationApi from '../../api/adminNotificationApi'

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
  const [roleIdsText, setRoleIdsText] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [previewUsers, setPreviewUsers] = useState([])

  const [drafts, setDrafts] = useState([])
  const [sentNotifications, setSentNotifications] = useState([])
  const [trashDrafts, setTrashDrafts] = useState([])

  const [loadingUsers, setLoadingUsers] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingLists, setLoadingLists] = useState(true)

  const selectedUserIds = useMemo(
    () => selectedUsers.map((user) => Number(user.id)),
    [selectedUsers],
  )

  const roleIds = useMemo(() => parseIds(roleIdsText), [roleIdsText])

  const refreshLists = async () => {
    try {
      setLoadingLists(true)

      const [draftResponse, sentResponse, trashResponse] = await Promise.all([
        adminNotificationApi.getDrafts(),
        adminNotificationApi.getSentNotifications(),
        adminNotificationApi.getTrash(),
      ])

      setDrafts(getArray(draftResponse))
      setSentNotifications(getArray(sentResponse))
      setTrashDrafts(getArray(trashResponse))
    } catch (error) {
      console.error(error)
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

  useEffect(() => {
    refreshLists()
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

  const deleteDraft = async (id) => {
    if (!window.confirm('Bạn có chắc muốn chuyển bản nháp vào thùng rác?')) {
      return
    }

    try {
      await adminNotificationApi.deleteDraft(id)
      toast.success('Đã chuyển bản nháp vào thùng rác')
      refreshLists()
    } catch (error) {
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
    `rounded-lg px-4 py-2 text-sm font-semibold transition ${
      tab === tabName
        ? 'bg-blue-600 text-white'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
          Quản trị hệ thống
        </p>

        <h1 className="mt-1 text-3xl font-black text-slate-900">
          Thông báo người dùng
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Tạo bản nháp, chọn người nhận và quản lý các chiến dịch thông báo.
        </p>
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
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Bản nháp</h2>

            <button
              onClick={refreshLists}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700"
            >
              Làm mới
            </button>
          </div>

          {loadingLists ? (
            <p className="text-slate-500">Đang tải...</p>
          ) : drafts.length === 0 ? (
            <p className="text-slate-500">Chưa có bản nháp nào.</p>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row">
                    <div>
                      <h3 className="font-bold text-slate-800">{draft.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {draft.message}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        Tạo lúc: {formatDate(draft.created_at)} · Đối tượng:{' '}
                        {draft.target_type}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => editDraft(draft)}
                        className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-bold text-amber-700"
                      >
                        Sửa
                      </button>

                      <button
                        onClick={() => sendDraft(draft.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white"
                      >
                        Gửi
                      </button>

                      <button
                        onClick={() => deleteDraft(draft.id)}
                        className="rounded-lg bg-red-100 px-3 py-2 text-sm font-bold text-red-600"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
    </div>
  )
}