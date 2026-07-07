-- schema.sql
CREATE DATABASE IF NOT EXISTS picnic_app;
USE picnic_app;

CREATE TABLE IF NOT EXISTS picnics (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    lat FLOAT NOT NULL,
    lon FLOAT NOT NULL,
    -- JSON array of amenity keys present at the spot (e.g. ["bbq","toilets"])
    amenities TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Migration for databases created before the amenities column existed:
-- ALTER TABLE picnics ADD COLUMN amenities TEXT NULL;

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
    quantity INT NOT NULL DEFAULT 1,
    status ENUM('needed', 'covered') NOT NULL DEFAULT 'needed',
    added_by VARCHAR(255),
    FOREIGN KEY (picnic_id) REFERENCES picnics(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS potluck_claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    participant_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    FOREIGN KEY (item_id) REFERENCES potluck_items(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS picnic_dates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    picnic_id VARCHAR(36) NOT NULL,
    date_text VARCHAR(255) NOT NULL,
    time_text VARCHAR(255) NOT NULL,
    added_by INT NOT NULL,
    FOREIGN KEY (picnic_id) REFERENCES picnics(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES participants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS picnic_date_votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date_id INT NOT NULL,
    participant_id INT NOT NULL,
    FOREIGN KEY (date_id) REFERENCES picnic_dates(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vote (date_id, participant_id)
);
