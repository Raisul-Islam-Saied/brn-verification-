<?php
// কুকি সেভ করার জন্য একটি টেক্সট ফাইল
$cookie_file = dirname(__FILE__) . '/cookie.txt';
$url = "https://everify.bdris.gov.bd/";

// cURL ইনিশিয়ালাইজেশন
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_COOKIEJAR, $cookie_file); // কুকি সেভ করবে
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

$response = curl_exec($ch);
curl_close($ch);

// DOM Document ব্যবহার করে ক্যাপচা এক্সট্র্যাক্ট করা
$dom = new DOMDocument();
@$dom->loadHTML($response);
$xpath = new DOMXPath($dom);

// নোট: ওয়েবসাইটের বর্তমান ক্লাসের নামের ওপর ভিত্তি করে এই Query পরিবর্তন করতে হতে পারে
$captcha_node = $xpath->query('//div[@class="captcha-math"]')->item(0); 
$captcha_text = $captcha_node ? $captcha_node->nodeValue : "ক্যাপচা পাওয়া যায়নি";

echo json_encode(['status' => 'success', 'captcha' => $captcha_text]);
?>
