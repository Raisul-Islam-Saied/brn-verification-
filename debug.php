<?php
$url = "https://everify.bdris.gov.bd/";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

$response = curl_exec($ch);
curl_close($ch);

echo "<h3>সরকারি সার্ভার থেকে প্রাপ্ত HTML:</h3>";
echo "<textarea style='width:100%; height:500px;'>" . htmlspecialchars($response) . "</textarea>";
?>
