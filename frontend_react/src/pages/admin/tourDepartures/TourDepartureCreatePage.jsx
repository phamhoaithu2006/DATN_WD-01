import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { tourDepartureApi } from "../../../services/tourDepartureApi";
import TourDepartureForm from "../../../components/admin/tourDepartures/TourDepartureForm";

const emptyForm = {
  departure_date: "",
  return_date: "",
  price: "",
  total_slots: "",
  status: "open",
};

const getArrayFromResponse = (res) => {
  if (Array.isArray(res?.data?.data)) return res.data.data;

  if (Array.isArray(res?.data?.data?.data)) {
    return res.data.data.data;
  }

  if (Array.isArray(res?.data)) return res.data;

  return [];
};

const getTourName = (tour) => {
  return (
    tour?.title ||
    tour?.name ||
    tour?.tour_name ||
    tour?.name_tour ||
    `Tour #${tour?.id}`
  );
};

const getErrorMessage = (error, fallback) => {
  const errors = error?.response?.data?.errors;

  if (errors) {
    return Object.values(errors).flat().join(" ");
  }

  return error?.response?.data?.message || fallback;
};

const TourDepartureCreatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialTourId = searchParams.get("tourId") || "";

  const [tours, setTours] = useState([]);
  const [selectedTourId, setSelectedTourId] = useState(initialTourId);
  const [formData, setFormData] = useState(emptyForm);

  const [loadingTours, setLoadingTours] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const guideAssignmentUrl = useMemo(() => {
    if (!selectedTourId) {
      return "/admin/tour-departures/guide-assignments";
    }

    return `/admin/tour-departures/guide-assignments?tourId=${encodeURIComponent(
      selectedTourId
    )}`;
  }, [selectedTourId]);

  useEffect(() => {
    const fetchTours = async () => {
      try {
        setLoadingTours(true);
        setError("");

        const res = await tourDepartureApi.getTours();
        const list = getArrayFromResponse(res);

        setTours(list);

        setSelectedTourId((currentTourId) => {
          if (currentTourId) return currentTourId;

          if (list.length > 0) {
            return String(list[0].id);
          }

          return "";
        });
      } catch (err) {
        console.error(err);

        setError(
          getErrorMessage(err, "Không tải được danh sách tour.")
        );
      } finally {
        setLoadingTours(false);
      }
    };

    fetchTours();
  }, []);

  useEffect(() => {
    if (initialTourId) {
      setSelectedTourId(initialTourId);
    }
  }, [initialTourId]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setMessage("");
  };

  const handleTourChange = (event) => {
    setSelectedTourId(event.target.value);
    setError("");
    setMessage("");
  };

  const validateForm = () => {
    if (!selectedTourId) {
      return "Vui lòng chọn tour.";
    }

    if (!formData.departure_date) {
      return "Vui lòng chọn ngày khởi hành.";
    }

    if (
      formData.return_date &&
      formData.return_date < formData.departure_date
    ) {
      return "Ngày về không được nhỏ hơn ngày khởi hành.";
    }

    const totalSlots = Number(formData.total_slots);

    if (
      formData.total_slots === "" ||
      !Number.isInteger(totalSlots) ||
      totalSlots <= 0
    ) {
      return "Tổng số chỗ phải là số nguyên lớn hơn 0.";
    }

    if (
      formData.price !== "" &&
      (Number.isNaN(Number(formData.price)) ||
        Number(formData.price) < 0)
    ) {
      return "Giá tour phải là số lớn hơn hoặc bằng 0.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      departure_date: formData.departure_date,
      return_date: formData.return_date || null,
      price: formData.price === "" ? null : Number(formData.price),
      total_slots: Number(formData.total_slots),
      status: formData.status || "open",
    };

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      await tourDepartureApi.create(selectedTourId, payload);

      setMessage("Thêm lịch khởi hành thành công.");

      setTimeout(() => {
        navigate(
          `/admin/tour-departures/guide-assignments?tourId=${encodeURIComponent(
            selectedTourId
          )}`
        );
      }, 700);
    } catch (err) {
      console.error(err);

      setError(
        getErrorMessage(err, "Thêm lịch khởi hành thất bại.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Lịch khởi hành
        </h1>

        <p className="mt-1 text-gray-500">
          Tạo lịch mới và phân công hướng dẫn viên cho từng lịch khởi hành.
        </p>
      </div>

      <div className="mb-6 flex gap-2 border-b border-slate-200">
        <NavLink
          to="/admin/tour-departures/create"
          className="border-b-2 border-blue-600 px-4 py-3 text-sm font-bold text-blue-600"
        >
          Thêm lịch khởi hành
        </NavLink>

        <NavLink
          to={guideAssignmentUrl}
          className="border-b-2 border-transparent px-4 py-3 text-sm font-bold text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
        >
          Phân công HDV
        </NavLink>
      </div>

      {message ? (
        <div className="mb-5 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
          <span>{message}</span>

          <button
            type="button"
            onClick={() => setMessage("")}
            className="text-lg font-bold"
          >
            ×
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="mb-5 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            className="text-lg font-bold"
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="mb-6 rounded-xl bg-white p-5 shadow">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Chọn tour
        </label>

        <select
          value={selectedTourId}
          onChange={handleTourChange}
          disabled={loadingTours || submitting}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          <option value="">
            {loadingTours ? "Đang tải danh sách tour..." : "-- Chọn tour --"}
          </option>

          {tours.map((tour) => (
            <option key={tour.id} value={tour.id}>
              {getTourName(tour)}
            </option>
          ))}
        </select>

        {!loadingTours && tours.length === 0 ? (
          <p className="mt-2 text-sm text-amber-600">
            Chưa có tour nào trong hệ thống.
          </p>
        ) : null}
      </div>

      <div className={submitting ? "pointer-events-none opacity-60" : ""}>
        <TourDepartureForm
          formData={formData}
          onChange={handleChange}
          onSubmit={handleSubmit}
          submitText={submitting ? "Đang thêm..." : "Thêm mới"}
          onCancel={() => navigate("/admin/tour-departures")}
        />
      </div>
    </div>
  );
};

export default TourDepartureCreatePage;