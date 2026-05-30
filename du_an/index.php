<?php
// Require file Common
require_once './commons/env.php';
require_once './commons/function.php';

// Require file Controllers

// Require file Models

// Khởi tạo
$act = $_GET['act'] ?? '/';
$id = $_GET['id'] ?? '';
$db = connectDB();
$tourID = isset($_GET['tourID']) ? intval($_GET['tourID']) : null;

match ($act) {

};
