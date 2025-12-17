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
 * Force-correct chatbot widget position after injection
 * Fixes position:fixed being affected by app layout (overflow/transform)
 */
function forceCorrectWidgetPosition() {
  const container = document.getElementById('edu-bot-container')
  if (!container) {
    return false
  }

  // Find the actual widget element (iframe or root div)
  // The widget could be injected as:
  // 1. An iframe directly in container
  // 2. A div with specific classes
  // 3. A shadow DOM root
  
  let widgetElement = null
  
  // Try to find iframe first (most common)
  const iframe = container.querySelector('iframe')
  if (iframe) {
    widgetElement = iframe
  } else {
    // Try to find the root widget div (check for common patterns)
    const widgetDiv = container.querySelector('div[style*="position"]') || 
                      container.querySelector('div:first-child') ||
                      container.firstElementChild
    
    if (widgetDiv && widgetDiv !== container) {
      widgetElement = widgetDiv
    }
  }

  if (!widgetElement) {
    return false
  }

  // Force-correct position via inline styles (NOT CSS file)
  widgetElement.style.position = 'fixed'
  widgetElement.style.bottom = '16px'
  widgetElement.style.right = '16px'
  widgetElement.style.left = 'auto'
  widgetElement.style.top = 'auto'
  widgetElement.style.zIndex = '99999'
  widgetElement.style.maxHeight = '90vh'
  widgetElement.style.maxWidth = '420px'
  
  // Also ensure container doesn't interfere
  container.style.position = 'fixed'
  container.style.bottom = '16px'
  container.style.right = '16px'
  container.style.left = 'auto'
  container.style.top = 'auto'
  container.style.zIndex = '99999'
  container.style.pointerEvents = 'none' // Let children handle clicks
  
  console.log('[RAG Chatbot] Widget position corrected', { widgetElement: widgetElement.tagName })
  return true
}

/**
 * Wait for widget to appear and force-correct position
 * Uses MutationObserver + polling fallback
 */
function waitAndCorrectPosition() {
  let attempts = 0
  const maxAttempts = 50 // 5 seconds max (50 * 100ms)
  
  const checkAndFix = () => {
    attempts++
    
    if (forceCorrectWidgetPosition()) {
      console.log('[RAG Chatbot] Position corrected successfully')
      return true
    }
    
    if (attempts >= maxAttempts) {
      console.warn('[RAG Chatbot] Position correction timeout - widget may not have appeared')
      return false
    }
    
    return false
  }

  // Try immediately
  if (checkAndFix()) {
    return
  }

  // Use MutationObserver to watch for DOM changes
  const container = document.getElementById('edu-bot-container')
  if (container) {
    const observer = new MutationObserver(() => {
      if (checkAndFix()) {
        observer.disconnect()
      }
    })

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true
    })

    // Fallback: polling in case MutationObserver misses it
    const intervalId = setInterval(() => {
      if (checkAndFix()) {
        clearInterval(intervalId)
        observer.disconnect()
      } else if (attempts >= maxAttempts) {
        clearInterval(intervalId)
        observer.disconnect()
      }
    }, 100)

    // Cleanup after max attempts
    setTimeout(() => {
      observer.disconnect()
      clearInterval(intervalId)
    }, maxAttempts * 100)
  } else {
    // Container doesn't exist yet, poll for it
    const containerCheck = setInterval(() => {
      if (document.getElementById('edu-bot-container')) {
        clearInterval(containerCheck)
        waitAndCorrectPosition()
      }
    }, 100)
    
    setTimeout(() => clearInterval(containerCheck), 5000)
  }
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
          
          // After initialization succeeds, wait for widget and force-correct position
          console.log('[RAG Chatbot] Initialization called, waiting for widget to appear...')
          setTimeout(() => {
            waitAndCorrectPosition()
          }, 500) // Give widget time to start injecting
          
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


