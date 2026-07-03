<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\BookingParticipant;
use App\Models\Guide;
use App\Models\TourDeparture;
use App\Models\TourDepartureStage;
use App\Models\TourItinerary;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GuideTourOperationService
{
    /**
     * @throws AuthorizationException
     */
    public function getOverview(User $user, TourDeparture $tourDeparture): TourDeparture
    {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        $this->ensureStagesForDeparture($departure);

        return $departure->fresh([
            'tour:id,title,slug,status',
            'currentStage',
            'guideAssignments' => fn ($query) => $query->where('status', '!=', 'cancelled'),
            'guideAssignments.guide:id,user_id,guide_code,status',
            'guideAssignments.guide.user:id,full_name,email,phone',
        ]);
    }

    /**
     * @param  array{keyword?: string|null, status?: string|null, attendance_session_id?: int|null, per_page?: int|null}  $filters
     * @return array{session: AttendanceSession|null, customers: LengthAwarePaginator}
     *
     * @throws AuthorizationException|ValidationException
     */
    public function getCustomers(User $user, TourDeparture $tourDeparture, array $filters): array
    {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        $session = $this->resolveSession($departure, $filters['attendance_session_id'] ?? null);

        $query = $this->participantBaseQuery($departure)
            ->with([
                'booking:id,booking_code,user_id,tour_id,tour_departure_id,status,payment_status,number_of_people,note',
                'booking.contact:id,booking_id,contact_name,contact_email,contact_phone,address,special_request',
                'booking.user:id,full_name,email,phone',
            ])
            ->when($session, function (Builder $query) use ($session): void {
                $query->with([
                    'attendances' => fn ($attendanceQuery) => $attendanceQuery
                        ->where('attendance_session_id', $session->id)
                        ->select([
                            'id',
                            'attendance_session_id',
                            'booking_participant_id',
                            'checked_in_at',
                            'checked_out_at',
                            'status',
                            'note',
                        ]),
                ]);
            })
            ->when($filters['keyword'] ?? null, fn (Builder $query, string $keyword) => $this->applyCustomerSearch($query, $keyword))
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $this->applyAttendanceStatusFilter($query, $session, $status))
            ->orderBy('full_name');

        $perPage = min(max((int) ($filters['per_page'] ?? 15), 1), 100);

        return [
            'session' => $session,
            'customers' => $query->paginate($perPage),
        ];
    }

    /**
     * @return array{
     *     current_session: AttendanceSession|null,
     *     total_customers: int,
     *     checked_in: int,
     *     not_checked_in: int,
     *     absent: int,
     *     checked_out: int
     * }
     *
     * @throws AuthorizationException|ValidationException
     */
    public function getAttendanceStatistics(User $user, TourDeparture $tourDeparture, ?int $sessionId = null): array
    {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        $session = $this->resolveSession($departure, $sessionId);
        $totalCustomers = $this->participantBaseQuery($departure)->count();

        if (! $session) {
            return [
                'current_session' => null,
                'total_customers' => $totalCustomers,
                'checked_in' => 0,
                'not_checked_in' => $totalCustomers,
                'absent' => 0,
                'checked_out' => 0,
            ];
        }

        /** @var Collection<string, int> $statusCounts */
        $statusCounts = Attendance::query()
            ->where('attendance_session_id', $session->id)
            ->whereHas('bookingParticipant.booking', fn (Builder $query) => $this->scopeBookingToDeparture($query, $departure))
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($total): int => (int) $total);

        $checkedIn = $statusCounts->get('checked_in', 0);
        $absent = $statusCounts->get('absent', 0);
        $checkedOut = $statusCounts->get('checked_out', 0);

        return [
            'current_session' => $session->loadMissing('creator:id,full_name,email'),
            'total_customers' => $totalCustomers,
            'checked_in' => $checkedIn,
            'not_checked_in' => max($totalCustomers - $checkedIn - $absent - $checkedOut, 0),
            'absent' => $absent,
            'checked_out' => $checkedOut,
        ];
    }

    /**
     * @throws AuthorizationException
     */
    public function createAttendanceSession(User $user, TourDeparture $tourDeparture, array $data): AttendanceSession
    {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);

        return AttendanceSession::query()
            ->create([
                'tour_departure_id' => $departure->id,
                'name' => $data['name'],
                'note' => $data['note'] ?? null,
                'created_by' => $user->id,
            ])
            ->load('creator:id,full_name,email');
    }

    /**
     * @throws AuthorizationException|ValidationException
     */
    public function checkIn(User $user, TourDeparture $tourDeparture, AttendanceSession $session, int $participantId): Attendance
    {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        $this->assertSessionBelongsToDeparture($session, $departure);
        $participant = $this->assertParticipantBelongsToDeparture($participantId, $departure);

        return DB::transaction(function () use ($user, $session, $participant): Attendance {
            $attendance = Attendance::query()
                ->where('attendance_session_id', $session->id)
                ->where('booking_participant_id', $participant->id)
                ->lockForUpdate()
                ->first();

            if ($attendance?->checked_in_at !== null) {
                throw ValidationException::withMessages([
                    'participant_id' => 'Customer has already checked in for this session.',
                ]);
            }

            $attendance ??= new Attendance([
                'attendance_session_id' => $session->id,
                'booking_participant_id' => $participant->id,
            ]);

            $attendance->fill([
                'checked_in_at' => now(),
                'checked_in_by' => $user->id,
                'status' => 'checked_in',
            ]);
            $attendance->save();

            return $attendance->load([
                'bookingParticipant',
                'checkedInBy:id,full_name,email',
                'checkedOutBy:id,full_name,email',
            ]);
        });
    }

    /**
     * @throws AuthorizationException|ValidationException
     */
    public function checkOut(User $user, TourDeparture $tourDeparture, AttendanceSession $session, int $participantId): Attendance
    {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        $this->assertSessionBelongsToDeparture($session, $departure);
        $participant = $this->assertParticipantBelongsToDeparture($participantId, $departure);

        return DB::transaction(function () use ($user, $session, $participant): Attendance {
            $attendance = Attendance::query()
                ->where('attendance_session_id', $session->id)
                ->where('booking_participant_id', $participant->id)
                ->lockForUpdate()
                ->first();

            if (! $attendance || $attendance->checked_in_at === null) {
                throw ValidationException::withMessages([
                    'participant_id' => 'Customer must check in before check-out.',
                ]);
            }

            if ($attendance->checked_out_at !== null) {
                throw ValidationException::withMessages([
                    'participant_id' => 'Customer has already checked out for this session.',
                ]);
            }

            $attendance->update([
                'checked_out_at' => now(),
                'checked_out_by' => $user->id,
                'status' => 'checked_out',
            ]);

            return $attendance->load([
                'bookingParticipant',
                'checkedInBy:id,full_name,email',
                'checkedOutBy:id,full_name,email',
            ]);
        });
    }

    /**
     * @param  array{participant_id: int, note?: string|null, status?: string|null}  $data
     *
     * @throws AuthorizationException|ValidationException
     */
    public function updateAttendanceNote(User $user, TourDeparture $tourDeparture, AttendanceSession $session, array $data): Attendance
    {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        $this->assertSessionBelongsToDeparture($session, $departure);
        $participant = $this->assertParticipantBelongsToDeparture((int) $data['participant_id'], $departure);

        return DB::transaction(function () use ($user, $session, $participant, $data): Attendance {
            $attendance = Attendance::query()
                ->where('attendance_session_id', $session->id)
                ->where('booking_participant_id', $participant->id)
                ->lockForUpdate()
                ->first();

            if (array_key_exists('status', $data) && $data['status'] !== null && $attendance?->checked_in_at !== null) {
                throw ValidationException::withMessages([
                    'status' => 'Cannot mark attendance status after customer has checked in.',
                ]);
            }

            $attendance ??= new Attendance([
                'attendance_session_id' => $session->id,
                'booking_participant_id' => $participant->id,
                'status' => 'not_checked_in',
            ]);

            $updateData = [
                'note_updated_by' => $user->id,
            ];

            if (array_key_exists('note', $data)) {
                $updateData['note'] = $data['note'];
            }

            if (array_key_exists('status', $data) && $data['status'] !== null) {
                $updateData['status'] = $data['status'];
            }

            $attendance->fill($updateData);
            $attendance->save();

            return $attendance->load([
                'bookingParticipant',
                'session',
                'noteUpdatedBy:id,full_name,email',
            ]);
        });
    }

    /**
     * @throws AuthorizationException|ValidationException
     */
    public function getCustomerDetail(User $user, TourDeparture $tourDeparture, BookingParticipant $participant): BookingParticipant
    {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        $this->assertParticipantBelongsToDeparture($participant->id, $departure);

        return $participant->fresh([
            'booking:id,booking_code,user_id,tour_id,tour_departure_id,status,payment_status,number_of_people,total_amount,note',
            'booking.contact:id,booking_id,contact_name,contact_email,contact_phone,address,special_request',
            'booking.user:id,full_name,email,phone',
            'attendances' => fn ($query) => $query
                ->whereHas('session', fn (Builder $sessionQuery) => $sessionQuery->where('tour_departure_id', $departure->id))
                ->latest('created_at'),
            'attendances.session:id,tour_departure_id,name',
            'attendances.checkedInBy:id,full_name,email',
            'attendances.checkedOutBy:id,full_name,email',
            'attendances.noteUpdatedBy:id,full_name,email',
        ]);
    }

    /**
     * @return Collection<int, TourDepartureStage>
     *
     * @throws AuthorizationException
     */
    public function getStages(User $user, TourDeparture $tourDeparture): Collection
    {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        $this->ensureStagesForDeparture($departure);

        return $departure->fresh()->stages()->get();
    }

    /**
     * @return array{current_stage: TourDepartureStage, stages: Collection<int, TourDepartureStage>}
     *
     * @throws AuthorizationException|ValidationException
     */
    public function advanceStage(User $user, TourDeparture $tourDeparture): array
    {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        $this->ensureStagesForDeparture($departure);

        return DB::transaction(function () use ($departure): array {
            $currentStage = TourDepartureStage::query()
                ->where('tour_departure_id', $departure->id)
                ->where('status', 'in_progress')
                ->orderBy('day_number')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->lockForUpdate()
                ->first();

            if (! $currentStage) {
                throw ValidationException::withMessages([
                    'stage' => 'No current stage is available for this tour departure.',
                ]);
            }

            $nextStage = TourDepartureStage::query()
                ->where('tour_departure_id', $departure->id)
                ->where(function (Builder $query) use ($currentStage): void {
                    $query->where('day_number', '>', $currentStage->day_number)
                        ->orWhere(function (Builder $query) use ($currentStage): void {
                            $query->where('day_number', $currentStage->day_number)
                                ->where('sort_order', '>', $currentStage->sort_order);
                        })
                        ->orWhere(function (Builder $query) use ($currentStage): void {
                            $query->where('day_number', $currentStage->day_number)
                                ->where('sort_order', $currentStage->sort_order)
                                ->where('id', '>', $currentStage->id);
                        });
                })
                ->orderBy('day_number')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->lockForUpdate()
                ->first();

            if (! $nextStage) {
                throw ValidationException::withMessages([
                    'stage' => 'Cannot advance after the final stage.',
                ]);
            }

            $now = now();
            $currentStage->update([
                'status' => 'completed',
                'completed_at' => $now,
            ]);
            $nextStage->update([
                'status' => 'in_progress',
                'started_at' => $nextStage->started_at ?? $now,
            ]);
            TourDeparture::query()
                ->whereKey($departure->id)
                ->update(['current_stage_id' => $nextStage->id]);

            return [
                'current_stage' => $nextStage->fresh(),
                'stages' => TourDepartureStage::query()
                    ->where('tour_departure_id', $departure->id)
                    ->orderBy('day_number')
                    ->orderBy('sort_order')
                    ->orderBy('id')
                    ->get(),
            ];
        });
    }

    /**
     * @throws AuthorizationException
     */
    private function assignedDepartureForUser(User $user, TourDeparture $tourDeparture): TourDeparture
    {
        $guide = $this->guideForUser($user);

        $isAssigned = $tourDeparture->guideAssignments()
            ->where('guide_id', $guide->id)
            ->where('status', '!=', 'cancelled')
            ->exists();

        if (! $isAssigned) {
            throw new AuthorizationException('Forbidden.');
        }

        return $tourDeparture;
    }

    /**
     * @throws AuthorizationException
     */
    private function guideForUser(User $user): Guide
    {
        $user->loadMissing('role');
        $roleName = mb_strtolower(trim((string) $user->role?->name));

        if (! in_array($roleName, ['tour guide', 'guide'], true)) {
            throw new AuthorizationException('Forbidden.');
        }

        $guide = Guide::query()
            ->where('user_id', $user->id)
            ->first();

        if (! $guide) {
            throw new AuthorizationException('Forbidden.');
        }

        return $guide;
    }

    /**
     * @throws ValidationException
     */
    private function resolveSession(TourDeparture $departure, ?int $sessionId): ?AttendanceSession
    {
        if ($sessionId) {
            $session = AttendanceSession::query()
                ->where('tour_departure_id', $departure->id)
                ->find($sessionId);

            if (! $session) {
                throw ValidationException::withMessages([
                    'attendance_session_id' => 'Attendance session does not belong to this tour departure.',
                ]);
            }

            return $session;
        }

        return AttendanceSession::query()
            ->where('tour_departure_id', $departure->id)
            ->latest('created_at')
            ->latest('id')
            ->first();
    }

    /**
     * @return Builder<BookingParticipant>
     */
    private function participantBaseQuery(TourDeparture $departure): Builder
    {
        return BookingParticipant::query()
            ->select('booking_participants.*')
            ->whereHas('booking', fn (Builder $query) => $this->scopeBookingToDeparture($query, $departure));
    }

    private function scopeBookingToDeparture(Builder $query, TourDeparture $departure): Builder
    {
        return $query
            ->where('tour_departure_id', $departure->id)
            ->where('status', '!=', 'cancelled');
    }

    private function applyCustomerSearch(Builder $query, string $keyword): void
    {
        $keyword = trim($keyword);

        if ($keyword === '') {
            return;
        }

        $query->where(function (Builder $query) use ($keyword): void {
            $query->where('full_name', 'like', "%{$keyword}%")
                ->orWhere('phone', 'like', "%{$keyword}%")
                ->orWhere('identity_number', 'like', "%{$keyword}%")
                ->orWhereHas('booking', function (Builder $bookingQuery) use ($keyword): void {
                    $bookingQuery->where('booking_code', 'like', "%{$keyword}%")
                        ->orWhereHas('contact', function (Builder $contactQuery) use ($keyword): void {
                            $contactQuery->where('contact_name', 'like', "%{$keyword}%")
                                ->orWhere('contact_email', 'like', "%{$keyword}%")
                                ->orWhere('contact_phone', 'like', "%{$keyword}%");
                        })
                        ->orWhereHas('user', function (Builder $userQuery) use ($keyword): void {
                            $userQuery->where('full_name', 'like', "%{$keyword}%")
                                ->orWhere('email', 'like', "%{$keyword}%")
                                ->orWhere('phone', 'like', "%{$keyword}%");
                        });
                });
        });
    }

    private function applyAttendanceStatusFilter(Builder $query, ?AttendanceSession $session, string $status): void
    {
        if (! $session) {
            if ($status !== 'not_checked_in') {
                $query->whereRaw('1 = 0');
            }

            return;
        }

        if ($status === 'not_checked_in') {
            $query->whereDoesntHave('attendances', function (Builder $attendanceQuery) use ($session): void {
                $attendanceQuery->where('attendance_session_id', $session->id)
                    ->whereIn('status', ['checked_in', 'absent', 'checked_out']);
            });

            return;
        }

        $query->whereHas('attendances', function (Builder $attendanceQuery) use ($session, $status): void {
            $attendanceQuery->where('attendance_session_id', $session->id)
                ->where('status', $status);
        });
    }

    /**
     * @throws ValidationException
     */
    private function assertSessionBelongsToDeparture(AttendanceSession $session, TourDeparture $departure): void
    {
        if ((int) $session->tour_departure_id !== (int) $departure->id) {
            throw ValidationException::withMessages([
                'attendance_session_id' => 'Attendance session does not belong to this tour departure.',
            ]);
        }
    }

    /**
     * @throws ValidationException
     */
    private function assertParticipantBelongsToDeparture(int $participantId, TourDeparture $departure): BookingParticipant
    {
        $participant = $this->participantBaseQuery($departure)->find($participantId);

        if (! $participant) {
            throw ValidationException::withMessages([
                'participant_id' => 'Customer does not belong to this tour departure.',
            ]);
        }

        return $participant;
    }

    private function ensureStagesForDeparture(TourDeparture $departure): void
    {
        DB::transaction(function () use ($departure): void {
            $lockedDeparture = TourDeparture::query()
                ->whereKey($departure->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! TourDepartureStage::query()->where('tour_departure_id', $lockedDeparture->id)->exists()) {
                $this->createStagesFromItinerary($lockedDeparture);
            }

            $currentStage = $this->findDisplayCurrentStage($lockedDeparture);

            if ($currentStage && $currentStage->status === 'pending') {
                $currentStage->update([
                    'status' => 'in_progress',
                    'started_at' => $currentStage->started_at ?? now(),
                ]);
                $currentStage = $currentStage->fresh();
            }

            if ($currentStage && (int) $lockedDeparture->current_stage_id !== (int) $currentStage->id) {
                $lockedDeparture->update(['current_stage_id' => $currentStage->id]);
            }
        });
    }

    private function createStagesFromItinerary(TourDeparture $departure): void
    {
        $itineraries = TourItinerary::query()
            ->where('tour_id', $departure->tour_id)
            ->orderBy('day_number')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $now = now();

        foreach ($itineraries as $index => $itinerary) {
            TourDepartureStage::query()->create([
                'tour_departure_id' => $departure->id,
                'tour_itinerary_id' => $itinerary->id,
                'day_number' => $itinerary->day_number,
                'sort_order' => $itinerary->sort_order,
                'type' => $itinerary->type,
                'title' => $itinerary->title,
                'start_time' => $itinerary->start_time,
                'end_time' => $itinerary->end_time,
                'status' => $index === 0 ? 'in_progress' : 'pending',
                'started_at' => $index === 0 ? $now : null,
            ]);
        }
    }

    private function findDisplayCurrentStage(TourDeparture $departure): ?TourDepartureStage
    {
        $baseQuery = TourDepartureStage::query()
            ->where('tour_departure_id', $departure->id);

        return (clone $baseQuery)
            ->where('status', 'in_progress')
            ->orderBy('day_number')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->first()
            ?? (clone $baseQuery)
                ->where('status', 'pending')
                ->orderBy('day_number')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->first()
            ?? (clone $baseQuery)
                ->where('status', 'completed')
                ->orderByDesc('day_number')
                ->orderByDesc('sort_order')
                ->orderByDesc('id')
                ->first();
    }
}
