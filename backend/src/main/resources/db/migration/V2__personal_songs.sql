-- 個人歌曲 + 分享到樂團:
-- 歌曲改為「屬於建立者(owner)」,band_id 變成可為空(null = 只在個人歌曲庫)。
-- 分享 = 設定 band_id;取消分享 = band_id 設回 null。

ALTER TABLE songs ADD COLUMN owner_id UUID REFERENCES users(id);

-- 既有歌曲回填 owner:優先取所屬樂團的 OWNER,否則取任一成員。
UPDATE songs s SET owner_id = COALESCE(
    (SELECT bm.user_id FROM band_members bm
       WHERE bm.band_id = s.band_id AND bm.role = 'OWNER'
       ORDER BY bm.created_at LIMIT 1),
    (SELECT bm.user_id FROM band_members bm
       WHERE bm.band_id = s.band_id
       ORDER BY bm.created_at LIMIT 1)
);

ALTER TABLE songs ALTER COLUMN owner_id SET NOT NULL;

-- band_id 可為空(個人歌曲)。
ALTER TABLE songs ALTER COLUMN band_id DROP NOT NULL;

-- 刪除樂團時不應刪掉建立者的歌曲,只解除分享(band_id 設 null)。
ALTER TABLE songs DROP CONSTRAINT songs_band_id_fkey;
ALTER TABLE songs ADD CONSTRAINT songs_band_id_fkey
    FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE SET NULL;

CREATE INDEX idx_songs_owner_updated ON songs(owner_id, updated_at DESC);
