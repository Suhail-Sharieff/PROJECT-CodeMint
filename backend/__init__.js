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
    phone VARCHAR(11) NOT NULL UNIQUE,
    email varchar(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    refreshToken VARCHAR(255)
);


`;

export { init_query };