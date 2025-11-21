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
    role ENUM('host', 'joinee', 'viewer') DEFAULT 'joinee', -- REQUIRED for your backend logic
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id, user_id),
    FOREIGN KEY (session_id) REFERENCES session(session_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
);

-- ========================================
-- Session_Codes (Snapshots of user code)
-- ========================================
CREATE TABLE IF NOT EXISTS session_codes (
    session_id VARCHAR(50),
    user_id INT,
    code MEDIUMTEXT, -- VARCHAR(10000) is too small. MEDIUMTEXT holds ~16MB.
    code_lang VARCHAR(50) DEFAULT 'javascript',
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

-- ========================================
-- Test
-- ========================================

CREATE TABLE IF NOT EXISTS test(
    test_id VARCHAR(50) PRIMARY KEY,
    host_id INT,
    title VARCHAR(100) DEFAULT 'Untitled Test',
    status ENUM('DRAFT', 'LIVE', 'ENDED') DEFAULT 'DRAFT',
    created_at DATETIME DEFAULT NOW(),
    duration INT DEFAULT 60, -- Duration in minutes
    start_time DATETIME, 
    FOREIGN KEY(host_id) REFERENCES user(user_id) ON DELETE CASCADE
);

-- ========================================
-- Question (Linked to Test)
-- ========================================
CREATE TABLE IF NOT EXISTS question(
    question_id INT PRIMARY KEY AUTO_INCREMENT,
    test_id VARCHAR(50),
    title VARCHAR(100),
    description TEXT,
    example TEXT,
    FOREIGN KEY(test_id) REFERENCES test(test_id) ON DELETE CASCADE
);

-- ========================================
-- Test Cases (With Hidden Flag)
-- ========================================
CREATE TABLE IF NOT EXISTS testcase(
    case_id INT PRIMARY KEY AUTO_INCREMENT,
    question_id INT,
    stdin TEXT,
    expected_output TEXT,
    is_hidden BOOLEAN DEFAULT FALSE,
    FOREIGN KEY(question_id) REFERENCES question(question_id) ON DELETE CASCADE
);

-- ========================================
-- Test Participant (Joinees)
-- ========================================
CREATE TABLE IF NOT EXISTS test_participant (
    test_id VARCHAR(50),
    user_id INT,
    role ENUM('host', 'joinee') DEFAULT 'joinee',
    status ENUM('active', 'finished') DEFAULT 'active', -- NEW COLUMN
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    score INT DEFAULT 0,
    PRIMARY KEY (test_id, user_id),
    FOREIGN KEY (test_id) REFERENCES test(test_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
);


-- ========================================
-- Test Submissions (Persist Code State)
-- ========================================
CREATE TABLE IF NOT EXISTS test_submissions (
    test_id VARCHAR(50),
    question_id INT,
    user_id INT,
    code MEDIUMTEXT,
    language VARCHAR(50) DEFAULT 'javascript',
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (test_id, question_id, user_id),
    FOREIGN KEY (test_id) REFERENCES test(test_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES question(question_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
);

`;

export { init_query };