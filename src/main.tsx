import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { preloadInitialPage } from './lib/routePages'
import './styles/global.css'
import './styles/brand.css'
// The prerendered homepage is visible before its lazy route executes.
// Keep its scoped overrides after the shared styles in the blocking entry CSS.
import './styles/homepage-compact.css'

// Keep the prerendered page visible until its own code is ready. Other routes stay lazy.
void preloadInitialPage(location.pathname).then(() => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
))
