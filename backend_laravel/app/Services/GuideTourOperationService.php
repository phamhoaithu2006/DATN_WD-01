<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\AttendanceActivityLog;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionPhoto;
use App\Models\BookingParticipant;
use App\Models\Guide;
use App\Models\TourDeparture;
use App\Models\TourDepartureStage;
use App\Models\TourItinerary;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class GuideTourOperationService
{
    /**
     * @throws AuthorizationException
     */
    public function getOverview(User $user, TourDeparture $tourDeparture): TourDeparture
    {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        // Chỉ tạo/cập nhật tiến trình khi tour thực sự đang diễn ra.
        // API xem chi tiết không được làm thay đổi tour đã hủy hoặc chưa chốt.
        if ($this->isDepartureOngoing($departure)) {
            $this->ensureStagesForDeparture($departure);
        }

        return $departure->fresh([
            'tour:id,title,slug,status',
            'currentStage',
            'guideAssignments' => fn ($query) => $query->where('status', '!=', 'cancelled'),
            'guideAssignments.guide:id,user_id,guide_code,status',
            'guideAssignments.guide.user:id,full_name,email,phone',
        ]);
    }

    /**
     * @param  array{keyword?: string|null, status?: string|null, attendance_session_id?: int|null, attendance_boundary?: string|null, per_page?: int|null}  $filters
     * @return array{session: AttendanceSession|null, customers: LengthAwarePaginator}
     *
     * @throws AuthorizationException|ValidationException
     */
    public function getCustomers(User $user, TourDeparture $tourDeparture, array $filters): array
    {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        $session = $this->resolveSession(
            $departure,
            $filters['attendance_session_id'] ?? null,
            $filters['attendance_boundary'] ?? null
        );

        $query = $this->participantBaseQuery($departure)
            ->with([
                'booking:id,booking_code,user_id,tour_id,tour_departure_id,status,payment_status,number_of_people,note',
                'booking.contact:id,booking_id,contact_name,contact_email,contact_phone,address,special_request',
                'booking.user:id,full_name,email,phone',
                'latestAttendanceNote' => fn ($query) => $query->select([
                    'attendances.id',
                    'attendances.booking_participant_id',
                    'attendances.note',
                    'attendances.updated_at',
                ]),
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
     * @return Collection<int, AttendanceSession>
     *
     * @throws AuthorizationException
     */
    public function getAttendanceSessions(User $user, TourDeparture $tourDeparture): Collection
    {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        if ($this->isDepartureOngoing($departure)) {
            $this->synchronizeDailyAttendanceSessions($departure, $user);
        }

        $sessions = AttendanceSession::query()
            ->where('tour_departure_id', $departure->id)
            ->with([
                'creator:id,full_name,email',
                'itinerary:id,day_number,sort_order,type,title,start_time,end_time',
                'photos:id,attendance_session_id,file_path,original_name,uploaded_by,created_at',
            ])
            ->withCount([
                'attendances',
                'attendances as checked_in_count' => fn (Builder $query) => $query->where('status', 'checked_in'),
                'attendances as checked_out_count' => fn (Builder $query) => $query->where('status', 'checked_out'),
                'attendances as absent_count' => fn (Builder $query) => $query->where('status', 'absent'),
            ])
            ->orderBy('scheduled_date')
            ->orderBy(
                TourItinerary::query()
                    ->select('sort_order')
                    ->whereColumn('tour_itineraries.id', 'attendance_sessions.tour_itinerary_id')
                    ->limit(1)
            )
            ->orderBy('id')
            ->get();

        return $sessions->each(function (AttendanceSession $session) use ($departure): void {
            $session->setAttribute(
                'can_take_attendance',
                $session->status === 'active'
                    && $this->isDepartureOngoing($departure)
                    && $session->scheduled_date?->isToday()
            );
        });
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
    public function getAttendanceStatistics(
        User $user,
        TourDeparture $tourDeparture,
        ?int $sessionId = null,
        ?string $boundary = null
    ): array {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        $session = $this->resolveSession($departure, $sessionId, $boundary);
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
        $attended = $checkedIn + $checkedOut;

        return [
            'current_session' => $session->loadMissing('creator:id,full_name,email'),
            'total_customers' => $totalCustomers,
            'checked_in' => $attended,
            'not_checked_in' => max($totalCustomers - $attended - $absent, 0),
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
        $this->assertDepartureCanTakeAttendance($departure);
        $this->synchronizeDailyAttendanceSessions($departure, $user);

        return AttendanceSession::query()
            ->where('tour_departure_id', $departure->id)
            ->whereDate('scheduled_date', now()->toDateString())
            ->firstOrFail()
            ->load(['creator:id,full_name,email', 'photos']);
    }

    /**
     * @param  array<int, UploadedFile>  $photos
     */
    public function uploadAttendancePhotos(
        User $user,
        TourDeparture $tourDeparture,
        AttendanceSession $session,
        array $photos
    ): AttendanceSession {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        $this->assertDepartureCanTakeAttendance($departure);
        $this->assertSessionBelongsToDeparture($session, $departure);
        $this->assertSessionCanTakeAttendance($session, $departure);

        if ($session->photos()->count() + count($photos) > 6) {
            throw ValidationException::withMessages([
                'photos' => 'Mỗi ngày điểm danh chỉ được lưu tối đa 6 ảnh.',
            ]);
        }

        foreach ($photos as $photo) {
            $path = $photo->store("attendance/tour-departures/{$departure->id}", 'public');

            $session->photos()->create([
                'file_path' => $path,
                'original_name' => $photo->getClientOriginalName(),
                'uploaded_by' => $user->id,
            ]);
        }

        $this->logAttendanceActivity($session, $user, 'photos_uploaded', 'Đã thêm '.count($photos).' ảnh check-in.', null, [
            'count' => count($photos),
            'files' => collect($photos)->map(fn (UploadedFile $photo) => $photo->getClientOriginalName())->values()->all(),
        ]);

        return $session->fresh(['creator:id,full_name,email', 'itinerary', 'photos']);
    }

    public function deleteAttendancePhoto(
        User $user,
        TourDeparture $tourDeparture,
        AttendanceSession $session,
        AttendanceSessionPhoto $photo
    ): AttendanceSession {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        $this->assertDepartureCanTakeAttendance($departure);
        $this->assertSessionBelongsToDeparture($session, $departure);
        $this->assertSessionCanTakeAttendance($session, $departure);

        if ((int) $photo->attendance_session_id !== (int) $session->id) {
            throw ValidationException::withMessages([
                'photo' => 'Ảnh không thuộc ngày điểm danh đã chọn.',
            ]);
        }

        $filePath = $photo->file_path;
        $originalName = $photo->original_name;
        $photo->delete();
        Storage::disk('public')->delete($filePath);
        $this->logAttendanceActivity($session, $user, 'photo_deleted', "Đã xóa ảnh {$originalName}.", null, [
            'file' => $originalName,
        ]);

        return $session->fresh(['creator:id,full_name,email', 'itinerary', 'photos']);
    }

    /**
     * @throws AuthorizationException|ValidationException
     */
    public function checkIn(User $user, TourDeparture $tourDeparture, AttendanceSession $session, int $participantId): Attendance
    {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        $this->assertDepartureCanTakeAttendance($departure);
        $this->assertSessionBelongsToDeparture($session, $departure);
        $this->assertSessionCanTakeAttendance($session, $departure);
        $participant = $this->assertParticipantBelongsToDeparture($participantId, $departure);

        return DB::transaction(function () use ($user, $session, $participant): Attendance {
            AttendanceSession::query()->whereKey($session->id)->lockForUpdate()->firstOrFail();

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

            $this->logAttendanceActivity($session, $user, 'checked_in', "Đã điểm danh {$participant->full_name}.", $participant);

            return $attendance->load([
                'bookingParticipant',
                'checkedInBy:id,full_name,email',
                'checkedOutBy:id,full_name,email',
            ]);
        });
    }

    /**
     * @return array{checked_in: int, total_customers: int}
     *
     * @throws AuthorizationException|ValidationException
     */
    public function checkInAll(User $user, TourDeparture $tourDeparture, AttendanceSession $session): array
    {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        $this->assertDepartureCanTakeAttendance($departure);
        $this->assertSessionBelongsToDeparture($session, $departure);
        $this->assertSessionCanTakeAttendance($session, $departure);
        $participantIds = $this->participantBaseQuery($departure)->pluck('booking_participants.id');

        DB::transaction(function () use ($user, $session, $participantIds): void {
            AttendanceSession::query()->whereKey($session->id)->lockForUpdate()->firstOrFail();
            $timestamp = now();
            $rows = $participantIds->map(fn (int $participantId): array => [
                'attendance_session_id' => $session->id,
                'booking_participant_id' => $participantId,
                'checked_in_at' => $timestamp,
                'checked_in_by' => $user->id,
                'status' => 'checked_in',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ])->all();

            if ($rows !== []) {
                Attendance::query()->upsert(
                    $rows,
                    ['attendance_session_id', 'booking_participant_id'],
                    ['checked_in_at', 'checked_in_by', 'status', 'updated_at']
                );
            }


            $this->logAttendanceActivity($session, $user, 'checked_in_all', 'Đã điểm danh tất cả '.$participantIds->count().' khách.', null, [
                'count' => $participantIds->count(),
            ]);
        });

        return [
            'checked_in' => $participantIds->count(),
            'total_customers' => $participantIds->count(),
        ];
    }

    /**
     * @throws AuthorizationException|ValidationException
     */
    public function undoCheckIn(User $user, TourDeparture $tourDeparture, AttendanceSession $session, int $participantId): Attendance
    {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        $this->assertDepartureCanTakeAttendance($departure);
        $this->assertSessionBelongsToDeparture($session, $departure);
        $this->assertSessionCanTakeAttendance($session, $departure);
        $participant = $this->assertParticipantBelongsToDeparture($participantId, $departure);

        return DB::transaction(function () use ($user, $session, $participant): Attendance {
            AttendanceSession::query()->whereKey($session->id)->lockForUpdate()->firstOrFail();

            $attendance = Attendance::query()
                ->where('attendance_session_id', $session->id)
                ->where('booking_participant_id', $participant->id)
                ->lockForUpdate()
                ->first();

            if (! $attendance || $attendance->checked_in_at === null) {
                throw ValidationException::withMessages([
                    'participant_id' => 'Customer has not checked in for this session.',
                ]);
            }

            $attendance->fill([
                'checked_in_at' => null,
                'checked_in_by' => null,
                'checked_out_at' => null,
                'checked_out_by' => null,
                'status' => 'not_checked_in',
            ]);
            $attendance->save();

            $this->logAttendanceActivity($session, $user, 'check_in_undone', "Đã hoàn tác điểm danh {$participant->full_name}.", $participant);

            return $attendance->load([
                'bookingParticipant',
                'checkedInBy:id,full_name,email',
                'checkedOutBy:id,full_name,email',
                'noteUpdatedBy:id,full_name,email',
            ]);
        });
    }

    /**
     * @throws AuthorizationException|ValidationException
     */
    public function checkOut(User $user, TourDeparture $tourDeparture, AttendanceSession $session, int $participantId): Attendance
    {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        $this->assertDepartureCanTakeAttendance($departure);
        $this->assertSessionBelongsToDeparture($session, $departure);
        $this->assertSessionCanTakeAttendance($session, $departure);
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

            $this->logAttendanceActivity($session, $user, 'checked_out', "Đã trả khách {$participant->full_name}.", $participant);

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
        $this->assertDepartureCanTakeAttendance($departure);
        $this->assertSessionBelongsToDeparture($session, $departure);
        $this->assertSessionCanTakeAttendance($session, $departure);
        $participant = $this->assertParticipantBelongsToDeparture((int) $data['participant_id'], $departure);

        return DB::transaction(function () use ($user, $session, $participant, $data): Attendance {
            AttendanceSession::query()->whereKey($session->id)->lockForUpdate()->firstOrFail();

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

            $description = array_key_exists('status', $data) && $data['status'] !== null
                ? "Đã cập nhật trạng thái {$participant->full_name} thành {$data['status']}."
                : "Đã sửa ghi chú điểm danh của {$participant->full_name}.";
            $this->logAttendanceActivity($session, $user, 'attendance_updated', $description, $participant, [
                'status' => $data['status'] ?? null,
                'note' => $data['note'] ?? null,
            ]);

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
        if ($this->isDepartureOngoing($departure)) {
            $this->ensureStagesForDeparture($departure);
        }

        return $departure->fresh()->stages()
            ->with([
                'itinerary.destinationPlace:id,province_id,district_id,name,district_name,address',
                'itinerary.destinationPlace.province:id,name',
                'itinerary.destinationPlace.district.province:id,name',
                'itinerary.destinationPlace.activityTypeLinks:id,destination_place_id,activity_type',
            ])
            ->get();
    }

    /**
     * Chọn stage hiển thị và thao tác cho đúng ngày đang diễn ra.
     *
     * @param  Collection<int, TourDepartureStage>  $stages
     */
    public function getDisplayCurrentStage(TourDeparture $departure, Collection $stages): ?TourDepartureStage
    {
        $currentDayNumber = $this->currentItineraryDayNumber($departure);
        $candidateStages = $currentDayNumber === null
            ? $stages
            : $stages->where('day_number', $currentDayNumber)->values();

        return $candidateStages->first(
            fn (TourDepartureStage $stage): bool => $stage->status === 'in_progress'
                && $this->stageWindowState($departure, $stage) === 'active'
        )
            ?? $candidateStages->first(
                fn (TourDepartureStage $stage): bool => $stage->status === 'pending'
                    && $this->stageWindowState($departure, $stage) === 'active'
            )
            ?? $candidateStages->firstWhere('status', 'in_progress')
            ?? $candidateStages->firstWhere('status', 'pending')
            ?? $candidateStages->last();
    }

    /**
     * @return array{current_stage: TourDepartureStage, stages: Collection<int, TourDepartureStage>}
     *
     * @throws AuthorizationException|ValidationException
     */
    public function advanceStage(User $user, TourDeparture $tourDeparture): array
    {
        $departure = $this->assignedDepartureForUser($user, $tourDeparture);
        $this->assertDepartureCanTakeAttendance($departure);
        $currentDayNumber = $this->currentItineraryDayNumber($departure);

        if ($currentDayNumber === null) {
            throw ValidationException::withMessages([
                'stage' => 'Chỉ có thể xác nhận hoạt động của ngày đang diễn ra.',
            ]);
        }

        $this->ensureStagesForDeparture($departure);

        return DB::transaction(function () use ($departure, $currentDayNumber): array {
            $inProgressStages = TourDepartureStage::query()
                ->where('tour_departure_id', $departure->id)
                ->where('day_number', $currentDayNumber)
                ->where('status', 'in_progress')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            $currentStage = $inProgressStages->first(
                fn (TourDepartureStage $stage): bool => $this->stageWindowState($departure, $stage) === 'active'
            );

            if (! $currentStage) {
                $currentStage = TourDepartureStage::query()
                    ->where('tour_departure_id', $departure->id)
                    ->where('day_number', $currentDayNumber)
                    ->where('status', 'pending')
                    ->orderBy('sort_order')
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get()
                    ->first(
                        fn (TourDepartureStage $stage): bool => $this->stageWindowState($departure, $stage) === 'active'
                    );

                if ($currentStage) {
                    $currentStage->update([
                        'status' => 'in_progress',
                        'started_at' => $currentStage->started_at ?? now(),
                    ]);
                    $currentStage = $currentStage->fresh();
                }
            }

            if (! $currentStage) {
                $blockedStage = $inProgressStages->first();
                $message = match ($blockedStage ? $this->stageWindowState($departure, $blockedStage) : null) {
                    'upcoming' => 'Chưa đến giờ hoạt động. Chỉ có thể xác nhận trong khung giờ đã lên lịch.',
                    'ended' => 'Hoạt động đã hết thời gian xác nhận.',
                    'unavailable' => 'Hoạt động chưa có đủ khung giờ để xác nhận.',
                    default => 'Hôm nay không có hoạt động nào đang trong khung giờ xác nhận.',
                };

                throw ValidationException::withMessages([
                    'stage' => $message,
                ]);
            }

            if ($this->stageWindowState($departure, $currentStage) !== 'active') {
                throw ValidationException::withMessages([
                    'stage' => 'Chỉ có thể xác nhận trong khung giờ diễn ra hoạt động.',
                ]);
            }

            $nextStage = TourDepartureStage::query()
                ->where('tour_departure_id', $departure->id)
                ->where('day_number', $currentDayNumber)
                ->where('status', 'pending')
                ->where(function (Builder $query) use ($currentStage): void {
                    $query->where('sort_order', '>', $currentStage->sort_order)
                        ->orWhere(function (Builder $query) use ($currentStage): void {
                            $query->where('sort_order', $currentStage->sort_order)
                                ->where('id', '>', $currentStage->id);
                        });
                })
                ->orderBy('sort_order')
                ->orderBy('id')
                ->lockForUpdate()
                ->first();

            if (! $nextStage || $this->stageWindowState($departure, $nextStage) !== 'active') {
                $currentStage->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                ]);

                TourDeparture::query()
                    ->whereKey($departure->id)
                    ->update(['current_stage_id' => $currentStage->id]);

                return [
                    'current_stage' => $currentStage->fresh(),
                    'stages' => TourDepartureStage::query()
                        ->where('tour_departure_id', $departure->id)
                        ->orderBy('day_number')
                        ->orderBy('sort_order')
                        ->orderBy('id')
                        ->get(),
                ];
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
    private function resolveSession(TourDeparture $departure, ?int $sessionId, ?string $boundary = null): ?AttendanceSession
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

            if ($boundary !== null && $session->boundary !== $boundary) {
                throw ValidationException::withMessages([
                    'attendance_boundary' => 'Attendance session does not match the selected boundary.',
                ]);
            }

            return $session;
        }

        return AttendanceSession::query()
            ->where('tour_departure_id', $departure->id)
            ->when($boundary !== null, fn (Builder $query) => $query->where('boundary', $boundary))
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
            ->whereIn('status', ['confirmed', 'departed', 'completed'])
            ->where('payment_status', 'paid');
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
                ->when(
                    $status === 'checked_in',
                    fn (Builder $query) => $query->whereIn('status', ['checked_in', 'checked_out']),
                    fn (Builder $query) => $query->where('status', $status)
                );
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
    private function assertSessionCanTakeAttendance(AttendanceSession $session, TourDeparture $departure): void
    {
        if ($session->status !== 'active') {
            throw ValidationException::withMessages([
                'attendance_session_id' => 'Attendance session is closed.',
            ]);
        }

        if (! $session->scheduled_date?->isToday()) {
            throw ValidationException::withMessages([
                'attendance_session_id' => 'Chỉ có thể điểm danh và tải ảnh cho ngày đang diễn ra.',
            ]);
        }
    }

    /**
     * Đồng bộ các ngày điểm danh từ lịch trình tour.
     * Dùng chung cho màn HDV và màn quản trị để hai bên luôn đọc cùng một bộ phiên.
     */
    public function synchronizeDailyAttendanceSessions(TourDeparture $departure, User $user): void
    {
        $itinerariesByDay = TourItinerary::query()
            ->where('tour_id', $departure->tour_id)
            ->orderBy('day_number')
            ->orderBy('sort_order')
            ->get()
            ->groupBy('day_number');
        $dayNumbers = $itinerariesByDay->keys()
            ->map(fn ($dayNumber): int => (int) $dayNumber)
            ->push(1)
            ->unique()
            ->sort()
            ->values();

        foreach ($dayNumbers as $dayNumber) {
            $representativeItinerary = $dayNumber === 1 ? null : $itinerariesByDay->get($dayNumber)?->first();
            $attributes = [
                'tour_departure_id' => $departure->id,
                'tour_itinerary_id' => $representativeItinerary?->id,
            ];

            if ($dayNumber === 1) {
                $attributes['boundary'] = 'departure';
            }

            AttendanceSession::query()->updateOrCreate($attributes, [
                'boundary' => $dayNumber === 1 ? 'departure' : null,
                'scheduled_date' => Carbon::parse($departure->departure_date)->startOfDay()->addDays($dayNumber - 1),
                'name' => "Điểm danh ngày {$dayNumber}",
                'created_by' => $user->id,
            ]);
        }
    }

    private function logAttendanceActivity(
        AttendanceSession $session,
        User $user,
        string $action,
        string $description,
        ?BookingParticipant $participant = null,
        ?array $metadata = null
    ): void {
        AttendanceActivityLog::query()->create([
            'attendance_session_id' => $session->id,
            'booking_participant_id' => $participant?->id,
            'actor_id' => $user->id,
            'action' => $action,
            'description' => $description,
            'metadata' => $metadata,
        ]);
    }

    private function itineraryDate(TourDeparture $departure, TourItinerary $itinerary): Carbon
    {
        return $this->scheduledDateForDay($departure, (int) $itinerary->day_number);
    }

    private function scheduledDateForDay(TourDeparture $departure, int $dayNumber): Carbon
    {
        return Carbon::parse($departure->departure_date)
            ->startOfDay()
            ->addDays(max($dayNumber - 1, 0));
    }

    /**
     * @throws ValidationException
     */
    private function assertItineraryWindowIsOpen(TourDeparture $departure, TourItinerary $itinerary): void
    {
        if ($this->itineraryWindowContainsNow($departure, $itinerary)) {
            return;
        }

        throw ValidationException::withMessages([
            'tour_itinerary_id' => 'Chỉ có thể điểm danh hoạt động được lên lịch trong hôm nay.',
        ]);
    }

    private function itineraryWindowContainsNow(TourDeparture $departure, ?TourItinerary $itinerary): bool
    {
        if (! $itinerary || ! $itinerary->start_time) {
            return false;
        }

        $sameDayItineraries = TourItinerary::query()
            ->where('tour_id', $departure->tour_id)
            ->where('day_number', $itinerary->day_number)
            ->orderBy('start_time')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
        $index = $sameDayItineraries->search(fn (TourItinerary $item) => $item->is($itinerary));

        if ($index === false) {
            return false;
        }

        $windowStart = $this->itineraryDate($departure, $itinerary)
            ->setTimeFromTimeString((string) $itinerary->start_time);
        $next = $sameDayItineraries->get($index + 1);
        $windowEnd = $next?->start_time
            ? $this->itineraryDate($departure, $next)->setTimeFromTimeString((string) $next->start_time)
            : $this->itineraryDate($departure, $itinerary)->setTime(23, 30);

        return now()->greaterThanOrEqualTo($windowStart) && now()->lessThan($windowEnd);
    }

    private function attendanceItineraryLabel(TourItinerary $itinerary): string
    {
        $time = $itinerary->start_time ? ' · '.mb_substr((string) $itinerary->start_time, 0, 5) : '';

        return "Ngày {$itinerary->day_number}{$time} · {$itinerary->title}";
    }

    /**
     * @throws ValidationException
     */
    private function assertBoundaryMatchesToday(TourDeparture $departure, string $boundary): void
    {
        $attendanceDate = $boundary === 'departure'
            ? $departure->departure_date
            : ($departure->return_date ?: $departure->departure_date);

        if ($attendanceDate?->isToday()) {
            return;
        }

        throw ValidationException::withMessages([
            'boundary' => $boundary === 'departure'
                ? 'Departure attendance is only available on the departure date.'
                : 'Return attendance is only available on the return date.',
        ]);
    }

    private function attendanceBoundaryLabel(string $boundary): string
    {
        return $boundary === 'departure'
            ? 'Điểm danh ngày khởi hành'
            : 'Điểm danh ngày kết thúc tour';
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

    /**
     * @throws ValidationException
     */
    private function assertDepartureCanTakeAttendance(TourDeparture $departure): void
    {
        if (in_array($departure->status, ['cancelled', 'canceled'], true)) {
            $reason = $departure->cancellation_reason === 'weather_disaster'
                ? 'Tour đã bị hủy do mưa bão hoặc thời tiết xấu.'
                : 'Không thể bắt đầu tour vì tour đã bị hủy. Lý do: Không đủ số lượng khách tối thiểu.';

            throw ValidationException::withMessages([
                'tour_departure_id' => $reason,
            ]);
        }

        if (! in_array($departure->status, ['open', 'closed', 'confirmed', 'in_progress'], true)) {
            throw ValidationException::withMessages([
                'tour_departure_id' => 'Chỉ có thể bắt đầu tour khi tour đã được xác nhận.',
            ]);
        }

        if ($this->isDepartureOngoing($departure)) {
            return;
        }

        throw ValidationException::withMessages([
            'tour_departure_id' => 'Only ongoing tour departures can take attendance.',
        ]);
    }

    private function isDepartureOngoing(TourDeparture $departure): bool
    {
        if (! in_array($departure->status, ['open', 'closed', 'confirmed', 'in_progress'], true)) {
            return false;
        }

        $today = Carbon::today();
        $departureDate = Carbon::parse($departure->departure_date)->startOfDay();
        $returnDate = Carbon::parse($departure->return_date ?: $departure->departure_date)->startOfDay();

        return $departureDate->lte($today) && $returnDate->gte($today);
    }

    private function currentItineraryDayNumber(TourDeparture $departure): ?int
    {
        $today = Carbon::today();
        $departureDate = Carbon::parse($departure->departure_date)->startOfDay();
        $returnDate = Carbon::parse($departure->return_date ?: $departure->departure_date)->startOfDay();

        if ($today->lt($departureDate) || $today->gt($returnDate)) {
            return null;
        }

        return $departureDate->diffInDays($today) + 1;
    }

    private function stageWindowState(TourDeparture $departure, TourDepartureStage $stage): string
    {
        $window = $this->stageWindowBounds($departure, $stage);

        if (! $window) {
            return 'unavailable';
        }

        [$windowStart, $windowEnd] = $window;
        $now = now();

        if ($now->lt($windowStart)) {
            return 'upcoming';
        }

        if ($now->gte($windowEnd)) {
            return 'ended';
        }

        return 'active';
    }

    /**
     * @return array{0: Carbon, 1: Carbon}|null
     */
    private function stageWindowBounds(TourDeparture $departure, TourDepartureStage $stage): ?array
    {
        if (! $stage->start_time && ! $stage->end_time) {
            return null;
        }

        $stageDate = $this->scheduledDateForDay($departure, (int) $stage->day_number);
        $windowStart = $stageDate->copy()->startOfDay();
        $windowEnd = $stageDate->copy()->endOfDay();

        if ($stage->start_time) {
            $windowStart->setTimeFromTimeString((string) $stage->start_time);
        }

        if ($stage->end_time) {
            $windowEnd->setTimeFromTimeString((string) $stage->end_time);
        } else {
            $nextStart = TourDepartureStage::query()
                ->where('tour_departure_id', $departure->id)
                ->where('day_number', $stage->day_number)
                ->whereNotNull('start_time')
                ->where(function (Builder $query) use ($stage): void {
                    $query->where('sort_order', '>', $stage->sort_order)
                        ->orWhere(function (Builder $query) use ($stage): void {
                            $query->where('sort_order', $stage->sort_order)
                                ->where('id', '>', $stage->id);
                        });
                })
                ->orderBy('sort_order')
                ->orderBy('id')
                ->value('start_time');

            if ($nextStart) {
                $windowEnd->setTimeFromTimeString((string) $nextStart);
            }
        }

        return $windowEnd->gt($windowStart) ? [$windowStart, $windowEnd] : null;
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

            if (
                $currentStage
                && $currentStage->status === 'pending'
                && $this->stageWindowState($lockedDeparture, $currentStage) === 'active'
            ) {
                $currentStage->update([
                    'status' => 'in_progress',
                    'started_at' => $currentStage->started_at ?? now(),
                ]);
                $currentStage = $currentStage->fresh();
            }

            $currentStageId = $currentStage?->id;
            if ((int) ($lockedDeparture->current_stage_id ?? 0) !== (int) ($currentStageId ?? 0)) {
                $lockedDeparture->update(['current_stage_id' => $currentStageId]);
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

        $currentDayNumber = $this->currentItineraryDayNumber($departure);
        $currentDayStarted = false;
        $now = now();

        foreach ($itineraries as $itinerary) {
            $isCurrentDay = $currentDayNumber !== null
                && (int) $itinerary->day_number === $currentDayNumber
                && ! $currentDayStarted;

            TourDepartureStage::query()->create([
                'tour_departure_id' => $departure->id,
                'tour_itinerary_id' => $itinerary->id,
                'day_number' => $itinerary->day_number,
                'sort_order' => $itinerary->sort_order,
                'type' => $itinerary->type,
                'title' => $itinerary->title,
                'start_time' => $itinerary->start_time,
                'end_time' => $itinerary->end_time,
                'status' => $isCurrentDay ? 'in_progress' : 'pending',
                'started_at' => $isCurrentDay ? $now : null,
            ]);

            $currentDayStarted = $currentDayStarted || $isCurrentDay;
        }
    }

    private function findDisplayCurrentStage(TourDeparture $departure): ?TourDepartureStage
    {
        $baseQuery = TourDepartureStage::query()
            ->where('tour_departure_id', $departure->id);

        $currentDayNumber = $this->currentItineraryDayNumber($departure);

        if ($currentDayNumber !== null) {
            $currentDayStages = (clone $baseQuery)
                ->where('day_number', $currentDayNumber)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get();

            return $this->getDisplayCurrentStage($departure, $currentDayStages);
        }

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
