
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class CustomerController extends Controller
{
    public function index(): JsonResponse
    {
        // Lấy tất cả người dùng có role_id = 2 (dựa vào bảng roles của bạn)
        $customers = User::where('role_id', 2)->get();

        return response()->json([
            'status' => 'success',
            'data' => $customers
        ], 200);
    }
}