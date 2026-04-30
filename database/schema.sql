-- ============================================================
--  Deepak Portfolio  –  MySQL Schema
--  Database: u367980163_dmandal1
--  Run this once via phpMyAdmin or mysql CLI on Hostinger
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── Admin users ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Blogs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blogs (
    id               VARCHAR(36)   PRIMARY KEY,
    title            VARCHAR(500)  NOT NULL DEFAULT '',
    subtitle         VARCHAR(500)            DEFAULT '',
    slug             VARCHAR(500)  UNIQUE,
    content          LONGTEXT,
    excerpt          TEXT                   DEFAULT '',
    cover_image      TEXT                   DEFAULT '',
    image_alt        VARCHAR(500)           DEFAULT '',
    published        TINYINT(1)             DEFAULT 0,
    featured         TINYINT(1)             DEFAULT 0,
    allow_comments   TINYINT(1)             DEFAULT 1,
    pending_review   TINYINT(1)             DEFAULT 0,
    category_id      VARCHAR(36)            DEFAULT NULL,
    category_ids     JSON                   DEFAULT NULL,
    tags             TEXT                   DEFAULT '',
    tag_ids          JSON                   DEFAULT NULL,
    meta_title       VARCHAR(500)           DEFAULT '',
    meta_description TEXT                   DEFAULT '',
    canonical_url    VARCHAR(500)           DEFAULT '',
    difficulty       VARCHAR(50)            DEFAULT 'intermediate',
    audience         TEXT                   DEFAULT '',
    prerequisites    TEXT                   DEFAULT '',
    repo_url         VARCHAR(500)           DEFAULT '',
    demo_url         VARCHAR(500)           DEFAULT '',
    series           VARCHAR(255)           DEFAULT '',
    views            INT                    DEFAULT 0,
    comments_count   INT                    DEFAULT 0,
    last_commented_at TIMESTAMP             NULL,
    scheduled_at     TIMESTAMP              NULL,
    created_at       TIMESTAMP              DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_published (published),
    INDEX idx_slug      (slug(100)),
    INDEX idx_created   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Comments ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
    id              VARCHAR(36)  PRIMARY KEY,
    blog_id         VARCHAR(36)  NOT NULL,
    name            VARCHAR(80)  NOT NULL,
    message         TEXT         NOT NULL,
    parent_id       VARCHAR(36)  DEFAULT NULL,
    reply_to_name   VARCHAR(80)  DEFAULT NULL,
    is_author_reply TINYINT(1)   DEFAULT 0,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_blog_id (blog_id),
    CONSTRAINT fk_comments_blog FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Categories ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id          VARCHAR(36)  PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    parent_id   VARCHAR(36)  DEFAULT NULL,
    description TEXT         DEFAULT '',
    post_count  INT          DEFAULT 0,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Tags ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
    id         VARCHAR(36)  PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    slug       VARCHAR(255) NOT NULL UNIQUE,
    post_count INT          DEFAULT 0,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Admin settings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_settings (
    id           INT PRIMARY KEY DEFAULT 1,
    settings_json LONGTEXT,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Author followers ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS author_followers (
    client_id   VARCHAR(255) PRIMARY KEY,
    following   TINYINT(1)   DEFAULT 1,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    device_info JSON         DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Author ratings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS author_ratings (
    client_id   VARCHAR(255) PRIMARY KEY,
    value       TINYINT      NOT NULL,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    device_info JSON         DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Portfolio: single-doc sections (JSON blobs) ───────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_sections (
    section_name VARCHAR(100) PRIMARY KEY,
    data_json    LONGTEXT,
    updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Portfolio: ordered collection items ──────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_items (
    id              VARCHAR(36)  PRIMARY KEY,
    collection_name VARCHAR(100) NOT NULL,
    order_index     INT          DEFAULT 0,
    data_json       LONGTEXT,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_collection (collection_name),
    INDEX idx_order      (collection_name, order_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Media files ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_files (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    file_name    VARCHAR(500) NOT NULL,
    file_path    VARCHAR(500) NOT NULL,
    url          VARCHAR(500) NOT NULL,
    file_size    INT          DEFAULT 0,
    content_type VARCHAR(100) DEFAULT '',
    folder       VARCHAR(100) DEFAULT 'uploads',
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_folder (folder)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
