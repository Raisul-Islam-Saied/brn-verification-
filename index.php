<?php
// এখানে আপনার Render-এর API লিংকটি দেবেন
$api_url = "https://brn-verification.onrender.com/api/get-captcha"; 
// API থেকে ডেটা আনা হচ্ছে
$response = @file_get_contents($api_url);
$data = json_decode($response, true);

if ($data && $data['status'] == 'success') {
    $captcha_img = $data['captchaBase64'];
    $csrf = $data['csrfToken'];
    $cap_text = $data['capText'];
    
    // কুকিগুলোকে একটি স্ট্রিংয়ে সাজিয়ে নেওয়া হচ্ছে
    $cookie_str = "";
    foreach ($data['cookies'] as $cookie) {
        $cookie_str .= $cookie['name'] . "=" . $cookie['value'] . "; ";
    }
    // HTML-এ যেন ভেঙে না যায়, তাই Base64 করে রাখা হলো
    $cookie_encoded = base64_encode($cookie_str); 
} else {
    $error = "সরকারি সার্ভার বা API থেকে ক্যাপচা লোড করা যায়নি। পেজটি রিলোড দিন।";
}
?>

<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <title>ভর্তি সিস্টেম - জন্মনিবন্ধন যাচাই</title>
    <style>
        body { font-family: sans-serif; padding: 20px; }
        .form-container { border: 1px solid #ccc; padding: 20px; max-width: 400px; border-radius: 8px; }
        input[type="text"], input[type="date"] { width: 100%; padding: 8px; margin-top: 5px; margin-bottom: 15px; box-sizing: border-box; }
        button { background-color: #006a4e; color: white; padding: 10px 15px; border: none; cursor: pointer; width: 100%; border-radius: 4px;}
        button:hover { background-color: #005a42; }
    </style>
</head>
<body>
    <h2>শিক্ষার্থীর জন্মনিবন্ধন যাচাই</h2>
    
    <?php if(isset($error)): ?>
        <p style="color:red;"><?php echo $error; ?></p>
    <?php else: ?>
        <div class="form-container">
            <form action="verify.php" method="POST">
                <label>জন্মনিবন্ধন নম্বর (১৭ ডিজিট):</label>
                <input type="text" name="brn" required pattern="[0-9]{17}">
                
                <label>জন্মতারিখ (YYYY-MM-DD):</label>
                <input type="date" name="dob" required>
                
                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars($csrf); ?>">
                <input type="hidden" name="cap_text" value="<?php echo htmlspecialchars($cap_text); ?>">
                <input type="hidden" name="cookie_data" value="<?php echo $cookie_encoded; ?>">
                
                <label>ক্যাপচায় কী লেখা আছে লিখুন:</label><br>
                <img src="<?php echo $captcha_img; ?>" alt="Captcha" style="border:1px solid #000; margin: 10px 0; max-width:100%;">
                <input type="text" name="captcha_answer" required autocomplete="off">
                
                <button type="submit">যাচাই ও আবেদন করুন</button>
            </form>
        </div>
    <?php endif; ?>
</body>
</html>
