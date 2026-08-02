<?php

namespace App\Http\Requests\Customer;

use App\Support\BookingPhoneNormalizer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'tour_departure_id' => [
                'required',
                'integer',
                'exists:tour_departures,id',
            ],

            'number_of_people' => [
                'required',
                'integer',
                'min:1',
                'max:20',
            ],

            'note' => [
                'nullable',
                'string',
                'max:2000',
            ],

            'quantity_summary' => [
                'nullable',
                'array',
                'min:1',
                'max:20',
            ],

            'quantity_summary.*.rule_id' => [
                'nullable',
                'integer',
                'exists:tour_age_pricing_rules,id',
            ],

            'quantity_summary.*.quantity' => [
                'required_with:quantity_summary',
                'integer',
                'min:0',
                'max:20',
            ],

            'contact' => [
                'required',
                'array',
            ],

            'contact.contact_name' => [
                'required',
                'string',
                'max:150',
            ],

            'contact.contact_email' => [
                'nullable',
                'email',
                'max:150',
            ],

            'contact.contact_phone' => [
                'required',
                'string',
                'regex:/^0\d{9}$/',
            ],

            'contact.address' => [
                'nullable',
                'string',
                'max:255',
            ],

            'contact.special_request' => [
                'nullable',
                'string',
                'max:2000',
            ],

            'participants' => [
                'required',
                'array',
                'min:1',
                'max:20',
            ],

            'participants.*.full_name' => [
                'required',
                'string',
                'max:150',
            ],

            'participants.*.phone' => [
                'nullable',
                'string',
                'regex:/^0\d{9}$/',
            ],

            'participants.*.birth_date' => [
                'required',
                'date',
                'before_or_equal:today',
            ],

            'participants.*.gender' => [
                'required',
                'string',
                'max:20',
                'in:male,female,other',
            ],

            'participants.*.identity_number' => [
                'nullable',
                'string',
                'max:30',
            ],

        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $numberOfPeople = (int) $this->input('number_of_people', 0);
                $participants = $this->input('participants', []);

                if (
                    is_array($participants) &&
                    $numberOfPeople > 0 &&
                    count($participants) !== $numberOfPeople
                ) {
                    $validator->errors()->add(
                        'participants',
                        'Số lượng hành khách phải đúng bằng số người tham gia để phục vụ điểm danh tour.'
                    );
                }

                $quantitySummary = $this->input('quantity_summary', []);
                if (is_array($quantitySummary) && $quantitySummary !== []) {
                    $selectedPeople = collect($quantitySummary)->sum(fn ($item) => (int) ($item['quantity'] ?? 0));

                    if ($numberOfPeople > 0 && $selectedPeople !== $numberOfPeople) {
                        $validator->errors()->add(
                            'quantity_summary',
                            'Tổng số lượng đã chọn phải đúng bằng số người đặt tour.'
                        );
                    }
                }

            },
        ];
    }

    protected function prepareForValidation(): void
    {
        $contact = (array) $this->input('contact', []);
        $participants = collect($this->input('participants', []))
            ->map(function (array $participant): array {
                $participant['phone'] = BookingPhoneNormalizer::normalize($participant['phone'] ?? null);

                return $participant;
            })
            ->all();

        $contact['contact_phone'] = BookingPhoneNormalizer::normalize($contact['contact_phone'] ?? null);

        $this->merge([
            'contact' => $contact,
            'participants' => $participants,
        ]);
    }

    public function messages(): array
    {
        return [
            'tour_departure_id.exists' => 'Lịch khởi hành không tồn tại.',
            'participants.required' => 'Vui lòng nhập đầy đủ danh sách hành khách tham gia.',
            'participants.*.birth_date.required' => 'Vui lòng chọn ngày sinh.',
            'participants.*.birth_date.date' => 'Ngày sinh không hợp lệ.',
            'participants.*.birth_date.before_or_equal' => 'Ngày sinh không hợp lệ.',
            'quantity_summary.*.rule_id.exists' => 'Nhóm giá đã chọn không tồn tại.',
            'contact.contact_phone.regex' => 'Số điện thoại liên hệ phải gồm 10 chữ số và bắt đầu bằng số 0.',
            'participants.*.phone.regex' => 'Số điện thoại hành khách phải gồm 10 chữ số và bắt đầu bằng số 0.',
        ];
    }
}
