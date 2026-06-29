import React from "react";

const TourDepartureForm = ({
  formData,
  onChange,
  onSubmit,
  submitText = "Lưu",
  onCancel,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-lg shadow p-5 grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <div>
        <label className="block text-sm font-medium mb-1">
          Ngày khởi hành
        </label>
        <input
          type="date"
          name="departure_date"
          value={formData.departure_date}
          onChange={onChange}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Ngày về</label>
        <input
          type="date"
          name="return_date"
          value={formData.return_date}
          onChange={onChange}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Giá</label>
        <input
          type="number"
          name="price"
          value={formData.price}
          onChange={onChange}
          min="0"
          className="w-full border rounded px-3 py-2"
          placeholder="VD: 3500000"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Tổng số chỗ</label>
        <input
          type="number"
          name="total_slots"
          value={formData.total_slots}
          onChange={onChange}
          min="1"
          required
          className="w-full border rounded px-3 py-2"
          placeholder="VD: 30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Trạng thái</label>
        <select
          name="status"
          value={formData.status}
          onChange={onChange}
          required
          className="w-full border rounded px-3 py-2"
        >
          <option value="open">Đang mở</option>
          <option value="closed">Đã đóng</option>
          <option value="completed">Hoàn thành</option>
          <option value="cancelled">Đã hủy</option>
        </select>
      </div>

      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {submitText}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Hủy
          </button>
        )}
      </div>
    </form>
  );
};

export default TourDepartureForm;