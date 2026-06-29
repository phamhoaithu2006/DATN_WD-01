import React from "react";
import { Link } from "react-router-dom";

const TourDepartureTable = ({ departures, selectedTourId, onDelete }) => {
  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("vi-VN");
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined || price === "") return "-";
    return Number(price).toLocaleString("vi-VN") + "đ";
  };

  const getStatusText = (status) => {
    switch (status) {
      case "open":
        return "Đang mở";
      case "closed":
        return "Đã đóng";
      case "completed":
        return "Hoàn thành";
      case "cancelled":
        return "Đã hủy";
      default:
        return status;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <h2 className="text-lg font-semibold mb-4">Danh sách lịch khởi hành</h2>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-3 py-2">STT</th>
              <th className="border px-3 py-2">Ngày đi</th>
              <th className="border px-3 py-2">Ngày về</th>
              <th className="border px-3 py-2">Giá</th>
              <th className="border px-3 py-2">Tổng chỗ</th>
              <th className="border px-3 py-2">Đã đặt</th>
              <th className="border px-3 py-2">Còn lại</th>
              <th className="border px-3 py-2">Trạng thái</th>
              <th className="border px-3 py-2">Hành động</th>
            </tr>
          </thead>

          <tbody>
            {departures.length === 0 ? (
              <tr>
                <td colSpan="9" className="border px-3 py-4 text-center">
                  Chưa có lịch khởi hành
                </td>
              </tr>
            ) : (
              departures.map((item, index) => {
                const totalSlots = Number(item.total_slots || 0);
                const bookedSlots = Number(item.booked_slots || 0);
                const remainSlots = totalSlots - bookedSlots;

                return (
                  <tr key={item.id}>
                    <td className="border px-3 py-2 text-center">
                      {index + 1}
                    </td>
                    <td className="border px-3 py-2">
                      {formatDate(item.departure_date)}
                    </td>
                    <td className="border px-3 py-2">
                      {formatDate(item.return_date)}
                    </td>
                    <td className="border px-3 py-2">
                      {formatPrice(item.price)}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      {totalSlots}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      {bookedSlots}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      {remainSlots}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      {getStatusText(item.status)}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      <Link
                        to={`/admin/tour-departures/${selectedTourId}/edit/${item.id}`}
                        className="bg-yellow-500 text-white px-3 py-1 rounded mr-2 hover:bg-yellow-600"
                      >
                        Sửa
                      </Link>

                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TourDepartureTable;