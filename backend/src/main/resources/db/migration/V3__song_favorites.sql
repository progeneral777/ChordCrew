-- 我的最愛:每個使用者可把看得到的歌曲加入最愛(個人層級,跨樂團)。
CREATE TABLE song_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, song_id)
);

CREATE INDEX idx_song_favorites_user ON song_favorites(user_id);
