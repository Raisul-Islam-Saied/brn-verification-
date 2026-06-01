<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <title>ভর্তি সিস্টেম - জন্মনিবন্ধন যাচাই</title>
</head>
<body>
    <h3>শিক্ষার্থীর জন্মনিবন্ধন যাচাই</h3>
    <form action="verify.php" method="POST">
        <label>জন্মনিবন্ধন নম্বর (১৭ ডিজিট):</label><br>
        <input type="text" name="brn" required><br><br>
        
        <label>জন্মতারিখ (YYYY-MM-DD):</label><br>
        <input type="date" name="dob" required><br><br>
        
        <input type="hidden" id="csrf" name="csrf">
        <input type="hidden" id="cap_text" name="cap_text">
        
        <label>ক্যাপচায় কী লেখা আছে লিখুন:</label><br>
        <img id="captcha_img" src="" alt="ক্যাপচা লোড হচ্ছে..." style="margin-bottom: 10px; border: 1px solid #ccc;"><br>
        <input type="text" name="captcha_answer" required autocomplete="off"><br><br>
        
        <button type="submit">যাচাই ও আবেদন করুন</button>
    </form>

    <script>
        // পেজ লোড হলে ব্যাকএন্ড থেকে ক্যাপচার ছবি ও টোকেন আনবে
        fetch('fetch.php')
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    document.getElementById('captcha_img').src = data.image;
                    document.getElementById('csrf').value = data.csrf;
                    document.getElementById('cap_text').value = data.cap_text;
                } else {
                    alert('সার্ভার থেকে ক্যাপচা আনা সম্ভব হয়নি!');
                }
            });
    </script>
</body>
</html>
