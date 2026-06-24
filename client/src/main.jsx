import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { useDesktop } from './lib/useDesktop'
import './index.css'
import App from './App.jsx'

function Root() {
  const isDesktop = useDesktop()
  return (
    <div id="app-root" className={isDesktop ? 'desktop-mode' : ''}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
