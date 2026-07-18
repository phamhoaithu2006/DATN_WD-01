<?php

test('login endpoint limits repeated requests', function () {
    for ($attempt = 0; $attempt < 6; $attempt++) {
        $this->postJson('/api/auth/login', [])->assertUnprocessable();
    }

    $this->postJson('/api/auth/login', [])->assertTooManyRequests();
});
