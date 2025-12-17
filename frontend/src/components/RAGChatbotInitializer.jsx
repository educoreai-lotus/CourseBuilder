// Minimal RAG Chatbot initializer for React microservice (Course Builder)
// Closely follows:
// - docs/WHAT_MICROSERVICES_NEED_TO_DO.md (React section)
// - docs/FOR_MICROSERVICE_DEVELOPERS.md (React examples)

import { useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'

// Script URL from docs (Railway backend)
const RAG_SCRIPT_URL = 'https://rag-production-3a4c.up.railway.app/embed/bot.js'
// Microservice name for Course Builder from docs
const MICROSERVICE_NAME = 'COURSE_BUILDER'

/**
 * Force chatbot container to viewport by moving it under document.body
 * Fixes position:fixed being broken by layout ancestors (transform/overflow)
 * This is a DOM-level fix, not CSS or React
 */
function forceBotToViewport() {
  const container = document.getElementById('edu-bot-container')
  if (!container) return false

  // Move container directly under <body> to escape layout constraints
  if (container.parentElement !== document.body) {
    document.body.appendChild(container)
  }

  // Force true viewport anchoring
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    top: 'auto',
    left: 'auto',
    zIndex: '2147483647',
    pointerEvents: 'auto'
  })

  return true
}

export default function RAGChatbotInitializer() {
  const { userProfile } = useApp()

  useEffect(() => {
    console.log('[RAG Chatbot] Effect start', { userProfile })

    // Must run in the browser and have a user profile
    if (typeof window === 'undefined') {
      console.log('[RAG Chatbot] Skipping (not in browser)')
      return
    }
    if (!userProfile || !userProfile.id) {
      console.log('[RAG Chatbot] Skipping (no userProfile.id)')
      return
    }

    // Token: similar to getCurrentUser() pattern in the docs
    let token = window.localStorage ? window.localStorage.getItem('token') : null

    // For local/dev usage, fallback to a demo token so the widget is visible
    if (!token) {
      console.log('[RAG Chatbot] No token found in localStorage, using demo token for dev')
      token = 'dev-demo-token'
      if (window.localStorage) {
        window.localStorage.setItem('token', token)
      }
    }

    function initChatbot() {
      // Follows the docs: check initializeEducoreBot, retry if needed
      if (window.initializeEducoreBot) {
        console.log('[RAG Chatbot] Calling initializeEducoreBot', {
          microservice: MICROSERVICE_NAME,
          userId: userProfile.id
        })
        
        const config = {
          microservice: MICROSERVICE_NAME,
          userId: userProfile.id,
          token,
          tenantId: userProfile.company || 'default'
        }
        
        // Call initialization
        try {
          window.initializeEducoreBot(config)
          
          // After initialization succeeds, force container to viewport
          // Retry until the embed finishes injecting DOM
          console.log('[RAG Chatbot] Initialization called, forcing container to viewport...')
          let attempts = 0
          const interval = setInterval(() => {
            attempts++
            if (forceBotToViewport() || attempts > 20) {
              clearInterval(interval)
              if (attempts > 20) {
                console.warn('[RAG Chatbot] Viewport fix timeout - container may not exist')
              } else {
                console.log('[RAG Chatbot] Container moved to viewport successfully')
              }
            }
          }, 300)
          
        } catch (error) {
          console.error('[RAG Chatbot] Initialization failed:', error)
        }
      } else {
        console.log('[RAG Chatbot] initializeEducoreBot not ready yet, retrying in 100ms')
        setTimeout(initChatbot, 100)
      }
    }

    // Load script exactly as shown in the React examples in the docs
    if (!window.EDUCORE_BOT_LOADED) {
      console.log('[RAG Chatbot] Loading bot script:', RAG_SCRIPT_URL)
      const script = document.createElement('script')
      script.src = RAG_SCRIPT_URL
      script.async = true
      script.onload = () => {
        console.log('[RAG Chatbot] Script loaded, initializing bot')
        window.EDUCORE_BOT_LOADED = true
        initChatbot()
      }
      script.onerror = (err) => {
        console.error('[RAG Chatbot] Failed to load bot script', err)
      }
      document.head.appendChild(script)
    } else {
      // Script already loaded → just initialize
      console.log('[RAG Chatbot] Script already loaded, initializing bot')
      initChatbot()
    }
  }, [userProfile])

  // This component renders nothing; it only performs side‑effects
  return null
}


