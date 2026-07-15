import {
  getGuideTourCompleted,
  getGuideTourOngoing,
  getGuideTourUpcoming,
} from '../../../services/guideTourApi'

export const TOUR_GROUPS = {
  ongoing: {
    label: 'Tour đang đi',
    hint: 'Đang vận hành',
    empty: 'Chưa có tour đang đi.',
    fetcher: getGuideTourOngoing,
  },
  upcoming: {
    label: 'Tour sắp đi',
    hint: 'Sắp khởi hành',
    empty: 'Chưa có tour sắp đi.',
    fetcher: getGuideTourUpcoming,
  },
  completed: {
    label: 'Tour đã đi',
    hint: 'Đã hoàn tất',
    empty: 'Chưa có tour đã đi.',
    fetcher: getGuideTourCompleted,
  },
}

export function unwrapPaginator(payload) {
  const data = payload?.data || {}
  const items = Array.isArray(data.data) ? data.data : []

  return {
    items,
    total: data.total ?? items.length,
  }
}

export function formatDate(value) {
  if (!value) return 'Chưa xác định'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(value) {
  if (!value) return 'Chưa có'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function dateOnly(value) {
  if (!value) return null

  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return null

  const date = new Date(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  return date
}

export function getTourRuntime(item) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const departure = dateOnly(item?.departure_date)
  const returned = dateOnly(item?.return_date) || departure
  const status = String(item?.status || '').toLowerCase()

  if (status === 'completed' || (returned && returned < today)) return 'completed'
  if (departure && departure > today) return 'upcoming'
  if (departure && returned && departure <= today && returned >= today) return 'ongoing'

  return 'completed'
}

export function getTourTitle(item) {
  return item?.tour?.title || item?.tour_name || 'Tour được phân công'
}

export function getDestination(item) {
  return item?.tour?.destination?.name || item?.tour?.destination?.province_city || 'Chưa có điểm đến'
}

export function getStageLabel(stage) {
  if (!stage) return 'Lịch trình'
  return `Ngày ${stage.day_number} - ${stage.title || 'Lịch trình'}`
}

export function getStageSessionKey(stage) {
  return stage?.id ? `stage_id:${stage.id}` : ''
}

export function getSessionStageId(session) {
  const match = String(session?.note || '').match(/stage_id:(\d+)/)
  return match?.[1] ? Number(match[1]) : null
}

export function sessionBelongsToStage(session, stage) {
  if (!stage) return false

  const stageId = getSessionStageId(session)
  if (stageId) return Number(stage.id) === stageId

  return String(session?.name || '').startsWith(getStageLabel(stage))
}

export function getInitialStageId(stagesPayload) {
  const stages = Array.isArray(stagesPayload?.stages) ? stagesPayload.stages : []
  const currentStage =
    stagesPayload?.current_stage ||
    stages.find((stage) => stage.status === 'in_progress') ||
    stages[0]

  return currentStage?.id || null
}
