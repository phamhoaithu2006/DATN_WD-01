<?php

use App\Mail\PasswordResetOtpMail;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

const PASSWORD_RESET_NEUTRAL_MESSAGE = 'Nếu thông tin khớp với tài khoản, mã xác nhận đã được gửi tới email của bạn.';
const PASSWORD_RESET_INVALID_MESSAGE = 'Mã xác nhận không đúng hoặc đã hết hạn.';

function passwordResetUser(array $attributes = []): User
{
    return User::factory()->create($attributes);
}

function passwordResetSeedOtp(User $user, string $otp = '123456', ?Carbon $expiresAt = null): void
{
    $user->forceFill([
        'otp' => Hash::make($otp),
        'otp_expires_at' => $expiresAt ?? now()->addMinutes(10),
    ])->save();
}

beforeEach(function () {
    Mail::fake();
    $this->withoutMiddleware(ThrottleRequests::class);
});

test('forgot password with email sends mail containing valid otp and stores hashed otp', function () {
    $user = passwordResetUser();

    $response = $this->postJson('/api/auth/forgot-password', [
        'identifier' => $user->email,
    ]);

    $response->assertOk()->assertJson(['message' => PASSWORD_RESET_NEUTRAL_MESSAGE]);

    $fresh = $user->fresh();

    Mail::assertSent(PasswordResetOtpMail::class, function (PasswordResetOtpMail $mail) use ($user, $fresh) {
        return $mail->hasTo($user->email)
            && preg_match('/^\d{6}$/', $mail->otp) === 1
            && Hash::check($mail->otp, $fresh->otp)
            && $mail->otp !== $fresh->otp;
    });

    expect($fresh->otp_expires_at)->not->toBeNull()
        ->and($fresh->otp_expires_at->isAfter(now()->addMinutes(9)))->toBeTrue()
        ->and($fresh->otp_expires_at->isBefore(now()->addMinutes(11)))->toBeTrue();
});

test('forgot password with unknown identifier returns neutral response without sending mail', function () {
    $response = $this->postJson('/api/auth/forgot-password', [
        'identifier' => 'khong-ton-tai@example.com',
    ]);

    $response->assertOk()->assertJson(['message' => PASSWORD_RESET_NEUTRAL_MESSAGE]);

    Mail::assertNothingSent();
});

test('forgot password with 84-prefixed phone sends otp to the matching user email', function () {
    $user = passwordResetUser(['phone' => '0912345678']);

    $response = $this->postJson('/api/auth/forgot-password', [
        'identifier' => '84912345678',
    ]);

    $response->assertOk()->assertJson(['message' => PASSWORD_RESET_NEUTRAL_MESSAGE]);

    Mail::assertSent(PasswordResetOtpMail::class, fn (PasswordResetOtpMail $mail) => $mail->hasTo($user->email));
});

test('reset password succeeds with valid otp, clears otp and revokes all tokens', function () {
    $user = passwordResetUser();
    passwordResetSeedOtp($user);

    $user->createToken('phien-1');
    $user->createToken('phien-2');

    $response = $this->postJson('/api/auth/reset-password', [
        'identifier' => $user->email,
        'otp' => '123456',
        'password' => 'mat-khau-moi-123',
        'password_confirmation' => 'mat-khau-moi-123',
    ]);

    $response->assertOk()->assertJson(['message' => 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.']);

    $fresh = $user->fresh();

    expect(Hash::check('mat-khau-moi-123', $fresh->password))->toBeTrue()
        ->and($fresh->otp)->toBeNull()
        ->and($fresh->otp_expires_at)->toBeNull()
        ->and($user->tokens()->count())->toBe(0);
});

test('reset password with wrong otp fails and keeps the old password', function () {
    $user = passwordResetUser();
    passwordResetSeedOtp($user);

    $response = $this->postJson('/api/auth/reset-password', [
        'identifier' => $user->email,
        'otp' => '654321',
        'password' => 'mat-khau-moi-123',
        'password_confirmation' => 'mat-khau-moi-123',
    ]);

    $response->assertStatus(400)->assertJson(['message' => PASSWORD_RESET_INVALID_MESSAGE]);

    expect(Hash::check('password', $user->fresh()->password))->toBeTrue();
});

test('reset password with expired otp fails', function () {
    $user = passwordResetUser();
    passwordResetSeedOtp($user, '123456', now()->subMinute());

    $response = $this->postJson('/api/auth/reset-password', [
        'identifier' => $user->email,
        'otp' => '123456',
        'password' => 'mat-khau-moi-123',
        'password_confirmation' => 'mat-khau-moi-123',
    ]);

    $response->assertStatus(400)->assertJson(['message' => PASSWORD_RESET_INVALID_MESSAGE]);
});

test('reset password cannot reuse an otp after a successful reset', function () {
    $user = passwordResetUser();
    passwordResetSeedOtp($user);

    $payload = [
        'identifier' => $user->email,
        'otp' => '123456',
        'password' => 'mat-khau-moi-123',
        'password_confirmation' => 'mat-khau-moi-123',
    ];

    $this->postJson('/api/auth/reset-password', $payload)->assertOk();

    $this->postJson('/api/auth/reset-password', $payload)
        ->assertStatus(400)
        ->assertJson(['message' => PASSWORD_RESET_INVALID_MESSAGE]);
});

test('reset password with unknown identifier returns the same 400 message', function () {
    $response = $this->postJson('/api/auth/reset-password', [
        'identifier' => 'khong-ton-tai@example.com',
        'otp' => '123456',
        'password' => 'mat-khau-moi-123',
        'password_confirmation' => 'mat-khau-moi-123',
    ]);

    $response->assertStatus(400)->assertJson(['message' => PASSWORD_RESET_INVALID_MESSAGE]);
});

test('reset password respects password_min_length setting and requires confirmation', function () {
    Setting::create(['key' => 'password_min_length', 'value' => '10']);

    $user = passwordResetUser();
    passwordResetSeedOtp($user);

    $this->postJson('/api/auth/reset-password', [
        'identifier' => $user->email,
        'otp' => '123456',
        'password' => 'chin-ky-t',
        'password_confirmation' => 'chin-ky-t',
    ])->assertUnprocessable()->assertJsonValidationErrors('password');

    $this->postJson('/api/auth/reset-password', [
        'identifier' => $user->email,
        'otp' => '123456',
        'password' => 'mat-khau-du-dai-123',
    ])->assertUnprocessable()->assertJsonValidationErrors('password');
});

test('soft deleted user gets neutral forgot response and cannot reset password', function () {
    $user = passwordResetUser();
    passwordResetSeedOtp($user);
    $user->delete();

    $this->postJson('/api/auth/forgot-password', [
        'identifier' => $user->email,
    ])->assertOk()->assertJson(['message' => PASSWORD_RESET_NEUTRAL_MESSAGE]);

    Mail::assertNothingSent();

    $this->postJson('/api/auth/reset-password', [
        'identifier' => $user->email,
        'otp' => '123456',
        'password' => 'mat-khau-moi-123',
        'password_confirmation' => 'mat-khau-moi-123',
    ])->assertStatus(400)->assertJson(['message' => PASSWORD_RESET_INVALID_MESSAGE]);
});
