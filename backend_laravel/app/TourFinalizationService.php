<?php

namespace App;

use App\Models\Booking;
use App\Models\BookingStatusHistory;
use App\Models\TourDeparture;
use App\Models\TourDepartureStatusHistory;
use App\Models\TourFinalizationOutbox;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TourFinalizationService
{
    public const MINIMUM_PARTICIPANTS = 10;

    /**
     * Finalize a departure exactly once. The caller may safely retry this method.
     */
    public function finalize(TourDeparture $departure): ?TourFinalizationOutbox
    {
        return DB::transaction(function () use ($departure): ?TourFinalizationOutbox {
            $lockedDeparture = TourDeparture::query()
                ->with('tour:id,title')
                ->lockForUpdate()
                ->findOrFail($departure->id);

            if ($lockedDeparture->status !== 'open') {
                return null;
            }

            $eligibleBookings = Booking::query()
                ->where('tour_departure_id', $lockedDeparture->id)
                ->where('status', 'confirmed')
                ->where('payment_status', 'paid')
                ->lockForUpdate()
                ->get();
            $participantCount = (int) $eligibleBookings->sum('number_of_people');
            $isConfirmed = $participantCount >= self::MINIMUM_PARTICIPANTS;
            $newStatus = $isConfirmed ? 'confirmed' : 'cancelled';

            $lockedDeparture->update([
                'status' => $newStatus,
                'cancellation_reason' => $isConfirmed ? null : 'insufficient_participants',
            ]);
            TourDepartureStatusHistory::query()->create([
                'tour_departure_id' => $lockedDeparture->id,
                'old_status' => 'open',
                'new_status' => $newStatus,
                'reason' => $isConfirmed ? 'minimum_participants_met' : 'insufficient_participants',
            ]);

            $affectedBookings = collect();
            if (! $isConfirmed) {
                $affectedBookings = Booking::query()
                    ->where('tour_departure_id', $lockedDeparture->id)
                    ->whereNotIn('status', ['cancelled', 'cancelled_by_tour'])
                    ->lockForUpdate()
                    ->get();

                foreach ($affectedBookings as $booking) {
                    $oldStatus = $booking->status;
                    $booking->update([
                        'status' => 'cancelled_by_tour',
                        'cancel_reason' => 'Tour cancelled because there are insufficient participants.',
                        'cancellation_reason' => 'tour_cancelled_insufficient_participants',
                        'resolution_status' => 'pending_selection',
                        'cancelled_at' => now(),
                    ]);
                    BookingStatusHistory::query()->create([
                        'booking_id' => $booking->id,
                        'old_status' => $oldStatus,
                        'new_status' => 'cancelled_by_tour',
                        'note' => 'Tour cancelled: insufficient participants. No customer cancellation fee applies.',
                    ]);
                }
            }

            return TourFinalizationOutbox::query()->create([
                'tour_departure_id' => $lockedDeparture->id,
                'event_type' => $isConfirmed ? 'tour_confirmed' : 'tour_cancelled_insufficient_participants',
                'payload' => [
                    'participant_count' => $participantCount,
                    'affected_booking_count' => $affectedBookings->count(),
                ],
            ]);
        }, 3);
    }

    /** Cancel a confirmed departure only when an administrator explicitly requests it. */
    public function cancelConfirmed(TourDeparture $departure, string $reason, ?int $changedBy = null): TourFinalizationOutbox
    {
        return DB::transaction(function () use ($departure, $reason, $changedBy): TourFinalizationOutbox {
            $lockedDeparture = TourDeparture::query()->with('tour:id,title')->lockForUpdate()->findOrFail($departure->id);
            if ($lockedDeparture->status !== 'confirmed') {
                throw ValidationException::withMessages(['status' => ['Chỉ có thể hủy tour đã được xác nhận.']]);
            }

            $lockedDeparture->update(['status' => 'cancelled', 'cancellation_reason' => $reason]);
            TourDepartureStatusHistory::query()->create([
                'tour_departure_id' => $lockedDeparture->id,
                'old_status' => 'confirmed', 'new_status' => 'cancelled', 'reason' => $reason,
            ]);

            $bookings = Booking::query()->where('tour_departure_id', $lockedDeparture->id)
                ->whereNotIn('status', ['cancelled', 'cancelled_by_tour'])->lockForUpdate()->get();
            foreach ($bookings as $booking) {
                $oldStatus = $booking->status;
                $booking->update([
                    'status' => 'cancelled_by_tour',
                    'cancel_reason' => 'Tour cancelled by administrator.',
                    'cancellation_reason' => $reason === 'insufficient_participants'
                        ? 'tour_cancelled_insufficient_participants' : 'tour_cancelled_by_administrator',
                    'resolution_status' => 'pending_selection', 'cancelled_at' => now(),
                ]);
                BookingStatusHistory::query()->create([
                    'booking_id' => $booking->id, 'old_status' => $oldStatus,
                    'new_status' => 'cancelled_by_tour', 'changed_by' => $changedBy,
                    'note' => 'Tour cancelled by administrator. No customer cancellation fee applies.',
                ]);
            }

            return TourFinalizationOutbox::query()->create([
                'tour_departure_id' => $lockedDeparture->id,
                'event_type' => 'tour_cancelled_admin',
                'payload' => [
                    'participant_count' => (int) $bookings->sum('number_of_people'),
                    'affected_booking_count' => $bookings->count(),
                    'cancellation_reason' => $reason,
                ],
            ]);
        }, 3);
    }
}
