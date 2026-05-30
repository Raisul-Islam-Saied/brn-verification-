# অফিসিয়াল PHP-Apache ইমেজ ব্যবহার করা হচ্ছে
FROM php:8.2-apache

# প্রজেক্টের সব ফাইল সার্ভারের পাবলিক ডিরেক্টরিতে কপি করা হচ্ছে
COPY . /var/www/html/

# কুকি ফাইলে রাইট পারমিশন দেওয়া হচ্ছে (অত্যন্ত গুরুত্বপূর্ণ)
RUN touch /var/www/html/cookie.txt && chmod 777 /var/www/html/cookie.txt

# Render-এর ডায়নামিক পোর্ট সাপোর্ট করার জন্য Apache কনফিগারেশন আপডেট
RUN sed -i 's/80/${PORT}/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf
