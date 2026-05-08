CREATE DATABASE IF NOT EXISTS unibite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE unibite;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('cook','consumer','admin') NOT NULL DEFAULT 'consumer',
  credits INT NOT NULL DEFAULT 5,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cook_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  photo_url VARCHAR(500),
  total_portions INT NOT NULL,
  available_portions INT NOT NULL,
  pickup_location VARCHAR(500) NOT NULL,
  pickup_lat DECIMAL(10,8),
  pickup_lng DECIMAL(11,8),
  pickup_time VARCHAR(200) NOT NULL,
  allergens JSON,
  status ENUM('active','inactive','expired') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cook_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NOT NULL,
  consumer_id INT NOT NULL,
  status ENUM('pending','approved','rejected','picked_up','no_show','rating_expired') NOT NULL DEFAULT 'pending',
  picked_up_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (consumer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL UNIQUE,
  consumer_id INT NOT NULL,
  listing_id INT NOT NULL,
  score TINYINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  FOREIGN KEY (consumer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message VARCHAR(500) NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Admin user (password: admin123)
INSERT IGNORE INTO users (username, email, password_hash, role, credits)
VALUES ('admin', 'admin@unibite.gr', '$2b$10$mJhX3I9Jva2unt2MKHiVH.KiMbH.aUd691XKsd3y199FYQ2Yefi3a', 'admin', 0);
