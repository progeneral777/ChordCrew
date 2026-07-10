// STOMP over SockJS 封裝:連線、指數退避重連、頻道訂閱(ARCHITECTURE 第 3/4 節)。
import { Client, type IMessage } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

export interface UserInfo {
  userId: string
  displayName: string
}

export type PresenceMessage = { type: 'PRESENCE'; users: UserInfo[] }
export type LockMessage =
  | { type: 'LOCKED'; sectionIndex: number; userId: string; displayName: string }
  | { type: 'UNLOCKED'; sectionIndex: number }
export type ContentMessage =
  | { type: 'SECTION_UPDATED'; sectionIndex: number; content: string; revision: number; userId: string }
  | { type: 'SYNC'; content: string; revision: number }

export interface CollabHandlers {
  onPresence: (msg: PresenceMessage) => void
  onLock: (msg: LockMessage) => void
  onContent: (msg: ContentMessage) => void
  onSync: (msg: ContentMessage) => void
  onConnected: () => void
  onDisconnected: () => void
}

const MAX_RECONNECT_DELAY = 30_000

export class CollabClient {
  private client: Client
  private reconnectDelay = 1000
  private songId: string

  constructor(songId: string, token: string, handlers: CollabHandlers) {
    this.songId = songId
    this.client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: this.reconnectDelay,
      onConnect: () => {
        this.reconnectDelay = 1000
        this.client.reconnectDelay = this.reconnectDelay

        const parse = (fn: (m: never) => void) => (message: IMessage) =>
          fn(JSON.parse(message.body) as never)

        this.client.subscribe(`/topic/songs/${songId}/presence`, parse(handlers.onPresence))
        this.client.subscribe(`/topic/songs/${songId}/locks`, parse(handlers.onLock))
        this.client.subscribe(`/topic/songs/${songId}/content`, parse(handlers.onContent))
        this.client.subscribe(`/user/queue/sync`, parse(handlers.onSync))

        this.client.publish({ destination: `/app/songs/${songId}/join`, body: '{}' })
        handlers.onConnected()
      },
      onWebSocketClose: () => {
        // 指數退避:1s → 2s → 4s … 最多 30s
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY)
        this.client.reconnectDelay = this.reconnectDelay
        handlers.onDisconnected()
      },
    })
  }

  activate() {
    this.client.activate()
  }

  deactivate() {
    void this.client.deactivate()
  }

  lock(sectionIndex: number) {
    this.publish('lock', { sectionIndex })
  }

  unlock(sectionIndex: number) {
    this.publish('unlock', { sectionIndex })
  }

  sendUpdate(sectionIndex: number, content: string, baseRevision: number) {
    this.publish('update', { sectionIndex, content, baseRevision })
  }

  private publish(action: string, body: unknown) {
    if (!this.client.connected) return
    this.client.publish({
      destination: `/app/songs/${this.songId}/${action}`,
      body: JSON.stringify(body),
    })
  }
}
