<?php
// Enable error reporting for debugging (remove in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set JSON response header
header('Content-Type: application/json');

// CORS headers if needed (adjust origin as needed)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Configuration
$config = [
    'to_email' => 'contact@rivianspotter.com', // Change to your email
    'from_email' => 'noreply@rivianspotter.com', // Change to your domain email
    'site_name' => 'Rivian Spotter',
    'save_to_db' => false, // Set to true if you want to save to database
    'db_file' => 'data/contact_submissions.json' // File-based storage for now
];

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Get and decode JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// If no JSON data, try regular POST data
if (!$data) {
    $data = $_POST;
}

// Validate required fields
$required_fields = ['name', 'email', 'subject', 'message'];
$errors = [];

foreach ($required_fields as $field) {
    if (empty($data[$field])) {
        $errors[] = "Field '$field' is required";
    }
}

// Validate email format
if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    $errors[] = "Invalid email format";
}

// Sanitize input data
$name = htmlspecialchars(strip_tags($data['name'] ?? ''));
$email = filter_var($data['email'] ?? '', FILTER_SANITIZE_EMAIL);
$subject_type = htmlspecialchars(strip_tags($data['subject'] ?? 'general'));
$message = htmlspecialchars(strip_tags($data['message'] ?? ''));

// Check for errors
if (!empty($errors)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Validation errors',
        'errors' => $errors
    ]);
    exit;
}

// Map subject types to readable text
$subject_map = [
    'new-location' => 'New Location Submission',
    'update' => 'Location Update Request',
    'bug' => 'Bug Report',
    'feature' => 'Feature Request',
    'general' => 'General Inquiry'
];

$email_subject = "[Rivian Spotter] " . ($subject_map[$subject_type] ?? 'Contact Form Submission');

// Create email body
$email_body = "New contact form submission from Rivian Spotter:\n\n";
$email_body .= "Name: $name\n";
$email_body .= "Email: $email\n";
$email_body .= "Subject: " . ($subject_map[$subject_type] ?? $subject_type) . "\n";
$email_body .= "Date: " . date('Y-m-d H:i:s') . "\n";
$email_body .= "IP Address: " . $_SERVER['REMOTE_ADDR'] . "\n\n";
$email_body .= "Message:\n";
$email_body .= str_repeat('-', 50) . "\n";
$email_body .= $message . "\n";
$email_body .= str_repeat('-', 50) . "\n";

