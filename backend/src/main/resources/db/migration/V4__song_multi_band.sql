-- 歌曲可分享到多個樂團:把 songs.band_id(單一)改為 song_bands 關聯表(多對多)。
CREATE TABLE song_bands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (song_id, band_id)
);

CREATE INDEX idx_song_bands_band ON song_bands(band_id);
CREATE INDEX idx_song_bands_song ON song_bands(song_id);

-- 既有的單一分享搬進關聯表
INSERT INTO song_bands (song_id, band_id)
SELECT id, band_id FROM songs WHERE band_id IS NOT NULL;

-- 移除舊的單一 band_id 欄位(相依索引/外鍵會一併移除)
ALTER TABLE songs DROP COLUMN band_id;
