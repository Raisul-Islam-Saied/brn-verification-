<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $brn = $_POST['brn'];
    $dob = $_POST['dob'];
    $captcha_answer = $_POST['captcha_answer'];
    
    $csrf = $_POST['csrf'];
    $cap_text = $_POST['cap_text'];
    // হিডেন ফিল্ড থেকে কুকি ডিকোড করা
    $cookie_str = base64_decode($_POST['cookie_data']); 

    $url = "https://everify.bdris.gov.bd/UBRNVerification/Search";

    // সরকারি ওয়েবসাইটের ফর্মে ঠিক যেই নামগুলো আছে, সেই অনুযায়ী ডেটা সাজানো
    $post_data = http_build_query([
        '__RequestVerificationToken' => $csrf,
        'UBRN' => $brn,
        'BirthDate' => $dob,
        'CaptchaDeText' => $cap_text,
        'CaptchaInputText' => $captcha_answer
    ]);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    // ব্রাউজারের মতো সাজার জন্য হেডার ও কুকি যুক্ত করা
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    curl_setopt($ch, CURLOPT_COOKIE, $cookie_str); // API থেকে পাওয়া সেইম সেশন কুকি
    curl_setopt($ch, CURLOPT_REFERER, 'https://everify.bdris.gov.bd/'); 
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/x-www-form-urlencoded',
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    ]);

    $result_html = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        die("cURL Error: " . $error);
    }

    // HTML থেকে রেজাল্ট চেক করা
    if (strpos($result_html, 'Registered Person Name') !== false) {
        $dom = new DOMDocument();
        @$dom->loadHTML(mb_convert_encoding($result_html, 'HTML-ENTITIES', 'UTF-8'));
        $xpath = new DOMXPath($dom);
        
        $name_node = $xpath->query('//td[contains(text(), "Registered Person Name")]/following-sibling::td')->item(0);
        
        echo "<h2 style='color:green;'>যাচাই সফল!</h2>";
        echo "<b>শিক্ষার্থীর নাম:</b> " . ($name_node ? trim($name_node->nodeValue) : 'পাওয়া যায়নি') . "<br>";
        
        // এখানে আপনি ডেটাবেসে (MySQL) সেভ করার কোড লিখতে পারেন

    } else {
        echo "<h2 style='color:red;'>ত্রুটি বা তথ্য মেলেনি!</h2>";
        echo "সম্ভাব্য কারণ: জন্মনিবন্ধন নম্বর ভুল, জন্মতারিখ ভুল অথবা আপনি ক্যাপচা ভুল লিখেছেন।";
        echo "<br><br><a href='index.php'>আবার চেষ্টা করুন</a>";
    }
}
?>
