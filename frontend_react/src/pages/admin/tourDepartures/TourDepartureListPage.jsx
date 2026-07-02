import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { tourDepartureApi } from "../../../services/tourDepartureApi";
import TourDepartureTable from "../../../components/admin/tourDepartures/TourDepartureTable";

const TourDepartureListPage = () => {
  const [tours, setTours] = useState([]);
  const [selectedTourId, setSelectedTourId] = useState("");
  const [departures, setDepartures] = useState([]);
  const [loading, setLoading] = useState(false);

  const getArrayFromResponse = (res) => {
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.data?.data?.data)) return res.data.data.data;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  };

  const getTourName = (tour) => {
    if (!tour) return "Chưa chọn tour";

    const name =
      tour.name ||
      tour.title ||
      tour.tour_name ||
      tour.name_tour ||
      "";

    if (name && !/^\d+$/.test(String(name).trim())) {
      return name;
    }

    return `Tour #${tour.id}`;
  };

  const fetchTours = async () => {
    try {
      const res = await tourDepartureApi.getTours();
      const list = getArrayFromResponse(res);

      setTours(list);

      if (list.length > 0) {
        setSelectedTourId(String(list[0].id));
      }
    } catch (error) {
      console.error(error);
      alert("Không tải được danh sách tour");
    }
  };

  const fetchDepartures = async (tourId) => {
    try {
      setLoading(true);

      const res = await tourDepartureApi.getByTour(tourId);
      const list = getArrayFromResponse(res);

      setDepartures(list);
    } catch (error) {
      console.error(error);
      alert("Không tải được lịch khởi hành");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  useEffect(() => {
    if (selectedTourId) {
      fetchDepartures(selectedTourId);
    } else {
      setDepartures([]);
    }
  }, [selectedTourId]);

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa lịch khởi hành này không?")) {
      return;
    }

    try {
      await tourDepartureApi.remove(id);
      alert("Xóa lịch khởi hành thành công");
      fetchDepartures(selectedTourId);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Xóa lịch khởi hành thất bại");
    }
  };

  const selectedTour = tours.find(
    (tour) => String(tour.id) === String(selectedTourId)
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Quản lý lịch khởi hành
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Chọn tour để xem danh sách lịch khởi hành.
          </p>
        </div>

        <Link
          to={`/admin/tour-departures/create?tourId=${selectedTourId}`}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          + Thêm lịch khởi hành
        </Link>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Chọn tour
          </label>

          <p className="text-sm text-slate-500">
            {selectedTour
              ? `Đang xem: ${getTourName(selectedTour)}`
              : "Chọn một tour để xem lịch khởi hành."}
          </p>
        </div>

        <select
          value={selectedTourId}
          onChange={(e) => setSelectedTourId(e.target.value)}
          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">-- Chọn tour --</option>

          {tours.map((tour) => (
            <option key={tour.id} value={tour.id}>
              {getTourName(tour)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Đang tải lịch khởi hành...
        </div>
      ) : (
        <TourDepartureTable
          departures={departures}
          selectedTourId={selectedTourId}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

export default TourDepartureListPage;