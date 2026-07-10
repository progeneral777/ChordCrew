import { create } from 'zustand'
import {
  CollabClient,
  type ContentMessage,
  type UserInfo,
} from '../ws/collabClient'

export interface LockInfo {
  userId: string
  displayName: string
}

interface CollabState {
  status: 'disconnected' | 'connected'
  users: UserInfo[]
  /** sectionIndex → 持有者(含自己持有的) */
  locks: Record<number, LockInfo>
  /** 本視窗(session)持有的段落 */
  myLocks: Set<number>

  connect: (
    songId: string,
    myUserId: string,
    handlers: {
      onSectionUpdated: (sectionIndex: number, content: string, revision: number) => void
      onSync: (content: string, revision: number) => void
      onReconnected: () => void
    }
  ) => void
  disconnect: () => void
  lock: (sectionIndex: number) => void
  unlock: (sectionIndex: number) => void
  sendUpdate: (sectionIndex: number, content: string, baseRevision: number) => void
}

let client: CollabClient | null = null
let heartbeat: ReturnType<typeof setInterval> | null = null
let everConnected = false

export const useCollabStore = create<CollabState>((set, get) => ({
  status: 'disconnected',
  users: [],
  locks: {},
  myLocks: new Set(),

  connect: (songId, myUserId, handlers) => {
    get().disconnect()
    everConnected = false
    const token = localStorage.getItem('accessToken') ?? ''

    client = new CollabClient(songId, token, {
      onPresence: (msg) => set({ users: msg.users }),
      onLock: (msg) => {
        set((state) => {
          const locks = { ...state.locks }
          const myLocks = new Set(state.myLocks)
          if (msg.type === 'LOCKED') {
            locks[msg.sectionIndex] = { userId: msg.userId, displayName: msg.displayName }
            // 搶鎖失敗:廣播回來的持有者不是我 → 取消樂觀持有
            if (msg.userId !== myUserId) myLocks.delete(msg.sectionIndex)
          } else {
            delete locks[msg.sectionIndex]
            myLocks.delete(msg.sectionIndex)
          }
          return { locks, myLocks }
        })
      },
      onContent: (msg: ContentMessage) => {
        if (msg.type === 'SECTION_UPDATED') {
          // 自己 session 持鎖中的段落不套用(避免蓋掉輸入中的文字)
          if (!get().myLocks.has(msg.sectionIndex)) {
            handlers.onSectionUpdated(msg.sectionIndex, msg.content, msg.revision)
          } else {
            handlers.onSectionUpdated(-1, '', msg.revision) // 只更新 revision
          }
        } else if (msg.type === 'SYNC') {
          handlers.onSync(msg.content, msg.revision)
        }
      },
      onSync: (msg) => {
        if (msg.type === 'SYNC') handlers.onSync(msg.content, msg.revision)
      },
      onConnected: () => {
        set({ status: 'connected', locks: {}, myLocks: new Set() })
        if (everConnected) handlers.onReconnected() // 重連後由編輯器重抓最新全文
        everConnected = true
      },
      onDisconnected: () => set({ status: 'disconnected' }),
    })
    client.activate()

    // 每 20 秒對持有中的鎖 heartbeat 續期
    heartbeat = setInterval(() => {
      const { myLocks } = get()
      myLocks.forEach((idx) => client?.lock(idx))
    }, 20_000)
  },

  disconnect: () => {
    if (heartbeat) {
      clearInterval(heartbeat)
      heartbeat = null
    }
    client?.deactivate()
    client = null
    set({ status: 'disconnected', users: [], locks: {}, myLocks: new Set() })
  },

  lock: (sectionIndex) => {
    client?.lock(sectionIndex)
    set((state) => ({ myLocks: new Set(state.myLocks).add(sectionIndex) }))
  },

  unlock: (sectionIndex) => {
    client?.unlock(sectionIndex)
    set((state) => {
      const myLocks = new Set(state.myLocks)
      myLocks.delete(sectionIndex)
      return { myLocks }
    })
  },

  sendUpdate: (sectionIndex, content, baseRevision) => {
    client?.sendUpdate(sectionIndex, content, baseRevision)
  },
}))
