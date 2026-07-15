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
            'name' => $this->name,
            'note' => $this->note,
            'status' => $this->status,
            'created_by' => $this->created_by,
            'creator' => $this->whenLoaded('creator', fn () => $this->creator?->only(['id', 'full_name', 'email'])),
            'attendance_count' => $this->whenNotNull($this->resource->getAttribute('attendances_count')),
            'checked_in_count' => $this->whenNotNull($this->resource->getAttribute('checked_in_count')),
            'checked_out_count' => $this->whenNotNull($this->resource->getAttribute('checked_out_count')),
            'absent_count' => $this->whenNotNull($this->resource->getAttribute('absent_count')),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
