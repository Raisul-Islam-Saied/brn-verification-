<!DOCTYPE html>
<html lang="bn">
<head>
    <title>ভর্তি সিস্টেম - জন্মনিবন্ধন যাচাই</title>
</head>
<body>
    <h3>শিক্ষার্থীর জন্মনিবন্ধন যাচাই</h3>
    <form action="verify.php" method="POST">
        <label>জন্মনিবন্ধন নম্বর (১৭ ডিজিট):</label><br>
        <input type="text" name="brn" required><br><br>
        
        <label>জন্মতারিখ (YYYY-MM-DD):</label><br>
        <input type="date" name="dob" required><br><br>
        
        <!-- ক্যাপচা দেখানোর জায়গা -->
        <label>ক্যাপচা সমাধান করুন: <span id="math_captcha">লোডিং...</span></label><br>
        <input type="number" name="captcha_answer" required><br><br>
        
        <button type="submit">যাচাই ও আবেদন করুন</button>
    </form>

    <script>
        // পেজ লোড হলে ব্যাকএন্ড থেকে ক্যাপচা নিয়ে আসবে
        fetch('fetch.php')
            .then(res => res.json())
            .then(data => {
                document.getElementById('math_captcha').innerText = data.captcha;
            });
    </script>
</body>
</html>
