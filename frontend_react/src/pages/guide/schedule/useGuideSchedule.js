import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  checkInGuideCustomer,
  checkOutGuideCustomer,
  createGuideAttendanceSession,
  getGuideAttendanceSessions,
  getGuideAttendanceStatistics,
  getGuideTourCustomerDetail,
  getGuideTourCustomers,
  getGuideTourDetail,
  getGuideTourStages,
} from '../../../services/guideTourApi'
import {
  getInitialStageId,
  getStageLabel,
  getStageSessionKey,
  getTourRuntime,
  sessionBelongsToStage,
  TOUR_GROUPS,
  unwrapPaginator,
} from './scheduleUtils'

export function useGuideSchedule() {
  const [searchParams] = useSearchParams()
  const requestedTourId = Number(searchParams.get('tourId') || 0) || null
  const requestedGroup = searchParams.get('group')
  const requestedMode = searchParams.get('mode') || ''
  const [activeGroup, setActiveGroup] = useState('ongoing')
  const [tourGroups, setTourGroups] = useState({ ongoing: [], upcoming: [], completed: [] })
  const [totals, setTotals] = useState({ ongoing: 0, upcoming: 0, completed: 0 })
  const [selectedTourId, setSelectedTourId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [stagesPayload, setStagesPayload] = useState(null)
  const [sessions, setSessions] = useState([])
  const [selectedStageId, setSelectedStageId] = useState(null)
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [customersPayload, setCustomersPayload] = useState({ data: [], current_session: null })
  const [statistics, setStatistics] = useState(null)
  const [loadingTours, setLoadingTours] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [busyCustomerId, setBusyCustomerId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [historyDetail, setHistoryDetail] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadTourGroups() {
      setLoadingTours(true)
      setError('')

      try {
        const responses = await Promise.all(
          Object.entries(TOUR_GROUPS).map(async ([key, config]) => {
            const response = await config.fetcher({ page: 1, per_page: 50 })
            return [key, unwrapPaginator(response)]
          }),
        )

        if (!mounted) return

        const nextGroups = {}
        const nextTotals = {}

        responses.forEach(([key, result]) => {
          nextGroups[key] = result.items
          nextTotals[key] = result.total
        })

        setTourGroups(nextGroups)
        setTotals(nextTotals)

        const requestedTour = requestedTourId
          ? [...(nextGroups.ongoing || []), ...(nextGroups.upcoming || []), ...(nextGroups.completed || [])]
              .find((item) => Number(item.id) === Number(requestedTourId))
          : null

        const firstTour =
          requestedTour ||
          nextGroups.ongoing?.[0] ||
          nextGroups.upcoming?.[0] ||
          nextGroups.completed?.[0] ||
          null

        if (firstTour) {
          const nextGroup = ['ongoing', 'upcoming', 'completed'].includes(requestedGroup)
            ? requestedGroup
            : getTourRuntime(firstTour)
          setActiveGroup(nextGroup)
          setSelectedTourId(firstTour.id)
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.message || 'Không tải được lịch làm việc.')
        }
      } finally {
        if (mounted) setLoadingTours(false)
      }
    }

    void loadTourGroups()

    return () => {
      mounted = false
    }
  }, [requestedGroup, requestedTourId])

  useEffect(() => {
    if (!selectedTourId) return undefined

    let mounted = true

    async function loadSelectedTour() {
      setLoadingDetail(true)
      setError('')
      setMessage('')
      setHistoryDetail(null)
      setSelectedStageId(null)
      setSelectedSessionId(null)

      try {
        const [tourDetail, stages, attendanceSessions] = await Promise.all([
          getGuideTourDetail(selectedTourId),
          getGuideTourStages(selectedTourId),
          getGuideAttendanceSessions(selectedTourId),
        ])

        if (!mounted) return

        setDetail(tourDetail)
        setStagesPayload(stages)
        setSessions(Array.isArray(attendanceSessions) ? attendanceSessions : [])
        setSelectedStageId(getInitialStageId(stages))
      } catch (loadError) {
        if (mounted) {
          setDetail(null)
          setStagesPayload(null)
          setSessions([])
          setError(loadError?.response?.data?.message || 'Không tải được chi tiết tour.')
        }
      } finally {
        if (mounted) setLoadingDetail(false)
      }
    }

    void loadSelectedTour()

    return () => {
      mounted = false
    }
  }, [selectedTourId])

  const selectedTour = useMemo(() => {
    const allTours = [...tourGroups.ongoing, ...tourGroups.upcoming, ...tourGroups.completed]
    return allTours.find((item) => item.id === selectedTourId) || detail
  }, [detail, selectedTourId, tourGroups])

  const stages = useMemo(
    () => (Array.isArray(stagesPayload?.stages) ? stagesPayload.stages : []),
    [stagesPayload],
  )

  const selectedStage = useMemo(
    () => stages.find((stage) => stage.id === selectedStageId) || stages[0] || null,
    [selectedStageId, stages],
  )

  const stageSessions = useMemo(
    () => sessions.filter((session) => sessionBelongsToStage(session, selectedStage)),
    [selectedStage, sessions],
  )

  const runtime = getTourRuntime(selectedTour)
  const canOperate = runtime === 'ongoing'
  const activeSessionId = stageSessions.some((session) => session.id === selectedSessionId)
    ? selectedSessionId
    : stageSessions.at(-1)?.id || null
  const customers = Array.isArray(customersPayload.data) ? customersPayload.data : []

  function rememberSession(session) {
    if (!session?.id) return

    setSessions((current) => {
      if (current.some((item) => item.id === session.id)) return current
      return [...current, session]
    })
  }

  function clearAttendance(customerResponse) {
    const data = Array.isArray(customerResponse.data) ? customerResponse.data : []

    return {
      ...customerResponse,
      current_session: null,
      data: data.map((customer) => ({
        ...customer,
        attendance_status: 'not_checked_in',
        attendance: {
          id: null,
          checked_in_at: null,
          checked_out_at: null,
          note: null,
        },
      })),
    }
  }

  function emptyStatistics(customerResponse) {
    const total = customerResponse?.meta?.total ?? customerResponse?.data?.length ?? 0

    return {
      current_session: null,
      total_customers: total,
      checked_in: 0,
      not_checked_in: total,
      absent: 0,
      checked_out: 0,
    }
  }

  useEffect(() => {
    if (!selectedTourId) return undefined

    let mounted = true

    async function loadCustomers() {
      try {
        if (runtime === 'upcoming') {
          await Promise.resolve()
          if (!mounted) return
          setCustomersPayload({ data: [], current_session: null })
          setStatistics(null)
          return
        }

        const customerParams = {
          per_page: 100,
          attendance_session_id: activeSessionId || undefined,
        }

        const customerResponse = await getGuideTourCustomers(selectedTourId, customerParams)
        rememberSession(customerResponse.current_session)

        if (!mounted) return

        if (!activeSessionId) {
          const cleanResponse = clearAttendance(customerResponse)
          setCustomersPayload(cleanResponse)
          setStatistics(emptyStatistics(cleanResponse))
          return
        }

        const statsResponse = await getGuideAttendanceStatistics(selectedTourId, {
          attendance_session_id: activeSessionId,
        })

        if (!mounted) return

        setCustomersPayload(customerResponse)
        setStatistics(statsResponse)
      } catch (loadError) {
        if (mounted) {
          setCustomersPayload({ data: [], current_session: null })
          setStatistics(null)
          setError(loadError?.response?.data?.message || 'Không tải được danh sách khách hàng.')
        }
      }
    }

    void loadCustomers()

    return () => {
      mounted = false
    }
  }, [activeSessionId, runtime, selectedTourId])

  function selectTour(item, groupKey) {
    setActiveGroup(groupKey)
    setSelectedTourId(item.id)
  }

  async function refreshSessionData(sessionId = activeSessionId) {
    const params = sessionId ? { attendance_session_id: sessionId } : {}

    const customerResponse = await getGuideTourCustomers(selectedTourId, {
      per_page: 100,
      ...params,
    })
    rememberSession(customerResponse.current_session)

    if (!sessionId) {
      const cleanResponse = clearAttendance(customerResponse)
      setCustomersPayload(cleanResponse)
      setStatistics(emptyStatistics(cleanResponse))
      return
    }

    const statsResponse = await getGuideAttendanceStatistics(selectedTourId, params)

    setCustomersPayload(customerResponse)
    setStatistics(statsResponse)
  }

  async function createSessionForStage() {
    if (!selectedTourId || !selectedStage || !canOperate) return

    try {
      setError('')
      setMessage('')

      const count = stageSessions.length + 1
      const session = await createGuideAttendanceSession(selectedTourId, {
        name: `${getStageLabel(selectedStage)} - Lần ${count}`,
        note: `${getStageSessionKey(selectedStage)}; Check-in/check-out theo lịch trình tour`,
      })

      rememberSession(session)
      setSelectedSessionId(session.id)
      await refreshSessionData(session.id)
      setMessage(`Đã tạo lần điểm danh ${count} cho ${getStageLabel(selectedStage)}.`)
    } catch (createError) {
      setError(createError?.response?.data?.message || 'Không tạo được lần điểm danh.')
    }
  }

  async function handleAttendanceAction(customer, action) {
    if (!activeSessionId) {
      setError('Vui lòng chọn hoặc tạo một lần điểm danh theo lịch trình.')
      return
    }

    try {
      setBusyCustomerId(customer.id)
      setError('')
      setMessage('')

      if (action === 'check-in') {
        await checkInGuideCustomer(selectedTourId, activeSessionId, customer.id)
        setMessage(`Đã check-in ${customer.full_name}.`)
      } else {
        await checkOutGuideCustomer(selectedTourId, activeSessionId, customer.id)
        setMessage(`Đã check-out ${customer.full_name}.`)
      }

      await refreshSessionData(activeSessionId)
    } catch (actionError) {
      setError(actionError?.response?.data?.message || 'Không cập nhật được trạng thái khách hàng.')
    } finally {
      setBusyCustomerId(null)
    }
  }

  async function openCustomerHistory(customer) {
    if (!selectedTourId) return

    try {
      setHistoryLoading(true)
      setHistoryDetail(null)
      const customerDetail = await getGuideTourCustomerDetail(selectedTourId, customer.id)
      setHistoryDetail(customerDetail)
    } catch (historyError) {
      setError(historyError?.response?.data?.message || 'Không tải được lịch sử khách hàng.')
    } finally {
      setHistoryLoading(false)
    }
  }

  return {
    activeGroup,
    activeSessionId,
    busyCustomerId,
    canOperate,
    createSessionForStage,
    customers,
    detail,
    error,
    handleAttendanceAction,
    historyDetail,
    historyLoading,
    loadingDetail,
    loadingTours,
    message,
    openCustomerHistory,
    requestedMode,
    runtime,
    selectTour,
    selectedStage,
    selectedTour,
    setActiveGroup,
    setHistoryDetail,
    setSelectedSessionId,
    setSelectedStageId,
    stageSessions,
    stages,
    statistics,
    totals,
    tourGroups,
  }
}
