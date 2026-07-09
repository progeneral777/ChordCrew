import client from './client'

export type Role = 'OWNER' | 'EDITOR' | 'VIEWER'

export interface BandSummary {
  id: string
  name: string
  myRole: Role
  memberCount: number
}

export interface Member {
  userId: string
  email: string
  displayName: string
  role: Role
}

export interface BandDetail {
  id: string
  name: string
  ownerId: string
  myRole: Role
  members: Member[]
}

export interface InviteResult {
  inviteUrl: string
  token: string
  expiresAt: string
}

export const bandsApi = {
  list: () => client.get<{ data: { bands: BandSummary[] } }>('/bands'),
  create: (name: string) => client.post<{ data: { band: BandSummary } }>('/bands', { name }),
  detail: (id: string) => client.get<{ data: { band: BandDetail } }>(`/bands/${id}`),
  rename: (id: string, name: string) =>
    client.patch<{ data: { band: BandSummary } }>(`/bands/${id}`, { name }),
  remove: (id: string) => client.delete(`/bands/${id}`),
  createInvite: (id: string, role: Role) =>
    client.post<{ data: InviteResult }>(`/bands/${id}/invites`, { role }),
  acceptInvite: (token: string) =>
    client.post<{ data: { band: BandSummary } }>(`/invites/${token}/accept`),
  removeMember: (bandId: string, userId: string) =>
    client.delete(`/bands/${bandId}/members/${userId}`),
  changeRole: (bandId: string, userId: string, role: Role) =>
    client.patch<{ data: { member: Member } }>(`/bands/${bandId}/members/${userId}`, { role }),
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { error?: { message?: string } } } }).response
    return res?.data?.error?.message ?? fallback
  }
  return fallback
}
