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
        
        // Inspect available options in the function
        const initFn = window.initializeEducoreBot
        console.log('[RAG Chatbot] Function signature:', initFn.toString().substring(0, 200))
        
        // Attempt to use UI configuration options if they exist
        // NOTE: These options are NOT documented, testing if they exist
        const config = {
          microservice: MICROSERVICE_NAME,
          userId: userProfile.id,
          token,
          tenantId: userProfile.company || 'default'
        }
        
        // Try undocumented options (will be ignored if not supported)
        // These are guesses based on common embed widget patterns
        const possibleOptions = {
          defaultOpen: false,
          autoOpen: false,
          collapsed: true,
          startCollapsed: true,
          launcherOnly: true,
          position: 'bottom-right'
        }
        
        // Log what we're attempting
        console.log('[RAG Chatbot] Attempting config:', { ...config, ...possibleOptions })
        
        // Call with attempted options (will fail silently if not supported)
        try {
          initFn({ ...config, ...possibleOptions })
        } catch (error) {
          // If options cause error, fall back to basic config
          console.warn('[RAG Chatbot] Options not supported, using basic config:', error)
          initFn(config)
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


