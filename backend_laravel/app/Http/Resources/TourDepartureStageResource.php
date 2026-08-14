<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TourDepartureStageResource extends JsonResource
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
            'day_number' => $this->day_number,
            'sort_order' => $this->sort_order,
            'type' => $this->type,
            'title' => $this->title,
            'destination_place' => $this->whenLoaded('itinerary', function (): ?array {
                $place = $this->itinerary?->destinationPlace;

                return $place ? [
                    'id' => $place->id,
                    'name' => $place->name,
                    'district_name' => $place->district?->name ?? $place->district_name,
                    'province_id' => $place->province_id ?? $place->district?->province_id,
                    'province_city' => $place->province?->name
                        ?? $place->district?->province?->name,
                    'activity_types' => $place->activity_types,
                    'address' => $place->address,
                ] : null;
            }),
            'status' => $this->status,
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'started_at' => $this->started_at?->toDateTimeString(),
            'completed_at' => $this->completed_at?->toDateTimeString(),
        ];
    }
}
