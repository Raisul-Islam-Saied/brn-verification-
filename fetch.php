<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$cookie_file = dirname(__FILE__) . '/cookie.txt';
$url = "https://everify.bdris.gov.bd/";

// ১. প্রথম রিকোয়েস্ট: পেজের HTML এবং টোকেনগুলো আনা
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_COOKIEJAR, $cookie_file);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

$html = curl_exec($ch);

// CSRF Token খোঁজা
preg_match('/name="__RequestVerificationToken" type="hidden" value="(.*?)"/', $html, $csrf_match);
$csrf_token = $csrf_match[1] ?? '';

// CaptchaDeText খোঁজা
preg_match('/id="CaptchaDeText" name="CaptchaDeText" type="hidden" value="(.*?)"/', $html, $cap_match);
$captcha_text = $cap_match[1] ?? '';

// Captcha Image URL খোঁজা
preg_match('/id="CaptchaImage" src="(.*?)"/', $html, $img_match);
$img_url = "https://everify.bdris.gov.bd" . ($img_match[1] ?? '');

// ২. দ্বিতীয় রিকোয়েস্ট: ক্যাপচা ছবিটি ডাউনলোড করা
curl_setopt($ch, CURLOPT_URL, $img_url);
$image_data = curl_exec($ch);
curl_close($ch);

if($image_data && $csrf_token) {
    // ছবিটিকে Base64-এ রূপান্তর করে পাঠানো হচ্ছে
    $base64_image = 'data:image/jpeg;base64,' . base64_encode($image_data);
    echo json_encode([
        'status' => 'success', 
        'image' => $base64_image, 
        'csrf' => $csrf_token, 
        'cap_text' => $captcha_text
    ]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'ক্যাপচা লোড করা যায়নি']);
}
?>
