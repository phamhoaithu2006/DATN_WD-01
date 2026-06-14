/**
 * Lấy thông tin chi tiết của một điểm đến theo ID.
 * * @param  int  $id
 * @return \Illuminate\Http\JsonResponse
 */
public function show($id) 
{
    // Tìm địa điểm theo ID, nếu không thấy sẽ tự động bắn ra ModelNotFoundException (lỗi 404)
    $destination = Destination::findOrFail($id);
    
    // Trả về dữ liệu dưới dạng JSON với cấu trúc rõ ràng
    return response()->json([
        'success' => true,
        'data'    => $destination
    ], 200);
}