<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Hardcoded Values
$API_TOKEN = 'sk_b504cdd4f59f4e89860d2d2a40ed1375b1ebb3ae6beca4de8833cb3bf441301c';
$PRODUCT_HASH = 'prod_1f78c1869f949924';
$PRODUCT_TITLE = 'Sonofix';
$PIX_EXPIRATION_MINUTES = 5;

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'check_status') {
    $hash = isset($_GET['hash']) ? $_GET['hash'] : '';
    if (empty($hash)) {
        echo json_encode(['success' => false, 'error' => 'Hash missing']);
        exit;
    }

    $ch = curl_init("https://multi.paradisepags.com/api/v1/check_status.php?hash=" . urlencode($hash));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $API_TOKEN"
    ]);

    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpcode == 200 && $response) {
        // Assume API format gives {"status": "paid"} etc.
        $decoded = json_decode($response, true);
        echo json_encode(['success' => true, 'status' => $decoded['status'] ?? 'pending']);
        exit;
    }

    echo json_encode(['success' => false, 'error' => 'Failed to check status']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        echo json_encode(['success' => false, 'error' => 'Invalid payload']);
        exit;
    }

    $customer = $data['customer'] ?? [];
    
    // Mount ParadisePags payload expected form
    $apiPayload = [
        "product_hash" => $PRODUCT_HASH,
        "customer" => $customer,
        "utms" => $data['utms'] ?? []
    ];
    // Adding offer/total dynamically if available in ParadisePags expected format or directly
    if (isset($data['total'])) {
        $apiPayload['total'] = $data['total'];
    }
    if (isset($data['offer'])) {
        $apiPayload['offer'] = $data['offer'];
    }

    $ch = curl_init("https://multi.paradisepags.com/api/v1/transaction.php");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($apiPayload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $API_TOKEN",
        "Content-Type: application/json"
    ]);

    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $decoded = json_decode($response, true);
    
    if ($httpcode >= 200 && $httpcode < 300 && $decoded) {
        // Return exactly what script expects
        echo json_encode([
            'success' => true, 
            'hash' => current($decoded)['hash'] ?? $decoded['hash'] ?? null,
            'pix' => $decoded
        ]);
        exit;
    }

    // Pass the real error forward
    echo json_encode([
        'success' => false, 
        'error' => $decoded['error'] ?? $decoded['message'] ?? 'Failed from Gateway'
    ]);
    exit;
}

echo json_encode(['success' => false, 'error' => 'Method not supported']);
exit;
?>
