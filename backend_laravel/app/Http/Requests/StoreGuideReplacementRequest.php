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
            'reason' => ['required', 'string', 'min:10', 'max:2000'],
            'evidence' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
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
            'reason.max' => 'Lý do không được vượt quá 2000 ký tự.',
            'evidence.mimes' => 'Bằng chứng chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc PDF.',
            'evidence.max' => 'Bằng chứng không được vượt quá 5MB.',
        ];
    }
}
