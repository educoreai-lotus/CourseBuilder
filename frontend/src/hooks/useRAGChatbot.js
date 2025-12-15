/**
 * Hook for initializing Educore RAG Chatbot widget in CHAT MODE.
 * Follows the official microservice integration guides.
 */

import { useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'

// Fixed RAG backend script URL (per docs - Railway backend URL)
const RAG_SCRIPT_URL = 'https://rag-production-3a4c.up.railway.app/embed/bot.js'

/**
 * Initialize RAG chatbot widget for this microservice.
 * - Microservice is fixed to "COURSE_BUILDER"
 * - Initializes ONLY when user + token exist
 */
export function useRAGChatbot() {
  const { userProfile } = useApp()
  const scriptLoadedRef = useRef(false)
  const initializedRef = useRef(false)
  // Use a global flag to prevent multiple initializations across route changes
  const globalInitializedRef = useRef(false)

  useEffect(() => {
    // Debug logging
    console.log('[RAG Chatbot] Hook triggered', { userProfile })

    // Only initialize if user is "authenticated" (id + token)
    if (!userProfile || !userProfile.id) {
      console.log('[RAG Chatbot] User profile not available, skipping initialization')
      return
    }

    // Get token from existing storage (do NOT modify auth logic)
    const token = window.localStorage ? window.localStorage.getItem('token') : null
    if (!token) {
      console.log('[RAG Chatbot] Token not available, skipping initialization')
      return
    }

    // Fixed microservice identifier for this app
    const serviceIdentifier = 'COURSE_BUILDER'

    console.log('[RAG Chatbot] Configuration:', {
      serviceIdentifier,
      scriptUrl: RAG_SCRIPT_URL,
      userId: userProfile.id,
      hasToken: !!token
    })

    // Load script if not already loaded
    if (!window.EDUCORE_BOT_LOADED && !scriptLoadedRef.current) {
      console.log('[RAG Chatbot] Loading script...')
      const script = document.createElement('script')
      script.src = RAG_SCRIPT_URL
      script.async = true
      script.onload = () => {
        console.log('[RAG Chatbot] Script loaded successfully')
        scriptLoadedRef.current = true
        initializeBot()
      }
      script.onerror = (error) => {
        console.error('[RAG Chatbot] Failed to load script:', error)
        console.error('[RAG Chatbot] Script URL:', RAG_SCRIPT_URL)
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
      // Check global flag first - if bot is already initialized globally, don't reinitialize
      if (globalInitializedRef.current && window.EDUCORE_BOT_INITIALIZED) {
        console.log('[RAG Chatbot] Bot already initialized globally, skipping')
        initializedRef.current = true
        return
      }

      if (initializedRef.current) {
        console.log('[RAG Chatbot] Already initialized, skipping')
        return // Already initialized
      }

      // Check if container exists (must be added in global layout)
      let container = document.querySelector('#edu-bot-container')
      if (!container) {
        console.error('[RAG Chatbot] Container #edu-bot-container not found, skipping initialization')
        // Retry after a short delay in case container is being created
        setTimeout(() => {
          container = document.querySelector('#edu-bot-container')
          if (container) {
            initializeBot()
          }
        }, 100)
        return
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
        globalInitializedRef.current = true
        window.EDUCORE_BOT_INITIALIZED = true // Global flag for persistence
        console.log('[RAG Chatbot] ✅ Initialized successfully')
      } catch (error) {
        console.error('[RAG Chatbot] ❌ Error initializing:', error)
        console.error('[RAG Chatbot] Error details:', {
          message: error.message,
          stack: error.stack
        })
      }
    }

    // NO cleanup on unmount - keep bot alive across route changes
    // Only cleanup when user logs out (handled by userProfile dependency)
    return () => {
      // Don't destroy the bot on route changes
      // The bot should persist across all pages
      console.log('[RAG Chatbot] Component unmounting, but keeping bot alive')
    }
  }, [userProfile])
}

