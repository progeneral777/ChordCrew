import client from './client'
import type { Role } from './bands'

export interface SongSummary {
  id: string
  /** 已分享到的樂團(可多個;空陣列 = 個人歌曲,尚未分享) */
  bandIds: string[]
  title: string
  artist: string | null
  originalKey: string | null
  bpm: number | null
  timeSignature: string | null
  tags: string[] | null
  favorite: boolean
  updatedAt: string
}

export interface SongDetail extends SongSummary {
  ownerId: string
  content: string
  revision: number
  myRole: Role
}

export interface SongMetadataInput {
  title?: string
  artist?: string
  originalKey?: string
  bpm?: number | null
  timeSignature?: string
  tags?: string[]
}

export const songsApi = {
  list: (bandId: string, params: { query?: string; tag?: string; sort?: string } = {}) =>
    client.get<{ data: { songs: SongSummary[] } }>(`/bands/${bandId}/songs`, { params }),
  create: (bandId: string, input: SongMetadataInput & { title: string }) =>
    client.post<{ data: { song: SongDetail } }>(`/bands/${bandId}/songs`, input),
  // 我的歌曲庫(個人 + 已分享出去的都算我的)
  listMine: (params: { query?: string; tag?: string; sort?: string } = {}) =>
    client.get<{ data: { songs: SongSummary[] } }>(`/me/songs`, { params }),
  createPersonal: (input: SongMetadataInput & { title: string }) =>
    client.post<{ data: { song: SongDetail } }>(`/me/songs`, input),
  share: (id: string, bandId: string) =>
    client.post<{ data: { song: SongDetail } }>(`/songs/${id}/share`, { bandId }),
  unshare: (id: string, bandId: string) =>
    client.post<{ data: { song: SongDetail } }>(`/songs/${id}/unshare`, { bandId }),
  get: (id: string) => client.get<{ data: { song: SongDetail } }>(`/songs/${id}`),
  updateMetadata: (id: string, input: SongMetadataInput) =>
    client.patch<{ data: { song: SongDetail } }>(`/songs/${id}`, input),
  updateContent: (id: string, content: string, baseRevision: number) =>
    client.put<{ data: { revision: number } }>(`/songs/${id}/content`, { content, baseRevision }),
  transpose: (id: string, semitones: number) =>
    client.post<{ data: { song: SongDetail } }>(`/songs/${id}/transpose`, { semitones }),
  remove: (id: string) => client.delete(`/songs/${id}`),
  favorite: (id: string) => client.post(`/songs/${id}/favorite`),
  unfavorite: (id: string) => client.delete(`/songs/${id}/favorite`),
}
