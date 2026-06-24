import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ingestAccessTokenFromHash } from './auth/ingestAccessTokenFromHash.js'
import App from './App.jsx'
import './styles/index.css'

ingestAccessTokenFromHash()

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
