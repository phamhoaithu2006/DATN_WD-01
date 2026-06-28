<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Language;

class LanguageController extends Controller
{
    public function index()
    {
        $languages = Language::with('levels')->get();

        return response()->json([
            'message' => 'Danh sách ngôn ngữ',
            'data'    => $languages,
        ]);
    }
}
