<?php

namespace App\Http\Controllers\Api\Support;

use App\Http\Controllers\Controller;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use Illuminate\Http\Request;

class SupportChatController extends Controller
{
    /**
     * Danh sách các cuộc chat đang chờ nhân viên tiếp nhận
     * (mode = pending_human, chưa ai nhận)
     */
    public function pendingList()
    {
        $conversations = ChatConversation::where('mode', 'pending_human')
            ->whereNull('assigned_staff_id')
            ->with(['messages' => function ($q) {
                $q->orderByDesc('id')->limit(1); // chỉ lấy tin nhắn cuối để hiển thị preview
            }])
            ->orderBy('handoff_requested_at')
            ->get()
            ->map(function ($conv) {
                return [
                    'id'                    => $conv->id,
                    'session_id'            => $conv->session_id,
                    'handoff_requested_at'  => $conv->handoff_requested_at,
                    'last_message'          => $conv->messages->first()->content ?? '',
                ];
            });

        return response()->json(['data' => $conversations]);
    }

    /**
     * Danh sách các cuộc chat nhân viên đang hiện đang xử lý (của chính mình)
     */
    public function myActiveList(Request $request)
    {
        $staffId = $request->user()->id;

        $conversations = ChatConversation::where('mode', 'human')
            ->where('assigned_staff_id', $staffId)
            ->with(['messages' => function ($q) {
                $q->orderByDesc('id')->limit(1);
            }])
            ->orderByDesc('handoff_requested_at')
            ->get()
            ->map(function ($conv) {
                return [
                    'id'                   => $conv->id,
                    'session_id'           => $conv->session_id,
                    'handoff_requested_at' => $conv->handoff_requested_at,
                    'last_message'         => $conv->messages->first()->content ?? '',
                ];
            });

        return response()->json(['data' => $conversations]);
    }

    /**
     * Nhân viên bấm "Tiếp nhận" - gán bản thân vào cuộc chat này
     */
    public function accept(Request $request, ChatConversation $conversation)
    {
        if ($conversation->mode !== 'pending_human') {
            return response()->json([
                'message' => 'Cuộc trò chuyện này không còn ở trạng thái chờ tiếp nhận.',
            ], 409);
        }

        $conversation->update([
            'mode'               => 'human',
            'assigned_staff_id'  => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Đã tiếp nhận yêu cầu.',
            'data'    => $conversation->fresh(),
        ]);
    }

    /**
     * Xem toàn bộ lịch sử tin nhắn của 1 cuộc chat (để nhân viên đọc trước khi trả lời)
     */
    public function show(ChatConversation $conversation)
    {
        $messages = $conversation->messages()
            ->orderBy('id')
            ->get(['id', 'role', 'content', 'attachment_url', 'created_at']); // đã thêm attachment_url

        return response()->json([
            'conversation' => $conversation,
            'messages'     => $messages,
        ]);
    }

    /**
     * Nhân viên gửi tin nhắn trả lời trực tiếp cho khách
     */
    public function reply(Request $request, ChatConversation $conversation)
    {
        $validated = $request->validate([
            'content' => 'nullable|string|max:1000',
            'image'   => 'nullable|image|max:5120',
        ]);

        if (empty($validated['content']) && !$request->hasFile('image')) {
            return response()->json(['message' => 'Vui lòng nhập nội dung hoặc chọn ảnh.'], 422);
        }

        if ($conversation->mode !== 'human' || $conversation->assigned_staff_id !== $request->user()->id) {
            return response()->json(['message' => 'Bạn không có quyền trả lời cuộc trò chuyện này.'], 403);
        }

        $attachmentUrl = null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('chat-attachments', 'public');
            $attachmentUrl = $this->buildAttachmentUrl($request, $path);
        }

        $message = ChatMessage::create([
            'chat_conversation_id' => $conversation->id,
            'role'            => 'staff',
            'content'         => $validated['content'] ?? '',
            'attachment_url'  => $attachmentUrl,
        ]);

        return response()->json(['data' => $message]);
    }

    /**
     * Nhân viên đóng yêu cầu - trả lại quyền trả lời cho AI
     */
    public function close(Request $request, ChatConversation $conversation)
    {
        if ($conversation->assigned_staff_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Bạn không có quyền đóng cuộc trò chuyện này.',
            ], 403);
        }

        $conversation->update([
            'mode'                       => 'ai',
            'assigned_staff_id'          => null,
            'handoff_closed_at'          => now(),
            'consecutive_fallback_count' => 0,
        ]);

        ChatMessage::create([
            'chat_conversation_id' => $conversation->id,
            'role'    => 'staff',
            'content' => 'Nhân viên đã kết thúc phiên hỗ trợ. Nếu bạn cần thêm trợ giúp, mình (trợ lý AI) sẵn sàng hỗ trợ tiếp nhé!',
        ]);

        return response()->json(['message' => 'Đã đóng yêu cầu.']);
    }

    private function buildAttachmentUrl(Request $request, string $path): string
    {
        return $request->getSchemeAndHttpHost() . '/storage/' . $path;
    }
}
