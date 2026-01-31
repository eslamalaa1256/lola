<?php
if($_SERVER["REQUEST_METHOD"] == "POST") {
    $fullname = htmlspecialchars($_POST['fullname']);
    $email = htmlspecialchars($_POST['email']);
    $message = htmlspecialchars($_POST['message']);

    // 1️⃣ إرسال البريد
    $to = "xcodegroup2025@gmail.com";
    $subject = "رسالة من نموذج التواصل";
    $headers = "From: $email\r\nReply-To: $email\r\nContent-type: text/plain; charset=UTF-8";
    mail($to, $subject, "الاسم: $fullname\nالبريد: $email\n\n$message", $headers);

    // 2️⃣ حفظ الرسالة في قاعدة البيانات
    $conn = new mysqli("localhost", "root", "", "lolamessages"); // عدل المستخدم وكلمة المرور
    if ($conn->connect_error) { die("Connection failed: " . $conn->connect_error); }

    $stmt = $conn->prepare("INSERT INTO messages (fullname, email, message) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $fullname, $email, $message);
    $stmt->execute();
    $stmt->close();
    $conn->close();
}
?>
