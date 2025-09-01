<?php
// Simple test file to verify PHP is working
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Test basic PHP functionality
echo json_encode([
    'success' => true,
    'message' => 'PHP is working!',
    'php_version' => phpversion(),
    'method' => $_SERVER['REQUEST_METHOD'],
    'time' => date('Y-m-d H:i:s'),
    'post_data' => $_POST,
    'json_data' => json_decode(file_get_contents('php://input'), true)
]);
?>