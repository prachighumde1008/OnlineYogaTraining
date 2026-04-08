<?php
include 'db.php';

$name = $_POST['name'];
$email = $_POST['email'];
$password = $_POST['password'];

/* hash password */
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

/* check if email already exists */
$check = $db->prepare("SELECT * FROM users WHERE email = :email");
$check->bindValue(':email', $email, SQLITE3_TEXT);
$result = $check->execute();

if ($result->fetchArray()) {
    echo "Email already registered! <a href='register.html'>Go Back</a>";
    exit();
}

/* insert user */
$stmt = $db->prepare("INSERT INTO users (name, email, password) VALUES (:name, :email, :password)");
$stmt->bindValue(':name', $name, SQLITE3_TEXT);
$stmt->bindValue(':email', $email, SQLITE3_TEXT);
$stmt->bindValue(':password', $hashedPassword, SQLITE3_TEXT);

if ($stmt->execute()) {
    echo "Registration successful! <a href='login.html'>Login Now</a>";
} else {
    echo "Registration failed!";
}
?>