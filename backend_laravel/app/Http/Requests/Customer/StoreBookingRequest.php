<?php

namespace App\Http\Requests\Customer;

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
                'max:255',
            ],

            'contact.contact_email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'contact.contact_phone' => [
                'required',
                'string',
                'max:30',
            ],

            'contact.address' => [
                'nullable',
                'string',
                'max:500',
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
                'max:255',
            ],

            'participants.*.phone' => [
                'nullable',
                'string',
                'max:30',
            ],

            'participants.*.birth_date' => [
                'required',
                'date',
                'before_or_equal:today',
            ],

            'participants.*.gender' => [
                'nullable',
                'string',
                'max:20',
            ],

            'participants.*.identity_number' => [
                'nullable',
                'string',
                'max:50',
            ],

            'participants.*.participant_type' => [
                'required',
                'string',
                'in:adult,child,infant',
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
                        'Số lượng thành viên phải đúng bằng số người đặt tour.'
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

                    $adultQuantity = collect($quantitySummary)
                        ->filter(fn ($item) => empty($item['rule_id']))
                        ->sum(fn ($item) => (int) ($item['quantity'] ?? 0));

                    if ($adultQuantity < 1) {
                        $validator->errors()->add(
                            'quantity_summary',
                            'Vui lòng chọn ít nhất 1 người lớn trước khi thêm trẻ em hoặc em bé.'
                        );
                    }
                }

                if (is_array($participants) && $participants !== []) {
                    $adultParticipants = collect($participants)
                        ->filter(fn ($participant) => ($participant['participant_type'] ?? null) === 'adult')
                        ->count();

                    if ($adultParticipants < 1) {
                        $validator->errors()->add(
                            'participants',
                            'Vui lòng nhập ít nhất 1 người lớn trước khi thêm trẻ em hoặc em bé.'
                        );
                    }
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'tour_departure_id.exists' => 'Lịch khởi hành không tồn tại.',
            'participants.required' => 'Vui lòng nhập danh sách người tham gia.',
            'quantity_summary.*.rule_id.exists' => 'Nhóm giá đã chọn không tồn tại.',
        ];
    }
}
