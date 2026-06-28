<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class TourItineraryResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'tour_id' => $this->tour_id,
            'day_number' => $this->day_number,
            'sort_order' => $this->sort_order,
            'type' => $this->type,
            'title' => $this->title,
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'duration' => $this->duration,
            'transport' => $this->transport,
            'description' => $this->description,
            'images' => TourItineraryImageResource::collection($this->whenLoaded('images')),
        ];
    }
}
