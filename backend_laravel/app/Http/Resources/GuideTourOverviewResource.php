<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GuideTourOverviewResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $tour = $this->relationLoaded('tour') ? $this->tour : null;

        return [
            'tour_departure_id' => $this->id,
            'tour_id' => $this->tour_id,
            'tour_code' => $tour?->getAttribute('tour_code') ?? $tour?->getAttribute('code') ?? $tour?->slug,
            'tour_name' => $tour?->title,
            'departure_date' => $this->departure_date?->toDateString(),
            'return_date' => $this->return_date?->toDateString(),
            'tour_status' => $tour?->status,
            'departure_status' => $this->status,
            'guides' => $this->whenLoaded('guideAssignments', fn () => $this->guideAssignments->map(fn ($assignment) => [
                'id' => $assignment->guide?->id,
                'guide_code' => $assignment->guide?->guide_code,
                'full_name' => $assignment->guide?->user?->full_name,
                'email' => $assignment->guide?->user?->email,
                'phone' => $assignment->guide?->user?->phone,
                'assignment_status' => $assignment->status,
                'assignment_note' => $assignment->note,
            ])),
            'current_stage' => $this->when(
                $this->relationLoaded('currentStage') && $this->currentStage,
                fn () => new TourDepartureStageResource($this->currentStage)
            ),
        ];
    }
}
