<?php

use App\Models\Faq;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('public faq endpoint returns only active questions in configured order', function () {
    $later = Faq::factory()->create([
        'question' => 'Câu hỏi hiển thị sau',
        'sort_order' => 20,
    ]);
    $first = Faq::factory()->create([
        'question' => 'Câu hỏi hiển thị trước',
        'sort_order' => 10,
    ]);
    Faq::factory()->inactive()->create([
        'question' => 'Câu hỏi đã tắt',
        'sort_order' => 1,
    ]);

    $this->getJson('/api/faqs')
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('message', 'Danh sách câu hỏi thường gặp.')
        ->assertJsonPath('data.total', 2)
        ->assertJsonPath('data.items.0.id', $first->id)
        ->assertJsonPath('data.items.1.id', $later->id)
        ->assertJsonCount(10, 'data.categories')
        ->assertJsonStructure([
            'data' => [
                'items' => [[
                    'id',
                    'category',
                    'category_label',
                    'question',
                    'answer',
                    'keywords',
                    'sort_order',
                    'created_at',
                    'updated_at',
                ]],
            ],
        ]);
});

test('faq endpoint filters by category', function () {
    Faq::factory()->forCategory(Faq::CATEGORY_PAYMENT)->create();
    Faq::factory()->forCategory(Faq::CATEGORY_BOOKING)->create();

    $this->getJson('/api/faqs?category=payment')
        ->assertOk()
        ->assertJsonPath('data.total', 1)
        ->assertJsonPath('data.items.0.category', Faq::CATEGORY_PAYMENT);
});

test('faq search matches question answer and keywords without case or accents', function () {
    $questionFaq = Faq::factory()->create([
        'question' => 'Tôi muốn hủy tour như thế nào?',
        'answer' => 'Vui lòng gửi yêu cầu.',
        'keywords' => ['hủy đơn'],
    ]);
    $answerFaq = Faq::factory()->create([
        'question' => 'Bao lâu nhận được kết quả?',
        'answer' => 'Khoản hoàn tiền được xử lý sau khi xác nhận.',
        'keywords' => ['ngân hàng'],
    ]);
    $keywordFaq = Faq::factory()->create([
        'question' => 'Có thể thay đổi đơn không?',
        'answer' => 'Bạn vui lòng liên hệ hỗ trợ.',
        'keywords' => ['đổi lịch khởi hành'],
    ]);

    $this->getJson('/api/faqs?search=HUY%20TOUR')
        ->assertOk()
        ->assertJsonPath('data.total', 1)
        ->assertJsonPath('data.items.0.id', $questionFaq->id);

    $this->getJson('/api/faqs?search=hoan%20tien')
        ->assertOk()
        ->assertJsonPath('data.total', 1)
        ->assertJsonPath('data.items.0.id', $answerFaq->id);

    $this->getJson('/api/faqs?search=DOI%20LICH')
        ->assertOk()
        ->assertJsonPath('data.total', 1)
        ->assertJsonPath('data.items.0.id', $keywordFaq->id);
});

test('faq endpoint returns a consistent empty result', function () {
    Faq::factory()->create();

    $this->getJson('/api/faqs?search=khong-co-ket-qua')
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('message', 'Không tìm thấy câu hỏi thường gặp phù hợp.')
        ->assertJsonPath('data.total', 0)
        ->assertJsonCount(0, 'data.items');
});

test('faq endpoint validates category and search query', function () {
    $this->getJson('/api/faqs?category=unknown')
        ->assertUnprocessable()
        ->assertJsonPath('success', false)
        ->assertJsonValidationErrors('category');

    $this->getJson('/api/faqs?search='.str_repeat('a', 201))
        ->assertUnprocessable()
        ->assertJsonPath('success', false)
        ->assertJsonValidationErrors('search');
});
