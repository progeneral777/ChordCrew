import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 gap-4">
          <h1 className="text-xl font-bold text-slate-900">發生未預期的錯誤</h1>
          <p className="text-sm text-slate-500">請重新整理頁面;若持續發生請聯絡管理員。</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            重新整理
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
