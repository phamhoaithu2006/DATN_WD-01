<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\TourDeparture;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminTourDepartureBookingController extends Controller
{
    public function index(Request $request, TourDeparture $tourDeparture): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'max:50'],
            'payment_status' => ['nullable', 'string', 'max:50'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $tourDeparture->load([
            'tour:id,title,slug',
        ]);

        $bookings = Booking::query()
            ->where('tour_departure_id', $tourDeparture->id)
            ->with([
                'user:id,full_name,email,phone',

                'contact:id,booking_id,contact_name,contact_email,contact_phone,address,special_request',

                'participants:id,booking_id,full_name,phone,birth_date,gender,participant_type',
            ])
            ->withCount('participants')

            ->when(
                $validated['status'] ?? null,
                fn ($query, $status) => $query->where('status', $status)
            )

            ->when(
                $validated['payment_status'] ?? null,
                fn ($query, $paymentStatus) => $query->where('payment_status', $paymentStatus)
            )

            ->when($validated['search'] ?? null, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('booking_code', 'like', "%{$search}%")
                        ->orWhereHas(
                            'user',
                            fn ($userQuery) =>
                            $userQuery->where('full_name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%")
                                ->orWhere('phone', 'like', "%{$search}%")
                        )
                        ->orWhereHas(
                            'contact',
                            fn ($contactQuery) =>
                            $contactQuery->where('contact_name', 'like', "%{$search}%")
                                ->orWhere('contact_email', 'like', "%{$search}%")
                                ->orWhere('contact_phone', 'like', "%{$search}%")
                        );
                });
            })

            ->latest('id')
            ->paginate((int) ($validated['per_page'] ?? 10))
            ->withQueryString();

        $bookings->getCollection()->transform(function (Booking $booking) {
            return [
                'booking_id' => $booking->id,
                'booking_code' => $booking->booking_code,

                'customer' => [
                    'user_id' => $booking->user_id,
                    'full_name' => $booking->user?->full_name
                        ?? $booking->contact?->contact_name,
                    'email' => $booking->user?->email
                        ?? $booking->contact?->contact_email,
                    'phone' => $booking->user?->phone
                        ?? $booking->contact?->contact_phone,
                ],

                'contact' => [
                    'contact_name' => $booking->contact?->contact_name,
                    'contact_email' => $booking->contact?->contact_email,
                    'contact_phone' => $booking->contact?->contact_phone,
                    'address' => $booking->contact?->address,
                    'special_request' => $booking->contact?->special_request,
                ],

                'number_of_people' => $booking->number_of_people,
                'participants_count' => $booking->participants_count,

                'participants' => $booking->participants->map(function ($participant) {
                    return [
                        'id' => $participant->id,
                        'full_name' => $participant->full_name,
                        'phone' => $participant->phone,
                        'birth_date' => $participant->birth_date?->format('Y-m-d'),
                        'gender' => $participant->gender,
                        'participant_type' => $participant->participant_type,
                    ];
                })->values(),

                'unit_price' => $booking->unit_price,
                'discount_amount' => $booking->discount_amount,
                'total_amount' => $booking->total_amount,

                'status' => $booking->status,
                'payment_status' => $booking->payment_status,
                'note' => $booking->note,
                'created_at' => $booking->created_at?->format('Y-m-d H:i:s'),
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách khách hàng đặt tour thành công.',
            'data' => [
                'departure' => [
                    'id' => $tourDeparture->id,
                    'tour_id' => $tourDeparture->tour_id,
                    'tour_title' => $tourDeparture->tour?->title,
                    'tour_slug' => $tourDeparture->tour?->slug,

                    'departure_date' => $tourDeparture->departure_date?->format('Y-m-d'),
                    'return_date' => $tourDeparture->return_date?->format('Y-m-d'),

                    'price' => $tourDeparture->price,
                    'total_slots' => (int) $tourDeparture->total_slots,
                    'booked_slots' => (int) $tourDeparture->booked_slots,
                    'available_slots' => max(
                        0,
                        (int) $tourDeparture->total_slots - (int) $tourDeparture->booked_slots
                    ),

                    'status' => $tourDeparture->status,
                ],

                'bookings' => $bookings,
            ],
        ]);
    }
}