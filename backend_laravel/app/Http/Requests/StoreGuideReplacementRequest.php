<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreGuideReplacementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:10', 'max:100'],
            'evidence' => ['nullable', 'file', 'max:5120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => 'Vui lòng nhập lý do xin đổi HDV.',
            'reason.min' => 'Lý do cần ít nhất 10 ký tự.',
            'reason.max' => 'Lý do không được vượt quá 100 ký tự.',
            'evidence.max' => 'Bằng chứng không được vượt quá 5MB.',
        ];
    }
}
