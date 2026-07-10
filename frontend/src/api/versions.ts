import client from './client'
import type { SongDetail } from './songs'

export interface VersionAuthor {
  userId: string
  displayName: string
}

export interface VersionSummary {
  id: string
  note: string | null
  createdBy: VersionAuthor
  createdAt: string
}

export interface VersionDetail extends VersionSummary {
  content: string
}

export const versionsApi = {
  list: (songId: string) =>
    client.get<{ data: { versions: VersionSummary[] } }>(`/songs/${songId}/versions`),
  create: (songId: string, note?: string) =>
    client.post<{ data: { version: VersionSummary } }>(`/songs/${songId}/versions`, { note }),
  get: (songId: string, versionId: string) =>
    client.get<{ data: { version: VersionDetail } }>(`/songs/${songId}/versions/${versionId}`),
  restore: (songId: string, versionId: string) =>
    client.post<{ data: { song: SongDetail } }>(`/songs/${songId}/versions/${versionId}/restore`),
}
