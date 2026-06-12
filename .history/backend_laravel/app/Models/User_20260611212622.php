<?php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    protected $guarded = [];
    
    // Nếu bạn muốn ẩn password khi trả về API
    protected $hidden = [
        'password', 'remember_token',
    ];
}