<?php
// export-report.php

// Set the API key (should be stored in a secure environment variable)
define('API_KEY', 'your-secret-api-key'); // Replace with your actual API key

// Check if the API key is valid
if (!isset($_SERVER['HTTP_X_API_KEY']) || $_SERVER['HTTP_X_API_KEY'] !== API_KEY) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid API key']);
    exit;
}

// Check if type is provided
$type = isset($_GET['type']) ? $_GET['type'] : 'daily';

// Define the data directory
$dataDir = __DIR__ . '/../data/';

// Get today's date
$today = date('Y-m-d');

// Determine the date range based on the type
switch ($type) {
    case 'daily':
        $startDate = $today;
        $endDate = $today;
        break;
    case 'weekly':
        $startDate = date('Y-m-d', strtotime('last monday'));
        $endDate = date('Y-m-d', strtotime('next sunday'));
        break;
    case 'monthly':
        $startDate = date('Y-m-01');
        $endDate = date('Y-m-t');
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid report type']);
        exit;
}

// Collect data for the date range
$data = [];
for ($date = strtotime($startDate); $date <= strtotime($endDate); $date = strtotime('+1 day', $date)) {
    $currentDate = date('Y-m-d', $date);
    $dataFile = $dataDir . $currentDate . '.json';
    
    if (file_exists($dataFile)) {
        $data[] = json_decode(file_get_contents($dataFile), true);
    } else {
        $data[] = [
            'date' => $currentDate,
            'videosLogged' => 0,
            'totalSeconds' => 0,
            'vacationMode' => false,
            'speed' => 0,
            'videosOfficial' => null,
            'hoursOfficial' => null,
            'speedOfficial' => null,
            'diffVideos' => null,
            'diffHours' => null,
            'diffSpeed' => null,
            'isVacation' => false
        ];
    }
}

// Prepare CSV headers
$headers = [
    'Date',
    'Videos Logged',
    'Hours Worked',
    'Speed (videos/minute)',
    'Videos Official',
    'Hours Official',
    'Speed Official',
    'Difference Videos',
    'Difference Hours',
    'Difference Speed',
    'Is Vacation'
];

// Prepare CSV rows
$rows = [];
foreach ($data as $item) {
    $rows[] = [
        $item['date'],
        $item['videosLogged'],
        number_format($item['totalSeconds'] / 3600, 2),
        number_format($item['speed'], 2),
        $item['videosOfficial'] ?? '',
        $item['hoursOfficial'] ?? '',
        number_format($item['speedOfficial'], 2) ?? '',
        $item['diffVideos'] ?? '',
        number_format($item['diffHours'], 2) ?? '',
        number_format($item['diffSpeed'], 2) ?? '',
        $item['isVacation'] ? 'Yes' : 'No'
    ];
}

// Generate CSV content
$csvContent = fopen('php://temp', 'r+');
fputcsv($csvContent, $headers);
foreach ($rows as $row) {
    fputcsv($csvContent, $row);
}
rewind($csvContent);
$csv = stream_get_contents($csvContent);
fclose($csvContent);

// Set headers for CSV download
header('Content-Type: text/csv');
header('Content-Disposition: attachment; filename="video-tracker-report.csv"');
header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
header('Expires: 0');
header('Pragma: public');

// Output CSV content
echo $csv;
exit;
