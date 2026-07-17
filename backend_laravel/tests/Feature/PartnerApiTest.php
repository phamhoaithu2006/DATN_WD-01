<?php

test('legacy partner management endpoints are unavailable', function () {
    $this->getJson('/api/admin/partners')->assertNotFound();
    $this->postJson('/api/admin/partners')->assertNotFound();
});
