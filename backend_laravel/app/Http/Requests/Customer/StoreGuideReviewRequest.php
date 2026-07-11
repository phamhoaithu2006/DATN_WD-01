<?php

namespace App\Http\Requests\Customer;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreGuideReviewRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'booking_id' => ['required', 'integer', 'exists:bookings,id'],
            'guide_id' => ['required', 'integer', 'exists:guides,id'],
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
            'booking_id.required' => 'Vui long chon booking can danh gia.',
            'guide_id.required' => 'Vui long chon huong dan vien can danh gia.',
            'rating.required' => 'Vui long chon so sao danh gia.',
            'rating.between' => 'Danh gia phai nam trong khoang tu 1 den 5 sao.',
            'comment.max' => 'Noi dung danh gia toi da 2000 ky tu.',
        ];
    }
}
