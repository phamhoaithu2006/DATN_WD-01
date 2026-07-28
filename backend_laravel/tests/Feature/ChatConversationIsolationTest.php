<?php

use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('authenticated users only receive their own chat history regardless of supplied session id', function () {
    $userA = User::factory()->create();
    $userB = User::factory()->create();
    $sessionA = "user-{$userA->id}-safe-session";
    $sessionB = "user-{$userB->id}-safe-session";

    $conversationA = ChatConversation::query()->create([
        'session_id' => $sessionA,
        'user_id' => $userA->id,
    ]);
    $conversationB = ChatConversation::query()->create([
        'session_id' => $sessionB,
        'user_id' => $userB->id,
    ]);

    ChatMessage::query()->create([
        'chat_conversation_id' => $conversationA->id,
        'role' => 'user',
        'content' => 'private message A',
    ]);
    ChatMessage::query()->create([
        'chat_conversation_id' => $conversationB->id,
        'role' => 'user',
        'content' => 'private message B',
    ]);

    Sanctum::actingAs($userA);

    $this->getJson("/api/travel-assistant/messages?session_id={$sessionB}")
        ->assertOk()
        ->assertJsonPath('session_id', $sessionA)
        ->assertJsonPath('messages.0.content', 'private message A')
        ->assertJsonMissing(['content' => 'private message B']);

    Sanctum::actingAs($userB);

    $this->getJson("/api/travel-assistant/messages?session_id={$sessionA}")
        ->assertOk()
        ->assertJsonPath('session_id', $sessionB)
        ->assertJsonPath('messages.0.content', 'private message B')
        ->assertJsonMissing(['content' => 'private message A']);
});

test('a guest cannot read or append to an authenticated conversation', function () {
    Http::fake([
        '*' => Http::response([
            'candidates' => [[
                'content' => [
                    'parts' => [['text' => 'isolated guest response']],
                ],
            ]],
        ]),
    ]);

    $user = User::factory()->create();
    $conversation = ChatConversation::query()->create([
        'session_id' => "user-{$user->id}-private-session",
        'user_id' => $user->id,
    ]);

    ChatMessage::query()->create([
        'chat_conversation_id' => $conversation->id,
        'role' => 'user',
        'content' => 'registered private message',
    ]);

    $this->getJson("/api/travel-assistant/messages?session_id={$conversation->session_id}")
        ->assertOk()
        ->assertJsonPath('messages', [])
        ->assertJsonMissing(['content' => 'registered private message']);

    $response = $this->postJson('/api/travel-assistant', [
        'message' => 'attempted guest append',
        'session_id' => $conversation->session_id,
    ])->assertOk();

    expect($response->json('session_id'))
        ->toStartWith('guest-')
        ->not->toBe($conversation->session_id)
        ->and($conversation->messages()->count())->toBe(1);
});

test('an authenticated user cannot claim another users session id when creating chat', function () {
    Http::fake([
        '*' => Http::response([
            'candidates' => [[
                'content' => [
                    'parts' => [['text' => 'response for user B']],
                ],
            ]],
        ]),
    ]);

    $userA = User::factory()->create();
    $userB = User::factory()->create();
    $sessionA = "user-{$userA->id}-existing-session";
    $conversationA = ChatConversation::query()->create([
        'session_id' => $sessionA,
        'user_id' => $userA->id,
    ]);

    ChatMessage::query()->create([
        'chat_conversation_id' => $conversationA->id,
        'role' => 'user',
        'content' => 'original message A',
    ]);

    Sanctum::actingAs($userB);

    $response = $this->postJson('/api/travel-assistant', [
        'message' => 'new message B',
        'session_id' => $sessionA,
    ])->assertOk();

    $conversationB = ChatConversation::query()
        ->where('user_id', $userB->id)
        ->firstOrFail();

    expect($conversationB->session_id)
        ->not->toBe($sessionA)
        ->and($response->json('session_id'))->toBe($conversationB->session_id)
        ->and($conversationA->messages()->count())->toBe(1)
        ->and($conversationB->messages()->where('content', 'new message B')->exists())
        ->toBeTrue();
});

test('legacy globally keyed chat history is quarantined instead of being shown after login', function () {
    $user = User::factory()->create();
    $legacyConversation = ChatConversation::query()->create([
        'session_id' => 'session-legacy-global-key',
        'user_id' => $user->id,
    ]);

    ChatMessage::query()->create([
        'chat_conversation_id' => $legacyConversation->id,
        'role' => 'user',
        'content' => 'potentially mixed legacy history',
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/travel-assistant/messages?session_id=session-legacy-global-key')
        ->assertOk()
        ->assertJsonPath('messages', [])
        ->assertJsonMissing(['content' => 'potentially mixed legacy history']);
});

test('support staff cannot access a conversation assigned to another staff account by id', function () {
    $supportRole = Role::query()->firstOrCreate(
        ['name' => 'support staff'],
        ['description' => 'Support staff'],
    );
    $staffA = User::factory()->create(['role_id' => $supportRole->id]);
    $staffB = User::factory()->create(['role_id' => $supportRole->id]);
    $customer = User::factory()->create();

    $assignedConversation = ChatConversation::query()->create([
        'session_id' => 'assigned-to-staff-a',
        'user_id' => $customer->id,
        'mode' => 'human',
        'assigned_staff_id' => $staffA->id,
    ]);
    $pendingConversation = ChatConversation::query()->create([
        'session_id' => 'pending-unassigned',
        'user_id' => $customer->id,
        'mode' => 'pending_human',
        'handoff_requested_at' => now(),
    ]);

    Sanctum::actingAs($staffB);

    $this->getJson("/api/support/chat/{$assignedConversation->id}")
        ->assertForbidden();
    $this->postJson("/api/support/chat/{$assignedConversation->id}/reply", [
        'content' => 'unauthorized reply',
    ])->assertForbidden();
    $this->postJson("/api/support/chat/{$assignedConversation->id}/close")
        ->assertForbidden();

    $this->getJson("/api/support/chat/{$pendingConversation->id}")
        ->assertOk();
    $this->postJson("/api/support/chat/{$pendingConversation->id}/accept")
        ->assertOk();

    Sanctum::actingAs($staffA);

    $this->postJson("/api/support/chat/{$pendingConversation->id}/accept")
        ->assertConflict();
});
