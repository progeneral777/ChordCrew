import client from './client'
import type { Role } from './bands'

export interface SongSummary {
  id: string
  title: string
  artist: string | null
  originalKey: string | null
  bpm: number | null
  timeSignature: string | null
  tags: string[] | null
  updatedAt: string
}

export interface SongDetail extends SongSummary {
  bandId: string
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
  get: (id: string) => client.get<{ data: { song: SongDetail } }>(`/songs/${id}`),
  updateMetadata: (id: string, input: SongMetadataInput) =>
    client.patch<{ data: { song: SongDetail } }>(`/songs/${id}`, input),
  updateContent: (id: string, content: string, baseRevision: number) =>
    client.put<{ data: { revision: number } }>(`/songs/${id}/content`, { content, baseRevision }),
  transpose: (id: string, semitones: number) =>
    client.post<{ data: { song: SongDetail } }>(`/songs/${id}/transpose`, { semitones }),
  remove: (id: string) => client.delete(`/songs/${id}`),
}
