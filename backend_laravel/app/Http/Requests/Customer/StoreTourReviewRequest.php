<?php

namespace App\Http\Requests\Customer;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreTourReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'booking_id' => ['required', 'integer', 'exists:bookings,id'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'booking_id.required' => 'Vui lòng chọn booking cần đánh giá.',
            'rating.required' => 'Vui lòng chọn số sao đánh giá.',
            'rating.between' => 'Đánh giá phải nằm trong khoảng từ 1 đến 5 sao.',
            'comment.max' => 'Nội dung đánh giá tối đa 2.000 ký tự.',
        ];
    }
}
