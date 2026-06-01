<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$cookie_file = dirname(__FILE__) . '/cookie.txt';
$url = "https://everify.bdris.gov.bd/";

// ১. প্রথম রিকোয়েস্ট: পেজের HTML এবং টোকেনগুলো আনা
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_COOKIEJAR, $cookie_file); // কুকি সেভ করবে
curl_setopt($ch, CURLOPT_COOKIEFILE, $cookie_file); // আগের সেশন থাকলে পাঠাবে
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
$html = curl_exec($ch);
curl_close($ch); // প্রথম রিকোয়েস্ট ক্লোজ করে কুকি ফাইলে রাইট করা নিশ্চিত করা হলো

// CSRF Token খোঁজা
preg_match('/name="__RequestVerificationToken" type="hidden" value="(.*?)"/', $html, $csrf_match);
$csrf_token = $csrf_match[1] ?? '';

// CaptchaDeText খোঁজা
preg_match('/id="CaptchaDeText" name="CaptchaDeText" type="hidden" value="(.*?)"/', $html, $cap_match);
$captcha_text = $cap_match[1] ?? '';

// Captcha Image URL খোঁজা
preg_match('/id="CaptchaImage" src="(.*?)"/', $html, $img_match);
$img_path = $img_match[1] ?? '';

// URL এর ভেতরের HTML Entity (যেমন &amp;) কনভার্ট করা জরুরি, নাহলে লিংক কাজ করবে না
$img_path = html_entity_decode($img_path);
$img_url = "https://everify.bdris.gov.bd" . $img_path;

// ২. দ্বিতীয় রিকোয়েস্ট: ক্যাপচা ছবিটি ডাউনলোড করা
$ch2 = curl_init();
curl_setopt($ch2, CURLOPT_URL, $img_url);
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_COOKIEFILE, $cookie_file); // প্রথম রিকোয়েস্টের সেভ করা কুকি ব্যবহার
curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch2, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
curl_setopt($ch2, CURLOPT_REFERER, $url); // সার্ভারকে বোঝানো যে রিকোয়েস্টটি মূল সাইট থেকেই যাচ্ছে

$image_data = curl_exec($ch2);
curl_close($ch2);

// কালো এরর ছবিটির সাইজ সাধারণত খুব ছোট হয় (১ কেবির নিচে), তাই সাইজ চেক করে নেওয়া হলো
if($image_data && $csrf_token && strlen($image_data) > 1000) {
    // ছবিটিকে Base64-এ রূপান্তর
    $base64_image = 'data:image/jpeg;base64,' . base64_encode($image_data);
    echo json_encode([
        'status' => 'success', 
        'image' => $base64_image, 
        'csrf' => $csrf_token, 
        'cap_text' => $captcha_text
    ]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'সঠিক ক্যাপচা ছবি সার্ভার থেকে আসেনি বা সেশন ব্লক হয়েছে']);
}
?>
