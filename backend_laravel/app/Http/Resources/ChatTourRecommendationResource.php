<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChatTourRecommendationResource extends JsonResource
{
    /**
     * @return array<string, int|string>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'slug' => (string) $this->slug,
            'title' => (string) $this->title,
        ];
    }
}
