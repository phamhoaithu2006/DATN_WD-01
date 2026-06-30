import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { tourDepartureApi } from "../../../services/tourDepartureApi";
import TourDepartureForm from "../../../components/admin/tourDepartures/TourDepartureForm";

const emptyForm = {
  departure_date: "",
  return_date: "",
  price: "",
  total_slots: "",
  status: "open",
};

const TourDepartureEditPage = () => {
  const navigate = useNavigate();
  const { tourId, departureId } = useParams();

  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const getArrayFromResponse = (res) => {
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.data?.data?.data)) return res.data.data.data;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  };

  useEffect(() => {
    fetchDeparture();
  }, [tourId, departureId]);

  const fetchDeparture = async () => {
    try {
      setLoading(true);

      const res = await tourDepartureApi.getByTour(tourId);
      const list = getArrayFromResponse(res);
      const departure = list.find(
        (item) => String(item.id) === String(departureId)
      );

      if (!departure) {
        alert("Không tìm thấy lịch khởi hành");
        navigate("/admin/tour-departures");
        return;
      }

      setFormData({
        departure_date: departure.departure_date || "",
        return_date: departure.return_date || "",
        price: departure.price ?? "",
        total_slots: departure.total_slots ?? "",
        status: departure.status || "open",
      });
    } catch (error) {
      console.error(error);
      alert("Không tải được thông tin lịch khởi hành");
    } finally {
      setLoading(false);
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

    const data = {
      departure_date: formData.departure_date,
      return_date: formData.return_date || null,
      price: formData.price === "" ? null : Number(formData.price),
      total_slots: Number(formData.total_slots),
      status: formData.status,
    };

    try {
      await tourDepartureApi.update(departureId, data);

      alert("Cập nhật lịch khởi hành thành công");
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
        "Cập nhật lịch khởi hành thất bại";

      alert(message);
    }
  };

  if (loading) {
    return <div className="p-6">Đang tải thông tin lịch khởi hành...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Sửa lịch khởi hành</h1>
        <p className="text-gray-500 mt-1">
          Cập nhật thông tin lịch khởi hành.
        </p>
      </div>

      <TourDepartureForm
        formData={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitText="Cập nhật"
        onCancel={() => navigate("/admin/tour-departures")}
      />
    </div>
  );
};

export default TourDepartureEditPage;