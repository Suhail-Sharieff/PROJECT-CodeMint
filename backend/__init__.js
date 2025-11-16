const init_query = `
-- ===============================
-- Schema
-- ===============================
CREATE SCHEMA IF NOT EXISTS codemint DEFAULT CHARACTER SET utf8mb4;
USE codemint;

-- ===============================
-- User Table
-- ===============================
CREATE TABLE IF NOT EXISTS user (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    phone VARCHAR(15) UNIQUE, 
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    refreshToken VARCHAR(500),
    socket_id VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Sessions table
-- ========================================
CREATE TABLE IF NOT EXISTS session (
    session_id VARCHAR(50) PRIMARY KEY,
    host_id INT NOT NULL, -- Renamed to match backend logic easier
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_ended BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (host_id) REFERENCES user(user_id) ON DELETE CASCADE
);

-- ========================================
-- Session Participant table
-- ========================================
CREATE TABLE IF NOT EXISTS session_participant (
    session_id VARCHAR(50),
    user_id INT,
    role ENUM('host', 'student', 'viewer') DEFAULT 'student', -- REQUIRED for your backend logic
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id, user_id),
    FOREIGN KEY (session_id) REFERENCES session(session_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
);

-- ========================================
-- Codes (Snapshots of user code)
-- ========================================
CREATE TABLE IF NOT EXISTS codes (
    session_id VARCHAR(50),
    user_id INT,
    code MEDIUMTEXT, -- VARCHAR(10000) is too small. MEDIUMTEXT holds ~16MB.
    code_lang VARCHAR(20) DEFAULT 'javascript',
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id, user_id),
    FOREIGN KEY (session_id) REFERENCES session(session_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
);

-- ========================================
-- Chat Messages (MISSING IN YOURS)
-- ========================================
CREATE TABLE IF NOT EXISTS messages (
    message_id INT PRIMARY KEY AUTO_INCREMENT,
    session_id VARCHAR(50),
    user_id INT,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES session(session_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
);
`;

export { init_query };