import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { useDesktop } from './lib/useDesktop'
import { IdleTimerProvider } from './components/IdleTimer'
import './index.css'
import App from './App.jsx'

function Root() {
  const isDesktop = useDesktop()
  return (
    <div id="app-root" className={isDesktop ? 'desktop-mode' : ''}>
      <BrowserRouter>
        <IdleTimerProvider>
          <App />
        </IdleTimerProvider>
      </BrowserRouter>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
