<?php

namespace App\Http\Requests\Customer;

use App\Support\BookingPhoneNormalizer;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCustomerBookingInformationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'contact' => ['required', 'array'],
            'contact.contact_name' => ['required', 'string', 'max:150'],
            'contact.contact_email' => ['nullable', 'email', 'max:150'],
            'contact.contact_phone' => ['required', 'string', 'regex:/^0\d{9}$/'],
            'contact.address' => ['nullable', 'string', 'max:255'],
            'contact.special_request' => ['nullable', 'string', 'max:2000'],
            'participants' => ['required', 'array', 'min:1', 'max:20'],
            'participants.*.id' => ['required', 'integer', 'exists:booking_participants,id'],
            'participants.*.full_name' => ['required', 'string', 'max:150'],
            'participants.*.phone' => ['nullable', 'string', 'regex:/^0\d{9}$/'],
            'participants.*.gender' => ['required', 'in:male,female,other'],
            'participants.*.identity_number' => ['nullable', 'string', 'max:30'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $contact = (array) $this->input('contact', []);
        $contact['contact_phone'] = BookingPhoneNormalizer::normalize($contact['contact_phone'] ?? null);

        $participants = collect($this->input('participants', []))
            ->map(function (array $participant): array {
                $participant['phone'] = BookingPhoneNormalizer::normalize($participant['phone'] ?? null);

                return $participant;
            })
            ->all();

        $this->merge([
            'contact' => $contact,
            'participants' => $participants,
        ]);
    }

    public function messages(): array
    {
        return [
            'contact.contact_phone.regex' => 'Số điện thoại liên hệ phải gồm 10 chữ số và bắt đầu bằng số 0.',
            'participants.*.phone.regex' => 'Số điện thoại hành khách phải gồm 10 chữ số và bắt đầu bằng số 0.',
        ];
    }
}
