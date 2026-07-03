<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAttendanceNoteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'participant_id' => ['required', 'integer', 'exists:booking_participants,id'],
            'note' => ['nullable', 'string', 'max:1000'],
            'status' => ['sometimes', 'nullable', Rule::in(['not_checked_in', 'absent'])],
        ];
    }
}
