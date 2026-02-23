import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ProjectionWindow from './components/ProjectionWindow'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("CRITICAL UI ERROR:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="crash-container">
          <h1 className="crash-title">Applicatie Crash Gedetecteerd</h1>
          <div className="crash-details">
            <strong>Error:</strong>
            <pre className="crash-error-text">{this.state.error?.toString()}</pre>
          </div>
          <p className="crash-help-text">
            Check de browser console (F12) voor volledige details.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="crash-reload-button"
            title="Applicatie verversen"
          >
            App Herladen
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

console.log('--- main.tsx: Booting root element ---')
const rootElement = document.getElementById('root')



// Check for projection mode via hash
const isProjection = window.location.hash.startsWith('#projection')

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        {isProjection ? <ProjectionWindow /> : <App />}
      </ErrorBoundary>
    </StrictMode>
  )
  console.log('--- main.tsx: Render initiated (Projection: ' + isProjection + ') ---')
} else {
  console.error('--- main.tsx: ROOT ELEMENT NOT FOUND ---')
}
