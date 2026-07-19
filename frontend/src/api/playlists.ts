import client from './client'

export interface PlaylistSummary {
  id: string
  name: string
  songCount: number
  updatedAt: string
}

export interface PlaylistSongItem {
  id: string
  title: string
  artist: string | null
  originalKey: string | null
  bpm: number | null
}

export interface PlaylistDetail {
  id: string
  name: string
  songs: PlaylistSongItem[]
  updatedAt: string
}

export const playlistsApi = {
  list: () => client.get<{ data: { playlists: PlaylistSummary[] } }>('/me/playlists'),
  create: (name: string) =>
    client.post<{ data: { playlist: PlaylistDetail } }>('/me/playlists', { name }),
  get: (id: string) => client.get<{ data: { playlist: PlaylistDetail } }>(`/me/playlists/${id}`),
  rename: (id: string, name: string) =>
    client.patch<{ data: { playlist: PlaylistDetail } }>(`/me/playlists/${id}`, { name }),
  remove: (id: string) => client.delete(`/me/playlists/${id}`),
  addSong: (id: string, songId: string) =>
    client.post<{ data: { playlist: PlaylistDetail } }>(`/me/playlists/${id}/songs`, { songId }),
  removeSong: (id: string, songId: string) =>
    client.delete<{ data: { playlist: PlaylistDetail } }>(`/me/playlists/${id}/songs/${songId}`),
  reorder: (id: string, songIds: string[]) =>
    client.put<{ data: { playlist: PlaylistDetail } }>(`/me/playlists/${id}/songs`, { songIds }),
}
