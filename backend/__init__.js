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
    refreshToken VARCHAR(255),
    socket_id VARCHAR(50)
);
-- ========================================
-- Sessions table
-- ========================================
create table if not exists session (
session_id varchar(50) primary key ,
host_user_id int,
foreign key(host_user_id)references user(user_id) on delete cascade,
created_at datetime default now(),
is_ended bool default false
);
-- ========================================
-- Session Participant table
-- ========================================
create table if not exists session_participant(
session_id varchar(50),
user_id int,
foreign key(session_id) references session(session_id) on delete cascade,
foreign key(user_id) references user(user_id) on delete cascade,
primary key(session_id,user_id)
);

`;

export { init_query };