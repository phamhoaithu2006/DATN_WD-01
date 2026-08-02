<?php

namespace App\Support;

class BookingPhoneNormalizer
{
    public static function normalize(?string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', trim((string) $phone));

        if (str_starts_with($digits, '84') && strlen($digits) === 11) {
            $digits = '0'.substr($digits, 2);
        }

        return $digits !== '' ? $digits : null;
    }
}
