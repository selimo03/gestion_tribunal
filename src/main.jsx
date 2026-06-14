import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyLanguageDirection } from './lib/i18n'

// Applique la direction RTL/LTR au démarrage selon la langue choisie
applyLanguageDirection();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
