<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceSessionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tour_departure_id' => $this->tour_departure_id,
            'tour_itinerary_id' => $this->tour_itinerary_id,
            'scheduled_date' => $this->scheduled_date?->toDateString(),
            'boundary' => $this->boundary,
            'name' => $this->name,
            'note' => $this->note,
            'status' => $this->status,
            'created_by' => $this->created_by,
            'creator' => $this->whenLoaded('creator', fn () => $this->creator?->only(['id', 'full_name', 'email'])),
            'itinerary' => $this->whenLoaded('itinerary', fn () => $this->itinerary?->only([
                'id',
                'day_number',
                'sort_order',
                'type',
                'title',
                'start_time',
                'end_time',
            ])),
            'can_take_attendance' => (bool) ($this->resource->getAttribute('can_take_attendance')
                ?? ($this->status === 'active' && $this->scheduled_date?->isToday())),
            'attendance_count' => $this->whenNotNull($this->resource->getAttribute('attendances_count')),
            'checked_in_count' => $this->whenNotNull($this->resource->getAttribute('checked_in_count')),
            'checked_out_count' => $this->whenNotNull($this->resource->getAttribute('checked_out_count')),
            'absent_count' => $this->whenNotNull($this->resource->getAttribute('absent_count')),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
