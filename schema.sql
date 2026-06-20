-- CampusPulse Database Schema
CREATE DATABASE IF NOT EXISTS campuspulse;
USE campuspulse;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  year VARCHAR(10),
  role ENUM('student', 'admin') DEFAULT 'student',
  profile_image VARCHAR(255) DEFAULT NULL,
  reset_token VARCHAR(255) DEFAULT NULL,
  reset_expires DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Events Table
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  department VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  organizer VARCHAR(100) NOT NULL,
  venue VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  capacity INT NOT NULL,
  banner_image VARCHAR(255) DEFAULT NULL,
  color VARCHAR(50) DEFAULT '#a855f7',
  status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT 'approved',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Registrations Table
CREATE TABLE IF NOT EXISTS registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  attended TINYINT(1) DEFAULT 0,
  ticket_code VARCHAR(100) UNIQUE NOT NULL,
  UNIQUE KEY unique_user_event (user_id, event_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- 4. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Event Feedback Table
CREATE TABLE IF NOT EXISTS event_feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- 6. Bookmarks Table
CREATE TABLE IF NOT EXISTS bookmarks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_bookmark (user_id, event_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- 7. Event Comments Table
CREATE TABLE IF NOT EXISTS event_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed Data (Optional, password_hash for 'password' and 'admin123' respectively using bcrypt)
-- 'student@campus.edu' / 'password' -> $2a$10$wK1mNDqW2.51H2D8vP3VcuH2d3u.i4T/O8c/h5R8QjS27nL37m6bC
-- 'admin@campus.edu' / 'admin123' -> $2a$10$iMpxVvP1hM5wE15u3VvR9uW3BskZtG4.8uO6p2F67sH2.6iX52D3q
INSERT INTO users (name, email, password_hash, department, year, role) VALUES 
('Alex Johnson', 'student@campus.edu', '$2a$10$KT9ZHcFmtSQzKhOFPLyV8uDkZ4C.omZBjzYHO32LSQxXrQEm8H7YG', 'Computer Science', '2', 'student'),
('Dr. Sarah Admin', 'admin@campus.edu', '$2a$10$1GOF8Np97/JTjM3Uf6medOY1KxmSzQYclQDOudV8Tiw6YPstjXLAK', 'Administration', '4', 'admin')
ON DUPLICATE KEY UPDATE name=name;
