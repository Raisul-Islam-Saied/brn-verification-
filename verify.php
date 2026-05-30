<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $brn = $_POST['brn'];
    $dob = $_POST['dob'];
    $answer = $_POST['captcha_answer'];

    $cookie_file = dirname(__FILE__) . '/cookie.txt';
    $url = "https://everify.bdris.gov.bd/verify"; // POST URL (চেক করে নিতে হবে)

    // ফর্ম ডেটা
    $post_data = http_build_query([
        'brn' => $brn,
        'dob' => $dob,
        'captcha' => $answer
        // যদি hidden CSRF টোকেন থাকে, তবে fetch.php তে সেটিও এক্সট্র্যাক্ট করে এখানে পাঠাতে হবে
    ]);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_COOKIEFILE, $cookie_file); // আগের কুকি ব্যবহার করবে
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    // ব্রাউজারের মতো সাজার জন্য User-Agent দেওয়া জরুরি
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    $result_html = curl_exec($ch);
    curl_close($ch);

    // HTML থেকে শিক্ষার্থীর তথ্য বের করা
    $dom = new DOMDocument();
    @$dom->loadHTML($result_html);
    $xpath = new DOMXPath($dom);

    // শিক্ষার্থীর নাম খোঁজার লজিক (তাদের HTML টেবিলের ওপর ভিত্তি করে)
    $name_node = $xpath->query('//td[contains(text(), "Registered Person Name")]/following-sibling::td')->item(0);

    if ($name_node) {
        echo "<h2>যাচাই সফল!</h2>";
        echo "শিক্ষার্থীর নাম: " . $name_node->nodeValue . "<br>";
        echo "এখন এই ডেটা আপনার ডাটাবেসে সেভ করে ভর্তি প্রক্রিয়া সম্পন্ন করতে পারেন।";
    } else {
        echo "<h2>ত্রুটি!</h2>";
        echo "জন্মনিবন্ধন নম্বর, তারিখ বা ক্যাপচা ভুল হয়েছে। দয়া করে আবার চেষ্টা করুন।";
    }
}
?>
