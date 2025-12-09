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
    // Only initialize if user is logged in (has profile)
    if (!userProfile || !userProfile.id) {
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
      'COURSE_BUILDER' // Default, but may need to be "ASSESSMENT" or "DEVLAB" if Course Builder not supported

    // Load script if not already loaded
    if (!window.EDUCORE_BOT_LOADED && !scriptLoadedRef.current) {
      const script = document.createElement('script')
      const ragServiceURL = getRAGServiceURL()
      script.src = `${ragServiceURL}/embed/bot.js`
      script.async = true
      script.onload = () => {
        scriptLoadedRef.current = true
        initializeBot()
      }
      script.onerror = () => {
        console.error('Failed to load RAG chatbot script')
      }
      document.head.appendChild(script)
    } else if (window.EDUCORE_BOT_LOADED && !initializedRef.current) {
      // Script already loaded, just initialize
      initializeBot()
    }

    function initializeBot() {
      if (initializedRef.current) {
        return // Already initialized
      }

      if (!window.initializeEducoreBot) {
        // Script not ready yet, retry
        setTimeout(initializeBot, 100)
        return
      }

      try {
        window.initializeEducoreBot({
          microservice: serviceIdentifier,
          userId: userProfile.id,
          token: token,
          tenantId: userProfile.company || 'default'
        })
        initializedRef.current = true
        console.log('RAG Chatbot initialized successfully')
      } catch (error) {
        console.error('Error initializing RAG chatbot:', error)
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

