<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Certificate;

class CertificateController extends Controller
{
    public function index()
    {
        $certificates = Certificate::all();

        return response()->json([
            'message' => 'Danh sách chứng chỉ',
            'data'    => $certificates,
        ]);
    }
}
