/**
 * Hook for initializing RAG Chatbot Widget
 * Follows the integration guide for RAG chatbot embedding
 */

import { useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'

// Get RAG service URL from environment variable
const getRAGServiceURL = () => {
  // Check for environment variable (Vite uses import.meta.env)
  if (import.meta.env.VITE_RAG_SERVICE_URL) {
    return import.meta.env.VITE_RAG_SERVICE_URL
  }
  // Fallback to default
  return 'https://rag-service.educore.com'
}

/**
 * Hook to initialize RAG chatbot widget
 * @param {string} microservice - Microservice identifier ("ASSESSMENT" or "DEVLAB")
 *                                Note: Course Builder may need a different identifier
 *                                Check with RAG service team for Course Builder support
 */
export function useRAGChatbot(microservice = null) {
  const { userProfile, userRole } = useApp()
  const scriptLoadedRef = useRef(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    // Debug logging
    console.log('[RAG Chatbot] Hook triggered', { userProfile, userRole })
    
    // Only initialize if user is logged in (has profile)
    if (!userProfile || !userProfile.id) {
      console.log('[RAG Chatbot] User profile not available, skipping initialization')
      return
    }

    // For Course Builder, we might need a token
    // Since the current auth system uses role-based profiles, we'll use a placeholder token
    // In production, replace this with actual JWT token from your auth system
    const token = localStorage.getItem('token') || `mock-token-${userProfile.id}`

    // Determine microservice identifier
    // Note: The guide only mentions "ASSESSMENT" and "DEVLAB"
    // Course Builder might need a different identifier or might not be supported yet
    // Using a configurable approach via environment variable
    const serviceIdentifier = microservice || 
      import.meta.env.VITE_CHATBOT_MICROSERVICE || 
      'ASSESSMENT' // Changed to ASSESSMENT as default since COURSE_BUILDER might not be supported

    console.log('[RAG Chatbot] Configuration:', {
      serviceIdentifier,
      ragServiceURL: getRAGServiceURL(),
      userId: userProfile.id,
      hasToken: !!token
    })

    // Load script if not already loaded
    if (!window.EDUCORE_BOT_LOADED && !scriptLoadedRef.current) {
      console.log('[RAG Chatbot] Loading script...')
      const script = document.createElement('script')
      const ragServiceURL = getRAGServiceURL()
      script.src = `${ragServiceURL}/embed/bot.js`
      script.async = true
      script.onload = () => {
        console.log('[RAG Chatbot] Script loaded successfully')
        scriptLoadedRef.current = true
        initializeBot()
      }
      script.onerror = (error) => {
        console.error('[RAG Chatbot] Failed to load script:', error)
        console.error('[RAG Chatbot] Script URL:', `${ragServiceURL}/embed/bot.js`)
      }
      document.head.appendChild(script)
    } else if (window.EDUCORE_BOT_LOADED && !initializedRef.current) {
      // Script already loaded, just initialize
      console.log('[RAG Chatbot] Script already loaded, initializing...')
      initializeBot()
    } else if (initializedRef.current) {
      console.log('[RAG Chatbot] Already initialized, skipping')
    }

    function initializeBot() {
      if (initializedRef.current) {
        console.log('[RAG Chatbot] Already initialized, skipping')
        return // Already initialized
      }

      // Check if container exists, create if not
      let container = document.querySelector('#edu-bot-container')
      if (!container) {
        console.warn('[RAG Chatbot] Container not found, creating it...')
        container = document.createElement('div')
        container.id = 'edu-bot-container'
        document.body.appendChild(container)
        console.log('[RAG Chatbot] Container created')
      }

      if (!window.initializeEducoreBot) {
        console.log('[RAG Chatbot] initializeEducoreBot not available yet, retrying...')
        // Script not ready yet, retry (max 10 times = 1 second)
        let retryCount = 0
        const maxRetries = 10
        const retryInterval = setInterval(() => {
          retryCount++
          if (window.initializeEducoreBot) {
            clearInterval(retryInterval)
            initializeBot()
          } else if (retryCount >= maxRetries) {
            clearInterval(retryInterval)
            console.error('[RAG Chatbot] initializeEducoreBot not available after retries')
          }
        }, 100)
        return
      }

      try {
        console.log('[RAG Chatbot] Initializing with config:', {
          microservice: serviceIdentifier,
          userId: userProfile.id,
          tenantId: userProfile.company || 'default'
        })
        
        window.initializeEducoreBot({
          microservice: serviceIdentifier,
          userId: userProfile.id,
          token: token,
          tenantId: userProfile.company || 'default'
        })
        initializedRef.current = true
        console.log('[RAG Chatbot] ✅ Initialized successfully')
      } catch (error) {
        console.error('[RAG Chatbot] ❌ Error initializing:', error)
        console.error('[RAG Chatbot] Error details:', {
          message: error.message,
          stack: error.stack
        })
      }
    }

    // Cleanup on unmount
    return () => {
      if (window.destroyEducoreBot) {
        try {
          window.destroyEducoreBot()
          initializedRef.current = false
        } catch (error) {
          console.error('Error destroying RAG chatbot:', error)
        }
      }
    }
  }, [userProfile, userRole, microservice])
}

