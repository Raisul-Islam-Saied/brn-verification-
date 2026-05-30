<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$cookie_file = dirname(__FILE__) . '/cookie.txt';
$url = "https://everify.bdris.gov.bd/";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_COOKIEJAR, $cookie_file);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// ব্রাউজারের মতো সাজার জন্য User-Agent ও হেডার (এটি ব্লক হওয়া থেকে বাঁচাবে)
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language: en-US,en;q=0.5',
    'Connection: keep-alive',
]);

$response = curl_exec($ch);
$curl_error = curl_error($ch);
curl_close($ch);

// যদি cURL রিকোয়েস্টে কোনো এরর থাকে
if ($curl_error) {
    echo json_encode(['status' => 'error', 'captcha' => 'সার্ভার কানেকশন এরর: ' . $curl_error]);
    exit;
}

// যদি সরকারি সার্ভার থেকে কোনো ডেটা না আসে
if (empty($response)) {
    echo json_encode(['status' => 'error', 'captcha' => 'সরকারি সার্ভার থেকে রেসপন্স আসছে না (সম্ভবত আইপি ব্লক)']);
    exit;
}

// DOM Document ব্যবহার করে ক্যাপচা এক্সট্র্যাক্ট করা
$dom = new DOMDocument();
@$dom->loadHTML($response);
$xpath = new DOMXPath($dom);

// ক্যাপচার অংকটি খোঁজার জন্য একটু জেনেরিক লজিক দিলাম
$captcha_node = $xpath->query('//div[contains(@class, "captcha")] | //text()[contains(., "+") or contains(., "-")]')->item(0); 

if ($captcha_node) {
    $captcha_text = trim($captcha_node->nodeValue);
    // যদি খুব বড় টেক্সট চলে আসে, সেটা ফিল্টার করা
    if(strlen($captcha_text) > 15) {
         echo json_encode(['status' => 'error', 'captcha' => 'সঠিক ক্যাপচা ট্যাগ পাওয়া যায়নি']);
    } else {
         echo json_encode(['status' => 'success', 'captcha' => $captcha_text]);
    }
} else {
    echo json_encode(['status' => 'error', 'captcha' => 'ক্যাপচা HTML-এ পাওয়া যায়নি']);
}
?>
