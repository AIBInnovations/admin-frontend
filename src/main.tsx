import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { handleChunkError, installChunkReload } from './lib/chunkReload'

// After a deploy, a page chunk of the old build may be gone: reload once.
installChunkReload()

createRoot(document.getElementById('root')!, {
  // The router's error boundary catches a failed lazy page; React then calls
  // this. Same logging as React's default, plus the one-time reload.
  onCaughtError(error) {
    handleChunkError(error)
    console.error(error)
  },
  onUncaughtError(error) {
    handleChunkError(error)
    if (typeof window.reportError === 'function') window.reportError(error)
    else console.error(error)
  },
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
