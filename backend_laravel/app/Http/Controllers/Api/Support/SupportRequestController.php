<?php

namespace App\Http\Controllers\Api\Support;

use App\Http\Controllers\Controller;
use App\Models\SupportRequest;
use App\Models\SupportRequestHistory;
use App\Models\SupportRequestMessage;
use App\Models\User;
use App\Services\SupportWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Throwable;

class SupportRequestController extends Controller
{
    public function __construct(
        private readonly SupportWorkflowService $workflow
    ) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => [
                'nullable',
                'string',
                'max:255',
            ],

            'status' => [
                'nullable',
                'in:pending,in_progress,resolved',
            ],

            'needs_more_info' => [
                'nullable',
                'boolean',
            ],

            'category' => [
                'nullable',
                'string',
                'max:50',
            ],

            'assigned_to' => [
                'nullable',
                'integer',
                'exists:users,id',
            ],

            'scope' => [
                'nullable',
                'in:mine,all',
            ],
        ]);

        $currentUserId =
            (int) $request->user()->id;

        /*
         * TẤT CẢ NVHT đều xem được toàn bộ ticket.
         * Không filter theo current user.
         */
        $query = SupportRequest::query()
            ->with([
                'user:id,full_name,email,phone,avatar_url',
                'assignedStaff:id,full_name,email,phone,avatar_url',
            ])
            ->withCount('attachments');

        if (! empty($data['search'])) {
            $search =
                trim($data['search']);

            $query->where(
                function ($q) use ($search) {
                    $q
                        ->where(
                            'full_name',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'email',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'phone',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'ticket_code',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'subject',
                            'like',
                            "%{$search}%"
                        );
                }
            );
        }

        if (! empty($data['status'])) {
            if ($data['status'] === 'needs_more_info') {
                $query
                    ->where('status', 'pending')
                    ->where('needs_more_info', true);
            } else {
                $query->where(
                    'status',
                    $data['status']
                );
            }
        }

        if (array_key_exists('needs_more_info', $data)) {
            if ((bool) $data['needs_more_info']) {
                $query->where(
                    'needs_more_info',
                    true
                );
            } else {
                $query->where(
                    function ($q) {
                        $q
                            ->where(
                                'needs_more_info',
                                false
                            )
                            ->orWhereNull(
                                'needs_more_info'
                            );
                    }
                );
            }
        }

        if (! empty($data['category'])) {
            $query->where(
                'category',
                $data['category']
            );
        }

        if (! empty($data['assigned_to'])) {
            $query->where(
                'assigned_to',
                (int) $data['assigned_to']
            );
        }

        /*
         * Tab "Của tôi / Tất cả" chỉ áp dụng cho
         * Đang hỗ trợ và Đã hỗ trợ.
         */
        if (
            in_array(
                $data['status'] ?? null,
                ['in_progress', 'resolved', 'needs_more_info'],
                true
            )
            && ($data['scope'] ?? 'all') === 'mine'
        ) {
            $query->where(
                'assigned_to',
                $currentUserId
            );
        }

        $requests = $query
            ->orderByRaw("
                CASE
                    WHEN status = 'pending' AND needs_more_info = 1 THEN 1
                    WHEN status = 'pending' THEN 2
                    WHEN status = 'in_progress' THEN 3
                    WHEN status = 'resolved' THEN 4
                    ELSE 5
                END
            ")
            ->orderByDesc('created_at')
            ->paginate(10);

        $requests
            ->getCollection()
            ->transform(
                fn (SupportRequest $item) =>
                    $this->decorate(
                        $item,
                        $currentUserId
                    )
            );

        return response()->json([
            'success' => true,

            'data' => $requests,

            'counts' => [
                /*
                 * Chưa hỗ trợ:
                 * Tất cả ticket chưa được tiếp nhận và không chờ bổ sung.
                 */
                'pending' =>
                    SupportRequest::query()
                        ->where(
                            'status',
                            'pending'
                        )
                        ->where(
                            function ($q) {
                                $q
                                    ->where(
                                        'needs_more_info',
                                        false
                                    )
                                    ->orWhereNull(
                                        'needs_more_info'
                                    );
                            }
                        )
                        ->count(),

                /*
                 * Cần bổ sung:
                 * Chỉ tính những ticket thuộc NVHT đang đăng nhập.
                 */
                'needs_more_info' =>
                    SupportRequest::query()
                        ->where(
                            'status',
                            'pending'
                        )
                        ->where(
                            'needs_more_info',
                            true
                        )
                        ->where(
                            'assigned_to',
                            $currentUserId
                        )
                        ->count(),

                /*
                 * Đang hỗ trợ:
                 * Chỉ tính những ticket do NVHT hiện tại tiếp nhận.
                 */
                'in_progress' =>
                    SupportRequest::query()
                        ->where(
                            'status',
                            'in_progress'
                        )
                        ->where(
                            'assigned_to',
                            $currentUserId
                        )
                        ->count(),

                /*
                 * Đã hỗ trợ:
                 * Hiển thị số ticket NVHT hiện tại đã phụ trách.
                 */
                'resolved' =>
                    SupportRequest::query()
                        ->where(
                            'status',
                            'resolved'
                        )
                        ->where(
                            'assigned_to',
                            $currentUserId
                        )
                        ->count(),
            ],
        ]);
    }

    public function assignees(): JsonResponse
    {
        $assignedIds =
            SupportRequest::query()
                ->whereNotNull(
                    'assigned_to'
                )
                ->distinct()
                ->pluck(
                    'assigned_to'
                );

        $users = User::query()
            ->whereIn(
                'id',
                $assignedIds
            )
            ->select([
                'id',
                'full_name',
                'email',
                'avatar_url',
            ])
            ->orderBy(
                'full_name'
            )
            ->get();

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    /**
     * Danh sách NVHT có thể nhận chuyển ticket.
     *
     * Chỉ trả về tài khoản có vai trò Nhân viên hỗ trợ.
     * Không lấy toàn bộ bảng users.
     *
     * Hỗ trợ các cấu trúc CSDL phổ biến của dự án:
     * 1. Bảng support_staff / support_staffs có user_id.
     * 2. users.role lưu trực tiếp role dạng string.
     * 3. users.role_id liên kết bảng roles.
     */
    public function staffOptions(
        Request $request
    ): JsonResponse {
        $currentUserId =
            (int) $request->user()->id;

        $supportUserIds =
            $this->getSupportStaffUserIds();

        /*
         * Nếu không xác định được tài khoản NVHT,
         * trả danh sách rỗng thay vì trả toàn bộ users.
         */
        if ($supportUserIds->isEmpty()) {
            return response()->json([
                'success' => true,
                'data' => [],
            ]);
        }

        /*
         * Tạo map mã NVHT theo user_id.
         *
         * Ưu tiên mã thật trong bảng hồ sơ NVHT.
         * Nếu dự án chưa có cột mã riêng thì fallback NVHT-{user_id}.
         */
        $staffCodeMap = collect();

        foreach (
            [
                'support_staff',
                'support_staffs',
            ] as $table
        ) {
            if (
                ! Schema::hasTable($table)
                || ! Schema::hasColumn(
                    $table,
                    'user_id'
                )
            ) {
                continue;
            }

            $codeColumn = collect([
                'staff_code',
                'employee_code',
                'support_staff_code',
                'code',
                'ma_nhan_vien',
                'ma_nv',
            ])->first(
                fn ($column) =>
                    Schema::hasColumn(
                        $table,
                        $column
                    )
            );

            if (! $codeColumn) {
                continue;
            }

            $staffCodeMap =
                DB::table($table)
                    ->whereIn(
                        'user_id',
                        $supportUserIds
                    )
                    ->pluck(
                        $codeColumn,
                        'user_id'
                    );

            if ($staffCodeMap->isNotEmpty()) {
                break;
            }
        }

        $users = User::query()
            ->select([
                'id',
                'full_name',
                'email',
                'avatar_url',
            ])
            ->whereIn(
                'id',
                $supportUserIds
            )
            ->where(
                'id',
                '!=',
                $currentUserId
            )
            ->orderBy(
                'full_name'
            )
            ->get()
            ->map(
                function ($user) use (
                    $staffCodeMap
                ) {
                    $realCode =
                        $staffCodeMap->get(
                            $user->id
                        );

                    $user->staff_code =
                        $realCode
                        ?: sprintf(
                            'NVHT-%04d',
                            $user->id
                        );

                    return $user;
                }
            )
            ->values();

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    /**
     * Lấy danh sách user_id thuộc vai trò Nhân viên hỗ trợ.
     *
     * Không fallback sang toàn bộ users để tránh hiển thị
     * Admin / Customer / Guide trong dropdown chuyển NVHT.
     */
    private function getSupportStaffUserIds()
    {
        $ids = collect();

        /*
         * Trường hợp dự án có bảng hồ sơ NVHT riêng.
         */
        foreach (
            [
                'support_staff',
                'support_staffs',
            ] as $table
        ) {
            if (
                ! Schema::hasTable($table)
                || ! Schema::hasColumn(
                    $table,
                    'user_id'
                )
            ) {
                continue;
            }

            $query = DB::table(
                $table
            )
                ->whereNotNull(
                    'user_id'
                );

            /*
             * Nếu bảng NVHT có cột status thì
             * chỉ lấy nhân viên đang active.
             */
            if (
                Schema::hasColumn(
                    $table,
                    'status'
                )
            ) {
                $query->where(
                    'status',
                    'active'
                );
            }

            $ids = $query->pluck(
                'user_id'
            );

            if ($ids->isNotEmpty()) {
                return $ids
                    ->filter()
                    ->map(
                        fn ($id) =>
                            (int) $id
                    )
                    ->unique()
                    ->values();
            }
        }

        /*
         * Trường hợp users có cột role dạng string.
         */
        if (
            Schema::hasTable('users')
            && Schema::hasColumn(
                'users',
                'role'
            )
        ) {
            $ids = User::query()
                ->whereRaw(
                    'LOWER(role) IN (?, ?, ?)',
                    [
                        'support staff',
                        'support_staff',
                        'support',
                    ]
                )
                ->pluck('id');

            if ($ids->isNotEmpty()) {
                return $ids
                    ->filter()
                    ->map(
                        fn ($id) =>
                            (int) $id
                    )
                    ->unique()
                    ->values();
            }
        }

        /*
         * Trường hợp users.role_id -> roles.id.
         */
        if (
            Schema::hasTable('users')
            && Schema::hasTable('roles')
            && Schema::hasColumn(
                'users',
                'role_id'
            )
            && Schema::hasColumn(
                'roles',
                'id'
            )
            && Schema::hasColumn(
                'roles',
                'name'
            )
        ) {
            $ids = DB::table(
                'users'
            )
                ->join(
                    'roles',
                    'roles.id',
                    '=',
                    'users.role_id'
                )
                ->whereRaw(
                    'LOWER(roles.name) IN (?, ?, ?)',
                    [
                        'support staff',
                        'support_staff',
                        'support',
                    ]
                )
                ->pluck(
                    'users.id'
                );
        }

        return $ids
            ->filter()
            ->map(
                fn ($id) =>
                    (int) $id
            )
            ->unique()
            ->values();
    }

    public function show(
        Request $request,
        SupportRequest $supportRequest
    ): JsonResponse {
        $supportRequest->load([
            'user:id,full_name,email,phone,avatar_url',
            'assignedStaff:id,full_name,email,phone,avatar_url',
            'attachments',
        ]);

        return response()->json([
            'success' => true,

            'data' =>
                $this->decorate(
                    $supportRequest,
                    (int) $request->user()->id
                ),
        ]);
    }

    public function badgeCount(
        Request $request
    ): JsonResponse {
        $currentUserId =
            (int) $request->user()->id;

        /*
         * Badge menu "Yêu cầu hỗ trợ" =
         *
         * 1. Tất cả yêu cầu Chưa hỗ trợ
         * 2. Yêu cầu Cần bổ sung do chính NVHT này phụ trách
         * 3. Yêu cầu Đang hỗ trợ do chính NVHT này phụ trách
         *
         * Không tính ticket của NVHT khác vào badge cá nhân.
         */
        $pendingCount =
            SupportRequest::query()
                ->where(
                    'status',
                    'pending'
                )
                ->where(
                    function ($q) {
                        $q
                            ->where(
                                'needs_more_info',
                                false
                            )
                            ->orWhereNull(
                                'needs_more_info'
                            );
                    }
                )
                ->count();

        $needsMoreInfoMineCount =
            SupportRequest::query()
                ->where(
                    'status',
                    'pending'
                )
                ->where(
                    'needs_more_info',
                    true
                )
                ->where(
                    'assigned_to',
                    $currentUserId
                )
                ->count();

        $inProgressMineCount =
            SupportRequest::query()
                ->where(
                    'status',
                    'in_progress'
                )
                ->where(
                    'assigned_to',
                    $currentUserId
                )
                ->count();

        $count =
            $pendingCount
            + $needsMoreInfoMineCount
            + $inProgressMineCount;

        return response()->json([
            'count' => $count,

            /*
             * Trả thêm breakdown để frontend có thể dùng sau này.
             */
            'data' => [
                'pending' =>
                    $pendingCount,

                'needs_more_info' =>
                    $needsMoreInfoMineCount,

                'in_progress' =>
                    $inProgressMineCount,

                'total' =>
                    $count,
            ],
        ]);
    }

    /**
     * TIẾP NHẬN:
     * pending -> in_progress
     */
    public function claim(
        Request $request,
        SupportRequest $supportRequest
    ): JsonResponse {
        $currentUser =
            $request->user();

        $updated =
            DB::transaction(
                function () use (
                    $supportRequest,
                    $currentUser
                ) {
                    $locked =
                        SupportRequest::query()
                            ->lockForUpdate()
                            ->findOrFail(
                                $supportRequest->id
                            );

                    if (
                        $locked->status !==
                        'pending'
                        ||
                        (bool) $locked->needs_more_info
                    ) {
                        return null;
                    }

                    $oldStatus =
                        $locked->status;

                    $locked->update([
                        'status' =>
                            'in_progress',

                        'assigned_to' =>
                            $currentUser->id,

                        'started_at' =>
                            now(),

                        'resolved_at' =>
                            null,
                    ]);

                    $this->addHistory(
                        $locked,
                        $currentUser->id,
                        'claimed',
                        $oldStatus,
                        'in_progress',
                        "{$currentUser->full_name} đã tiếp nhận yêu cầu."
                    );

                    return $locked;
                },
                3
            );

        if (! $updated) {
            return response()->json([
                'success' => false,

                'message' =>
                    'Yêu cầu này đã được một nhân viên hỗ trợ khác tiếp nhận.',
            ], 409);
        }

        return $this->freshResponse(
            $updated,
            (int) $currentUser->id,
            'Bạn đã tiếp nhận yêu cầu này.'
        );
    }

    /**
     * TRẢ VỀ KHO:
     * in_progress -> pending
     */
    public function release(
        Request $request,
        SupportRequest $supportRequest
    ): JsonResponse {
        $currentUser =
            $request->user();

        $supportRequest->refresh();

        if (
            $supportRequest->status !==
                'in_progress'
            ||
            (int) $supportRequest
                ->assigned_to !==
                (int) $currentUser->id
        ) {
            return response()->json([
                'success' => false,

                'message' =>
                    'Bạn không phải nhân viên đang xử lý yêu cầu này.',
            ], 403);
        }

        $supportRequest->update([
            'status' => 'pending',
            'assigned_to' => null,
            'started_at' => null,
            'resolved_at' => null,
        ]);

        $this->addHistory(
            $supportRequest,
            $currentUser->id,
            'released',
            'in_progress',
            'pending',
            "{$currentUser->full_name} đã trả yêu cầu về kho chưa hỗ trợ."
        );

        return $this->freshResponse(
            $supportRequest,
            (int) $currentUser->id,
            'Đã trả yêu cầu về danh sách Chưa hỗ trợ.'
        );
    }

    /**
     * HOÀN TẤT:
     * in_progress -> resolved
     */
    public function resolve(
        Request $request,
        SupportRequest $supportRequest
    ): JsonResponse {
        $currentUser =
            $request->user();

        $supportRequest->refresh();

        if (
            $supportRequest->status !==
                'in_progress'
            ||
            (int) $supportRequest
                ->assigned_to !==
                (int) $currentUser->id
        ) {
            return response()->json([
                'success' => false,

                'message' =>
                    'Chỉ nhân viên đang xử lý yêu cầu này mới có thể hoàn tất.',
            ], 403);
        }

        $supportRequest->update([
            'status' =>
                'resolved',

            /*
             * Giữ assigned_to để lưu
             * người đã hỗ trợ.
             */
            'resolved_at' =>
                now(),
        ]);

        $this->addHistory(
            $supportRequest,
            $currentUser->id,
            'resolved',
            'in_progress',
            'resolved',
            "{$currentUser->full_name} đã hoàn tất hỗ trợ."
        );

        return $this->freshResponse(
            $supportRequest,
            (int) $currentUser->id,
            'Yêu cầu hỗ trợ đã được hoàn tất.'
        );
    }

    /**
     * CHUYỂN NVHT.
     *
     * Bắt buộc:
     * - assigned_to mới
     * - lý do chuyển
     *
     * Sau khi chuyển:
     * - Ticket vẫn in_progress
     * - assigned_to đổi sang NVHT mới
     * - Người chuyển nhận thông báo xác nhận đã chuyển
     * - Người được chuyển nhận thông báo được giao ticket mới
     * - Ghi lịch sử chuyển NVHT
     */
    public function transfer(
        Request $request,
        SupportRequest $supportRequest
    ): JsonResponse {
        $data =
            $request->validate([
                'assigned_to' => [
                    'required',
                    'integer',
                    'exists:users,id',
                ],

                'reason' => [
                    'required',
                    'string',
                    'min:3',
                    'max:1000',
                ],
            ]);

        $currentUser =
            $request->user();

        /*
         * Chỉ cho phép chuyển tới tài khoản NVHT.
         * Không chỉ dựa vào exists:users,id.
         */
        $supportStaffUserIds =
            $this->getSupportStaffUserIds();

        if (
            ! $supportStaffUserIds->contains(
                (int) $data['assigned_to']
            )
        ) {
            return response()->json([
                'success' => false,

                'message' =>
                    'Tài khoản được chọn không phải nhân viên hỗ trợ.',
            ], 422);
        }

        $result = DB::transaction(
            function () use (
                $supportRequest,
                $currentUser,
                $data
            ) {
                $ticket =
                    SupportRequest::query()
                        ->lockForUpdate()
                        ->findOrFail(
                            $supportRequest->id
                        );

                if (
                    $ticket->status !==
                        'in_progress'
                    ||
                    (int) $ticket
                        ->assigned_to !==
                        (int) $currentUser->id
                ) {
                    return [
                        'error' =>
                            'forbidden',
                    ];
                }

                if (
                    $ticket
                        ->admin_request_status ===
                        'pending'
                ) {
                    return [
                        'error' =>
                            'admin_pending',
                    ];
                }

                if (
                    (int) $data['assigned_to'] ===
                    (int) $currentUser->id
                ) {
                    return [
                        'error' =>
                            'same_staff',
                    ];
                }

                $newStaff =
                    User::query()
                        ->findOrFail(
                            $data['assigned_to']
                        );

                $oldAssigneeId =
                    (int) $ticket
                        ->assigned_to;

                $ticket->forceFill([
                    /*
                     * Ticket vẫn đang được xử lý,
                     * chỉ đổi người phụ trách.
                     */
                    'status' =>
                        'in_progress',

                    'assigned_to' =>
                        $newStaff->id,
                ])->save();

                $this->addHistory(
                    $ticket,
                    (int) $currentUser->id,
                    'transferred',
                    'in_progress',
                    'in_progress',
                    "{$currentUser->full_name} đã chuyển yêu cầu cho {$newStaff->full_name}. Lý do: {$data['reason']}",
                    [
                        'from_assignee_id' =>
                            $oldAssigneeId,

                        'to_assignee_id' =>
                            (int) $newStaff->id,

                        'from_staff_name' =>
                            $currentUser->full_name,

                        'to_staff_name' =>
                            $newStaff->full_name,

                        'reason' =>
                            $data['reason'],
                    ]
                );

                return [
                    'ticket' =>
                        $ticket->fresh(),

                    'new_staff' =>
                        $newStaff,
                ];
            },
            3
        );

        if (
            ($result['error'] ?? null) ===
            'forbidden'
        ) {
            return response()->json([
                'success' => false,

                'message' =>
                    'Chỉ nhân viên đang xử lý yêu cầu này mới có thể chuyển cho nhân viên khác.',
            ], 403);
        }

        if (
            ($result['error'] ?? null) ===
            'admin_pending'
        ) {
            return response()->json([
                'success' => false,

                'message' =>
                    'Ticket đang chờ Admin xử lý nên không thể chuyển nhân viên hỗ trợ.',
            ], 422);
        }

        if (
            ($result['error'] ?? null) ===
            'same_staff'
        ) {
            return response()->json([
                'success' => false,

                'message' =>
                    'Yêu cầu đang do bạn xử lý, vui lòng chọn nhân viên khác.',
            ], 422);
        }

        /** @var SupportRequest $updatedTicket */
        $updatedTicket =
            $result['ticket'];

        /** @var User $newStaff */
        $newStaff =
            $result['new_staff'];

        /*
         * Thông báo cho NGƯỜI CHUYỂN.
         *
         * Mục đích:
         * - Xác nhận ticket đã được chuyển thành công.
         * - Có thể bấm thông báo để mở lại ticket.
         */
        $this->workflow->notifyUser(
            (int) $currentUser->id,
            'Đã chuyển yêu cầu hỗ trợ',
            "Bạn đã chuyển yêu cầu {$updatedTicket->ticket_code} cho {$newStaff->full_name}.",
            'support_request_transferred_out',
            (int) $updatedTicket->id
        );

        /*
         * Thông báo cho NGƯỜI ĐƯỢC CHUYỂN.
         *
         * Ticket sẽ xuất hiện trong:
         * Đang hỗ trợ -> Của tôi
         */
        $this->workflow->notifyUser(
            (int) $newStaff->id,
            'Bạn được giao yêu cầu hỗ trợ mới',
            "Bạn vừa được giao xử lý yêu cầu {$updatedTicket->ticket_code} từ {$currentUser->full_name}.",
            'support_request_transferred_in',
            (int) $updatedTicket->id
        );

        /*
         * Yêu cầu sidebar / badge / notification bell cập nhật
         * ở phía frontend sau khi API trả về thành công.
         */
        return $this->freshResponse(
            $updatedTicket,
            (int) $currentUser->id,
            "Đã chuyển yêu cầu cho {$newStaff->full_name}. Cả bạn và nhân viên được chuyển đã nhận thông báo."
        );
    }

    /**
     * LỊCH SỬ TRAO ĐỔI.
     */
    public function messages(
        SupportRequest $supportRequest
    ): JsonResponse {
        $messages =
            $supportRequest
                ->messages()
                ->with([
                    'sender:id,full_name,email,avatar_url',
                    'attachments',
                ])
                ->orderBy(
                    'created_at'
                )
                ->get();

        return response()->json([
            'success' => true,
            'data' => $messages,
        ]);
    }

    /**
     * NVHT GỬI PHẢN HỒI.
     *
     * Chỉ NVHT đang phụ trách
     * mới được gửi phản hồi.
     */
    public function sendMessage(
        Request $request,
        SupportRequest $supportRequest
    ): JsonResponse {
        $currentUser =
            $request->user();

        $supportRequest->refresh();

        if (
            $supportRequest->status !==
                'in_progress'
            ||
            (int) $supportRequest
                ->assigned_to !==
                (int) $currentUser->id
        ) {
            return response()->json([
                'success' => false,

                'message' =>
                    'Chỉ nhân viên đang phụ trách mới có thể gửi phản hồi.',
            ], 403);
        }

        $data =
            $request->validate([
                'message' => [
                    'nullable',
                    'string',
                    'max:10000',
                    'required_without:attachments',
                ],

                'attachments' => [
                    'nullable',
                    'array',
                    'max:5',
                ],

                'attachments.*' => [
                    'file',
                    'mimes:jpg,jpeg,png,webp,pdf,doc,docx',
                    'max:5120',
                ],
            ]);

        $storedPaths = [];

        try {
            $message =
                DB::transaction(
                    function () use (
                        $request,
                        $data,
                        $supportRequest,
                        $currentUser,
                        &$storedPaths
                    ) {
                        $message =
                            SupportRequestMessage::query()
                                ->create([
                                    'support_request_id' =>
                                        $supportRequest->id,

                                    'sender_id' =>
                                        $currentUser->id,

                                    'sender_type' =>
                                        'support_staff',

                                    'message' =>
                                        $data['message']
                                        ?? null,
                                ]);

                        if (
                            $request->hasFile(
                                'attachments'
                            )
                        ) {
                            foreach (
                                $request->file(
                                    'attachments'
                                ) as $file
                            ) {
                                $path =
                                    $file->store(
                                        "support-request-messages/{$supportRequest->id}/{$message->id}",
                                        'public'
                                    );

                                $storedPaths[] =
                                    $path;

                                $message
                                    ->attachments()
                                    ->create([
                                        'original_name' =>
                                            $file->getClientOriginalName(),

                                        'file_path' =>
                                            $path,

                                        'mime_type' =>
                                            $file->getMimeType(),

                                        'size' =>
                                            $file->getSize(),
                                    ]);
                            }
                        }

                        $this->addHistory(
                            $supportRequest,
                            $currentUser->id,
                            'message_sent',
                            $supportRequest->status,
                            $supportRequest->status,
                            "{$currentUser->full_name} đã gửi phản hồi cho khách hàng."
                        );

                        $this->notifyCustomer(
                            $supportRequest,
                            $currentUser
                        );

                        return $message;
                    },
                    3
                );

            $message->load([
                'sender:id,full_name,email,avatar_url',
                'attachments',
            ]);

            return response()->json([
                'success' => true,

                'message' =>
                    'Đã gửi phản hồi.',

                'data' =>
                    $message,
            ], 201);
        } catch (Throwable $exception) {
            foreach (
                $storedPaths as $path
            ) {
                Storage::disk(
                    'public'
                )->delete(
                    $path
                );
            }

            throw $exception;
        }
    }

    /**
     * LỊCH SỬ TRẠNG THÁI / XỬ LÝ.
     */
    public function history(
        SupportRequest $supportRequest
    ): JsonResponse {
        $items =
            $supportRequest
                ->histories()
                ->with([
                    'actor:id,full_name,email,avatar_url',
                ])
                ->orderBy(
                    'created_at'
                )
                ->get();

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    private function decorate(
        SupportRequest $supportRequest,
        int $currentUserId
    ): SupportRequest {
        $isMine =
            $supportRequest
                ->assigned_to !==
                null
            &&
            (int) $supportRequest
                ->assigned_to ===
                $currentUserId;

        $supportRequest
            ->setAttribute(
                'is_mine',
                $isMine
            );

        $supportRequest
            ->setAttribute(
                'can_claim',
                $supportRequest
                    ->status ===
                    'pending'
                &&
                ! (bool) $supportRequest
                    ->needs_more_info
            );

        $supportRequest
            ->setAttribute(
                'can_release',
                $supportRequest
                    ->status ===
                    'in_progress'
                &&
                $isMine
            );

        $supportRequest
            ->setAttribute(
                'can_resolve',
                $supportRequest
                    ->status ===
                    'in_progress'
                &&
                $isMine
            );

        $supportRequest
            ->setAttribute(
                'can_transfer',
                $supportRequest
                    ->status ===
                    'in_progress'
                &&
                $isMine
            );

        $supportRequest
            ->setAttribute(
                'can_reply',
                $supportRequest
                    ->status ===
                    'in_progress'
                &&
                $isMine
            );

        return $supportRequest;
    }

    private function freshResponse(
        SupportRequest $supportRequest,
        int $currentUserId,
        string $message
    ): JsonResponse {
        $supportRequest->refresh();

        $supportRequest->load([
            'user:id,full_name,email,phone,avatar_url',
            'assignedStaff:id,full_name,email,phone,avatar_url',
            'attachments',
        ]);

        return response()->json([
            'success' => true,

            'message' =>
                $message,

            'data' =>
                $this->decorate(
                    $supportRequest,
                    $currentUserId
                ),
        ]);
    }

    private function addHistory(
        SupportRequest $supportRequest,
        ?int $actorId,
        string $action,
        ?string $fromStatus,
        ?string $toStatus,
        ?string $description = null,
        ?array $meta = null
    ): void {
        SupportRequestHistory::query()
            ->create([
                'support_request_id' =>
                    $supportRequest->id,

                'actor_id' =>
                    $actorId,

                'action' =>
                    $action,

                'from_status' =>
                    $fromStatus,

                'to_status' =>
                    $toStatus,

                'description' =>
                    $description,

                'meta' =>
                    $meta,
            ]);
    }

    /**
     * Tạo notification cho khách khi NVHT trả lời.
     *
     * Dùng DB trực tiếp để tránh phụ thuộc fillable
     * của Notification model hiện tại.
     */
    private function notifyCustomer(
        SupportRequest $supportRequest,
        User $staff
    ): void {
        if (
            ! $supportRequest
                ->user_id
            ||
            ! Schema::hasTable(
                'notifications'
            )
        ) {
            return;
        }

        $data = [
            'user_id' =>
                $supportRequest->user_id,

            'title' =>
                'Yêu cầu hỗ trợ có phản hồi mới',

            'message' =>
                "{$staff->full_name} vừa phản hồi yêu cầu {$supportRequest->ticket_code}.",

            'status' =>
                'unread',

            'created_at' =>
                now(),

            'updated_at' =>
                now(),
        ];

        if (
            Schema::hasColumn(
                'notifications',
                'type'
            )
        ) {
            $data['type'] =
                'system';
        }

        if (
            Schema::hasColumn(
                'notifications',
                'draft_id'
            )
        ) {
            $data['draft_id'] =
                null;
        }

        DB::table(
            'notifications'
        )->insert(
            $data
        );
    }
}