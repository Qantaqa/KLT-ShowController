import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ProjectionWindow from './components/ProjectionWindow'

/**
 * Catches unhandled JavaScript errors in the React component tree.
 * Prevents the entire application from going white by showing a recovery UI.
 */
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: any) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error }
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Log the error to the console for developers to inspect in production
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

/**
 * Application Entry Point
 * Orchestrates the React boot sequence and handles dual-routing for the Main Control UI
 * and the secondary Projection Windows.
 */
console.log('--- main.tsx: Booting root element ---')
const rootElement = document.getElementById('root')

/**
 * Route Detection:
 * The application uses a URL hash to differentiate between the control interface and projection windows.
 * The Electron main process spawns projection windows with 'index.html#projection' to trigger this.
 */
const isProjection = window.location.hash.startsWith('#projection')

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        {/* Simple hash-based router for Electron multi-window support */}
        {isProjection ? <ProjectionWindow /> : <App />}
      </ErrorBoundary>
    </StrictMode>
  )
  console.log('--- main.tsx: Render initiated (Projection: ' + isProjection + ') ---')
} else {
  console.error('--- main.tsx: ROOT ELEMENT NOT FOUND ---')
}
