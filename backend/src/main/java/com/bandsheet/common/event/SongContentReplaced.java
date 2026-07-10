package com.bandsheet.common.event;

import java.util.UUID;

/** REST 途徑(PUT content / 永久移調 / 版本還原)改寫歌曲全文後發布,collab 模組據此廣播 SYNC。 */
public record SongContentReplaced(UUID songId, String content, int revision) {}
