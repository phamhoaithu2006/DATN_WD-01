<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

// reset-password đọc Setting (query DB) trước khi validate nên cần schema tồn tại
uses(RefreshDatabase::class);

test('login endpoint limits repeated requests', function () {
    for ($attempt = 0; $attempt < 6; $attempt++) {
        $this->postJson('/api/auth/login', [])->assertUnprocessable();
    }

    $this->postJson('/api/auth/login', [])->assertTooManyRequests();
});

test('forgot password endpoint limits repeated requests', function () {
    for ($attempt = 0; $attempt < 5; $attempt++) {
        $this->postJson('/api/auth/forgot-password', [])->assertUnprocessable();
    }

    $this->postJson('/api/auth/forgot-password', [])->assertTooManyRequests();
});

test('reset password endpoint limits repeated requests', function () {
    for ($attempt = 0; $attempt < 10; $attempt++) {
        $this->postJson('/api/auth/reset-password', [])->assertUnprocessable();
    }

    $this->postJson('/api/auth/reset-password', [])->assertTooManyRequests();
});
