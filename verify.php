<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $brn = $_POST['brn'];
    $dob = $_POST['dob'];
    $answer = $_POST['captcha_answer'];
    
    // নতুন টোকেনগুলো
    $csrf = $_POST['csrf'];
    $cap_text = $_POST['cap_text'];

    $cookie_file = dirname(__FILE__) . '/cookie.txt';
    // নতুন সাবমিট URL
    $url = "https://everify.bdris.gov.bd/UBRNVerification/Search"; 

    // ফর্ম ডেটা (অফিশিয়াল ওয়েবসাইটের name attribute অনুযায়ী)
    $post_data = http_build_query([
        '__RequestVerificationToken' => $csrf,
        'UBRN' => $brn,
        'BirthDate' => $dob,
        'CaptchaDeText' => $cap_text,
        'CaptchaInputText' => $answer
    ]);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_COOKIEFILE, $cookie_file); // আগের কুকি ব্যবহার
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    $result_html = curl_exec($ch);
    curl_close($ch);

    // HTML থেকে রেজাল্ট চেক করা
    if (strpos($result_html, 'Registered Person Name') !== false) {
        $dom = new DOMDocument();
        @$dom->loadHTML($result_html);
        $xpath = new DOMXPath($dom);
        
        $name_node = $xpath->query('//td[contains(text(), "Registered Person Name")]/following-sibling::td')->item(0);
        
        echo "<h2>যাচাই সফল!</h2>";
        echo "শিক্ষার্থীর নাম: " . ($name_node ? $name_node->nodeValue : 'পাওয়া যায়নি') . "<br>";
        // এখানে ডাটাবেসে সেভ করার কোড লিখবেন
    } else {
        echo "<h2>ত্রুটি!</h2>";
        echo "জন্মনিবন্ধন নম্বর, তারিখ বা ক্যাপচা ভুল হয়েছে অথবা সার্ভার রেসপন্স করেনি।";
    }
}
?>
