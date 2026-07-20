-- Google 登入:OAuth 使用者沒有本地密碼,並以 google_sub 對應 Google 帳號。
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN google_sub VARCHAR(255);
ALTER TABLE users ADD CONSTRAINT uq_users_google_sub UNIQUE (google_sub);
