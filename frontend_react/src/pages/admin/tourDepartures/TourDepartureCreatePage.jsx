import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { tourDepartureApi } from "../../../services/tourDepartureApi";
import TourDepartureForm from "../../../components/admin/tourDepartures/TourDepartureForm";

const emptyForm = {
  departure_date: "",
  return_date: "",
  price: "",
  total_slots: "",
  status: "open",
};

const TourDepartureCreatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tours, setTours] = useState([]);
  const [selectedTourId, setSelectedTourId] = useState(
    searchParams.get("tourId") || ""
  );
  const [formData, setFormData] = useState(emptyForm);

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

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchTours = async () => {
    try {
      const res = await tourDepartureApi.getTours();
      const list = getArrayFromResponse(res);

      setTours(list);

      if (!selectedTourId && list.length > 0) {
        setSelectedTourId(String(list[0].id));
      }
    } catch (error) {
      console.error(error);
      alert("Không tải được danh sách tour");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedTourId) {
      alert("Vui lòng chọn tour");
      return;
    }

    const data = {
      departure_date: formData.departure_date,
      return_date: formData.return_date || null,
      price: formData.price === "" ? null : Number(formData.price),
      total_slots: Number(formData.total_slots),
      status: formData.status,
    };

    try {
      await tourDepartureApi.create(selectedTourId, data);

      alert("Thêm lịch khởi hành thành công");
      navigate("/admin/tour-departures");
    } catch (error) {
      console.error(error);

      const message =
        error.response?.data?.message ||
        error.response?.data?.errors?.departure_date?.[0] ||
        error.response?.data?.errors?.return_date?.[0] ||
        error.response?.data?.errors?.price?.[0] ||
        error.response?.data?.errors?.total_slots?.[0] ||
        error.response?.data?.errors?.status?.[0] ||
        "Thêm lịch khởi hành thất bại";

      alert(message);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Thêm lịch khởi hành</h1>
        <p className="text-gray-500 mt-1">
          Chọn tour và nhập thông tin lịch khởi hành mới.
        </p>
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

      <TourDepartureForm
        formData={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitText="Thêm mới"
        onCancel={() => navigate("/admin/tour-departures")}
      />
    </div>
  );
};

export default TourDepartureCreatePage;