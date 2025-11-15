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
    email varchar(50) NOT NULL UNIQUE
);


`;

export { init_query };