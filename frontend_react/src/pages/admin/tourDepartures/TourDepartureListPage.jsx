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
    return (
      tour.name ||
      tour.title ||
      tour.tour_name ||
      tour.name_tour ||
      `Tour #${tour.id}`
    );
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

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Quản lý lịch khởi hành</h1>
          <p className="text-gray-500 mt-1">
            Chọn tour để xem danh sách lịch khởi hành.
          </p>
        </div>

        <Link
          to={`/admin/tour-departures/create?tourId=${selectedTourId}`}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Thêm lịch khởi hành
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <label className="block text-sm font-medium mb-2">Chọn tour</label>

        <select
          value={selectedTourId}
          onChange={(e) => setSelectedTourId(e.target.value)}
          className="w-full border rounded px-3 py-2"
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
        <div className="bg-white rounded-lg shadow p-5">
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