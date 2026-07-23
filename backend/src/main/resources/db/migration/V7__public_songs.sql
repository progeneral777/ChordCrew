-- 公開歌曲:owner 可把歌曲設為 public,讓任何登入者檢視(唯讀)。
ALTER TABLE songs ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- 加速「探索」頁的公開歌曲列表(只索引仍存在的公開歌)。
CREATE INDEX idx_songs_public ON songs(is_public) WHERE is_public = true AND deleted_at IS NULL;
