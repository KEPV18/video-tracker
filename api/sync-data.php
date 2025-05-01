<?php
// sync-data.php

// Set the API key (should be stored in a secure environment variable)
define('API_KEY', 'your-secret-api-key'); // Replace with your actual API key

// Check if the API key is valid
if (!isset($_SERVER['HTTP_X_API_KEY']) || $_SERVER['HTTP_X_API_KEY'] !== API_KEY) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid API key']);
    exit;
}

// Get the request data
$data = json_decode(file_get_contents('php://input'), true);

if (empty($data) || !isset($data['videosLogged'], $data['totalSeconds'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request data']);
    exit;
}

// Get today's date
$today = date('Y-m-d');

// Load existing data or initialize new data
$dataDir = __DIR__ . '/../data/';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

$dataFile = $dataDir . $today . '.json';

if (file_exists($dataFile)) {
    $existingData = json_decode(file_get_contents($dataFile), true);
} else {
    $existingData = [
        'date' => $today,
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
        'isVacation' => false,
        'createdAt' => date('Y-m-d H:i:s'),
        'updatedAt' => date('Y-m-d H:i:s')
    ];
}

// Update the data
$existingData['videosLogged'] = $data['videosLogged'];
$existingData['totalSeconds'] = $data['totalSeconds'];
$existingData['vacationMode'] = $data['vacationMode'] ?? false;

// Calculate speed
if ($existingData['totalSeconds'] > 0) {
    $existingData['speed'] = $existingData['videosLogged'] / ($existingData['totalSeconds'] / 60);
} else {
    $existingData['speed'] = 0;
}

$existingData['updatedAt'] = date('Y-m-d H:i:s');

// Save the data
file_put_contents($dataFile, json_encode($existingData, JSON_PRETTY_PRINT));

// Sync with Google Sheets
syncWithGoogleSheets($existingData);

// Response
http_response_code(200);
echo json_encode(['message' => 'Data synced successfully']);

// Function to sync with Google Sheets
function syncWithGoogleSheets($data) {
    // Load the Google Client Library
    require_once __DIR__ . '/vendor/autoload.php';

    // Use the application default credentials
    putenv('GOOGLE_APPLICATION_CREDENTIALS=' . __DIR__ . '/credentials.json');

    $client = new Google_Client();
    $client->useApplicationDefaultCredentials();
    $client->addScope(Google_Service_Sheets::SPREADSHEETS);

    // The ID of the spreadsheet to update
    $spreadsheetId = 'your-google-sheets-id'; // Replace with your actual spreadsheet ID

    // The range of cells to update
    $range = 'Sheet1';

    // Create the service object
    $service = new Google_Service_Sheets($client);

    // Prepare the data for the sheet
    $rowData = [
        [
            $data['date'],
            $data['videosLogged'],
            $data['totalSeconds'] / 3600, // Convert seconds to hours
            $data['speed'],
            $data['videosOfficial'] ?? '',
            $data['hoursOfficial'] ?? '',
            $data['speedOfficial'] ?? '',
            $data['diffVideos'] ?? '',
            $data['diffHours'] ?? '',
            $data['diffSpeed'] ?? '',
            $data['isVacation'] ? 'Yes' : 'No'
        ]
    ];

    // Create the value range object
    $body = new Google_Service_Sheets_ValueRange([
        'values' => $rowData
    ]);

    // Try to append the data
    try {
        $params = [
            'valueInputOption' => 'USER_ENTERED'
        ];

        // Check if the date already exists in the sheet
        $existingDataResponse = $service->spreadsheets_values->get($spreadsheetId, $range);
        $existingData = $existingDataResponse->getValues();

        $found = false;
        foreach ($existingData as $index => $row) {
            if (isset($row[0]) && $row[0] === $data['date']) {
                // Update the existing row
                $updateRange = $range . $index;
                $service->spreadsheets_values->update(
                    $spreadsheetId,
                    $updateRange,
                    $body,
                    $params
                );
                $found = true;
                break;
            }
        }

        if (!$found) {
            // Append new row
            $service->spreadsheets_values->append(
                $spreadsheetId,
                $range,
                $body,
                $params
            );
        }

    } catch (Exception $e) {
        // If Google Sheets API fails, log the error and save to pending sync
        error_log('Google Sheets API error: ' . $e->getMessage());
        
        // Save to pending sync file
        $pendingDir = __DIR__ . '/../pending_sync/';
        if (!is_dir($pendingDir)) {
            mkdir($pendingDir, 0755, true);
        }
        
        $pendingFile = $pendingDir . uniqid() . '.json';
        file_put_contents($pendingFile, json_encode($data));
        
        // Try to process pending sync files
        processPendingSync();
    }
}

// Function to process pending sync files
function processPendingSync() {
    $pendingDir = __DIR__ . '/../pending_sync/';
    if (!is_dir($pendingDir)) {
        return;
    }

    $files = scandir($pendingDir);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') {
            continue;
        }

        $filePath = $pendingDir . $file;
        $data = json_decode(file_get_contents($filePath), true);

        try {
            // Attempt to sync with Google Sheets again
            syncWithGoogleSheets($data);
            
            // If successful, delete the pending file
            unlink($filePath);
        } catch (Exception $e) {
            // If it fails again, leave it for next attempt
            error_log('Failed to process pending sync file: ' . $file);
        }
    }
}
