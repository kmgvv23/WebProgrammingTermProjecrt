# 2025-2-2-Web_Project - Online Reading Study Club


## 전체적인 구조
/project
  app.js                ← 서버의 메인 엔트리
  /routes
      auth.js           ← 로그인/회원가입
      studies.js        ← 스터디 생성/수정/삭제/상세/검색
  /views
      studies.ejs       ← 스터디 목록
      studies-detail.ejs← 스터디 상세
      study-form.ejs    ← 생성/수정 폼
      login.ejs         ← 로그인 페이지
      mypage.ejs        ← 마이페이지
      partials/header.ejs
      partials/footer.ejs
  /public               ← CSS, 이미지, JS (정적 파일)
  db.js                 ← MySQL 연결 풀


## 모든 스터디 기능은 studies.js 에 구현 했습니다
GET /studies	스터디 목록(검색 포함)
GET /studies/new	스터디 만들기 폼
POST /studies/create	새 스터디 생성
GET /studies/:id	스터디 상세 페이지
GET /studies/:id/edit	수정 폼
POST /studies/:id/update	수정 처리
ALL /studies/:id/delete	삭제 처리
## 채팅 기능 구현했습니다 설치먼저
npm install socket.io

## 새로 추가된 DB입니다 . 그대로 복붙하면됩니다 먼저 users

CREATE TABLE users (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname      VARCHAR(100) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

스터디 DB

CREATE TABLE studies (
  id             BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title          VARCHAR(255) NOT NULL,
  description    TEXT         NOT NULL,
  max_members    INT          NOT NULL DEFAULT 10,
  day            VARCHAR(10)  NOT NULL,
  book_isbn      VARCHAR(32),
  book_title     VARCHAR(255),
  book_cover_url VARCHAR(1024),
  book_author    VARCHAR(255),
  creator_id     BIGINT       NOT NULL,
  club_id        BIGINT,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_studies_creator (creator_id),
  CONSTRAINT fk_studies_creator
    FOREIGN KEY (creator_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

스터디 멤버 DB

CREATE TABLE study_members (
  id        BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  study_id  BIGINT NOT NULL,
  user_id   BIGINT NOT NULL,
  role      ENUM('LEADER', 'MEMBER') DEFAULT 'MEMBER',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_study_members_study (study_id),
  KEY idx_study_members_user (user_id),
  CONSTRAINT fk_study_members_study
    FOREIGN KEY (study_id) REFERENCES studies(id),
  CONSTRAINT fk_study_members_user
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

스터디 게시판 댓글 DB

CREATE TABLE study_comments (
  id         BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  post_id    BIGINT NOT NULL,
  user_id    BIGINT NOT NULL,
  content    TEXT   NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_comments_post (post_id),
  KEY idx_comments_user (user_id),
  CONSTRAINT fk_comments_post
    FOREIGN KEY (post_id) REFERENCES study_posts(id),
  CONSTRAINT fk_comments_user
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

스터디 포스트 DB

CREATE TABLE study_posts (
  id         BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  study_id   BIGINT NOT NULL,
  user_id    BIGINT NOT NULL,
  title      VARCHAR(255) NOT NULL,
  content    TEXT         NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_posts_study (study_id),
  KEY idx_posts_user  (user_id),
  CONSTRAINT fk_posts_study
    FOREIGN KEY (study_id) REFERENCES studies(id),
  CONSTRAINT fk_posts_user
    FOREIGN KEY (user_id)  REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

스터디 채팅 DB

CREATE TABLE study_chat_messages (
  id         BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  study_id   BIGINT NOT NULL,
  user_id    BIGINT NOT NULL,
  message    TEXT   NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_chat_study (study_id),
  KEY idx_chat_user  (user_id),
  CONSTRAINT fk_chat_study
    FOREIGN KEY (study_id) REFERENCES studies(id),
  CONSTRAINT fk_chat_user
    FOREIGN KEY (user_id)  REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
