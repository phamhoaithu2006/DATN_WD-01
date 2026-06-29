import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import TourForm from '../../../components/admin/tours/TourForm'
import tourApi from '../../../services/toursApi'

function TourEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [tour, setTour] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const getTourListFromResponse = (responseData) => {
    if (Array.isArray(responseData)) {
      return responseData
    }

    if (Array.isArray(responseData?.data?.data)) {
      return responseData.data.data
    }

    if (Array.isArray(responseData?.data)) {
      return responseData.data
    }

    if (Array.isArray(responseData?.tours)) {
      return responseData.tours
    }

    return []
  }

  const fetchTour = useCallback(async () => {
    try {
      setLoading(true)

      const response = await tourApi.getAll()
      const tourList = getTourListFromResponse(response.data)

      const foundTour = tourList.find((item) => Number(item.id) === Number(id))

      if (!foundTour) {
        alert('Không tìm thấy tour')
        navigate('/admin/tours')
        return
      }

      setTour(foundTour)
    } catch (error) {
      console.error('GET TOUR ERROR:', error)
      console.error('STATUS:', error.response?.status)
      console.error('DATA:', error.response?.data)

      alert('Không thể tải thông tin tour')
      navigate('/admin/tours')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTour()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchTour])

  const handleSubmit = async (payload) => {
    try {
      setSubmitting(true)

      await tourApi.update(id, payload)

      alert('Cập nhật tour thành công')
      navigate('/admin/tours')
    } catch (error) {
      console.error('UPDATE TOUR ERROR:', error)
      console.error('STATUS:', error.response?.status)
      console.error('DATA:', error.response?.data)

      const message = error.response?.data?.message
      const errors = error.response?.data?.errors

      if (errors) {
        alert(Object.values(errors).flat().join('\n'))
        return
      }

      if (message) {
        alert(message)
        return
      }

      alert('Cập nhật tour thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-gray-500">Đang tải thông tin tour...</div>
  }

  if (!tour) {
    return <div className="p-6 text-gray-500">Không tìm thấy tour</div>
  }

  return (
    <div className="p-6">
      <AdminPageHeader
        breadcrumb={["ViVuGo", "Quản Lý Tour", "Sửa tour"]}
        title="Sửa tour"
        description={`Cập nhật thông tin tour #${tour.id}`}
        actions={
          <Link
            to="/admin/tours"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
          >
            ← Quay lại danh sách
          </Link>
        }
      />

      <TourForm
        initialData={tour}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitText="Cập nhật tour"
      />
    </div>
  )
}

export default TourEditPage
