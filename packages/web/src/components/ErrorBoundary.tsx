import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // intentionally silent — errors surface in React DevTools
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-6">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-500 text-xl font-bold">!</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
            <p className="mt-1 text-sm text-slate-500 max-w-sm">{this.state.error.message}</p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="text-sm px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
