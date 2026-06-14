<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Destination;
use Illuminate\Http\Request;

class DestinationController extends Controller
{
    /**
 * Lấy danh sách tất cả các điểm đến (Destinations).
 * * @return \Illuminate\Http\JsonResponse
 */
public function index()
{
    // Lấy toàn bộ bản ghi từ bảng destinations
    return response()->json(Destination::all(), 200);
}

/**
 * Thêm mới một điểm đến vào cơ sở dữ liệu.
 * * @param  \Illuminate\Http\Request  $request
 * @return \Illuminate\Http\JsonResponse
 */
public function store(Request $request)
{
    // Xác thực dữ liệu đầu vào
    $data = $request->validate([
        'name'          => 'required|string',
        'slug'          => 'required|unique:destinations', // Đảm bảo slug là duy nhất
        'province_city' => 'required',
        'country'       => 'required',
    ]);

    // Tạo mới và trả về dữ liệu vừa tạo với mã trạng thái 201 (Created)
    return response()->json(Destination::create($data), 201);
}

/**
 * Cập nhật thông tin của một điểm đến theo ID.
 * * @param  \Illuminate\Http\Request  $request
 * @param  int  $id
 * @return \Illuminate\Http\JsonResponse
 */
public function update(Request $request, $id)
{
    // Tìm kiếm bản ghi hoặc trả về lỗi 404 nếu không tìm thấy
    $destination = Destination::findOrFail($id);
    
    // Cập nhật thông tin với toàn bộ dữ liệu từ request
    $destination->update($request->all());
    
    return response()->json($destination, 200);
}

/**
 * Xóa một điểm đến (Thực hiện Soft Delete nếu model có trait SoftDeletes).
 * * @param  int  $id
 * @return \Illuminate\Http\JsonResponse
 */
public function destroy($id)
{
    // Tìm bản ghi và thực hiện lệnh xóa
    Destination::findOrFail($id)->delete();
    
    return response()->json(['message' => 'Đã xóa thành công'], 200);
}
}