// Create HTML version of email
$email_html = "
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8f8f8; padding: 20px; border-radius: 0 0 8px 8px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #555; }
        .value { margin-left: 10px; }
        .message-box { background: white; padding: 15px; border-radius: 6px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h2>New Contact Form Submission</h2>
            <p style='margin: 0; opacity: 0.9;'>Rivian Spotter</p>
        </div>
        <div class='content'>
            <div class='field'>
                <span class='label'>Name:</span>
                <span class='value'>$name</span>
            </div>
            <div class='field'>
                <span class='label'>Email:</span>
                <span class='value'><a href='mailto:$email'>$email</a></span>
            </div>
            <div class='field'>
                <span class='label'>Subject:</span>
                <span class='value'>" . ($subject_map[$subject_type] ?? $subject_type) . "</span>
            </div>
            <div class='field'>
                <span class='label'>Date:</span>
                <span class='value'>" . date('F j, Y g:i A') . "</span>
            </div>
            <div class='field'>
                <span class='label'>IP Address:</span>
                <span class='value'>{$_SERVER['REMOTE_ADDR']}</span>
            </div>
            <div class='message-box'>
                <h3 style='margin-top: 0;'>Message:</h3>
                <p>" . nl2br($message) . "</p>
            </div>
        </div>
    </div>
</body>
</html>
";

// Email headers
$headers = [
    'From' => $config['from_email'],
    'Reply-To' => $email,
    'X-Mailer' => 'PHP/' . phpversion(),
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/html; charset=UTF-8'
];

// Convert headers to string
$headers_string = '';
foreach ($headers as $key => $value) {
    $headers_string .= "$key: $value\r\n";
}

// Send email
$email_sent = false;
try {
    $email_sent = mail($config['to_email'], $email_subject, $email_html, $headers_string);
    
    // Also send a plain text version as backup
    if (!$email_sent) {
        $headers['Content-Type'] = 'text/plain; charset=UTF-8';
        $headers_string = '';
        foreach ($headers as $key => $value) {
            $headers_string .= "$key: $value\r\n";
        }
        $email_sent = mail($config['to_email'], $email_subject, $email_body, $headers_string);
    }
} catch (Exception $e) {
    error_log("Email sending failed: " . $e->getMessage());
}

// Save to database/file if enabled
if ($config['save_to_db']) {
    $submission = [
        'id' => uniqid(),
        'timestamp' => time(),
        'date' => date('Y-m-d H:i:s'),
        'name' => $name,
        'email' => $email,
        'subject' => $subject_type,
        'message' => $message,
        'ip' => $_SERVER['REMOTE_ADDR'],
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'email_sent' => $email_sent
    ];
    
    // Create data directory if it doesn't exist
    if (!file_exists('data')) {
        mkdir('data', 0755, true);
    }
    
    // Load existing submissions
    $submissions = [];
    if (file_exists($config['db_file'])) {
        $submissions = json_decode(file_get_contents($config['db_file']), true) ?? [];
    }
    
    // Add new submission
    $submissions[] = $submission;
    
    // Save back to file
    file_put_contents($config['db_file'], json_encode($submissions, JSON_PRETTY_PRINT));
}

// Send auto-reply to user (optional)
$auto_reply_subject = "Thank you for contacting Rivian Spotter";
$auto_reply_body = "
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f8f8f8; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1 style='margin: 0;'>Thank You!</h1>
            <p style='margin: 10px 0 0 0; opacity: 0.9;'>We've received your message</p>
        </div>
        <div class='content'>
            <p>Hi $name,</p>
            <p>Thank you for contacting Rivian Spotter! We've received your message and will get back to you as soon as possible.</p>
            <p><strong>Your submission details:</strong></p>
            <ul>
                <li>Subject: " . ($subject_map[$subject_type] ?? $subject_type) . "</li>
                <li>Submitted: " . date('F j, Y g:i A') . "</li>
            </ul>
            <p>We typically respond within 24-48 hours. If your message is urgent, please note that in a follow-up email.</p>
            <p>In the meantime, feel free to:</p>
            <ul>
                <li>Explore the <a href='https://rivianspotter.com'>Rivian Spotter map</a></li>
                <li>Check out our <a href='https://rivianspotter.com/about.html'>About page</a></li>
                <li>Follow us on social media for updates</li>
            </ul>
            <p>Best regards,<br>The Rivian Spotter Team</p>
            <center>
                <a href='https://rivianspotter.com' class='button'>Visit Rivian Spotter</a>
            </center>
        </div>
    </div>
</body>
</html>
";

// Send auto-reply
$auto_reply_headers = [
    'From' => $config['from_email'],
    'Reply-To' => $config['to_email'],
    'X-Mailer' => 'PHP/' . phpversion(),
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/html; charset=UTF-8'
];

$auto_reply_headers_string = '';
foreach ($auto_reply_headers as $key => $value) {
    $auto_reply_headers_string .= "$key: $value\r\n";
}

mail($email, $auto_reply_subject, $auto_reply_body, $auto_reply_headers_string);

// Return response
if ($email_sent) {
    echo json_encode([
        'success' => true,
        'message' => 'Thank you for your message! We\'ll get back to you soon.',
        'data' => [
            'name' => $name,
            'subject' => $subject_map[$subject_type] ?? $subject_type
        ]
    ]);
} else {
    // Log the error
    error_log("Failed to send email from Rivian Spotter contact form");
    
    // Still return success to user but log the issue
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'There was an issue sending your message. Please try again or email us directly at ' . $config['to_email']
    ]);
}
?>