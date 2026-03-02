-- schema.sql
CREATE DATABASE IF NOT EXISTS picnic_app;
USE picnic_app;

CREATE TABLE IF NOT EXISTS picnics (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    lat FLOAT NOT NULL,
    lon FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    picnic_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('organizer', 'guest') NOT NULL,
    avatar VARCHAR(10) DEFAULT '👤',
    FOREIGN KEY (picnic_id) REFERENCES picnics(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS potluck_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    picnic_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status ENUM('needed', 'covered') NOT NULL DEFAULT 'needed',
    added_by VARCHAR(255),
    claimed_by INT NULL,
    FOREIGN KEY (picnic_id) REFERENCES picnics(id) ON DELETE CASCADE,
    FOREIGN KEY (claimed_by) REFERENCES participants(id) ON DELETE SET NULL
);
