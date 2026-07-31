<?php

namespace App\Http\Requests;

use App\Models\Faq;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class IndexFaqRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'category' => [
                'nullable',
                'string',
                Rule::in(array_keys(Faq::CATEGORY_LABELS)),
            ],
            'search' => ['nullable', 'string', 'max:200'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'category' => $this->cleanQueryValue('category'),
            'search' => $this->cleanQueryValue('search'),
        ]);
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Dữ liệu tìm kiếm FAQ không hợp lệ.',
            'errors' => $validator->errors(),
        ], 422));
    }

    private function cleanQueryValue(string $key): mixed
    {
        $value = $this->query($key);

        return is_string($value) ? trim($value) : $value;
    }
}
