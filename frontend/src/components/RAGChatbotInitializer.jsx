import { useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'

/**
 * RAG Chatbot Initializer
 * Floating widget that appears on all pages
 * 
 * Requirements:
 * - Loads script from Railway backend
 * - Initializes ONLY after user authentication
 * - Uses exact container ID: edu-bot-container
 * - Uses exact script URL: https://rag-production-3a4c.up.railway.app/embed/bot.js
 * - Microservice name: COURSE_BUILDER
 * - Floating widget: position fixed, bottom-right corner
 */
export default function RAGChatbotInitializer() {
  const { userProfile } = useApp()

  useEffect(() => {
    /**
     * Get current authenticated user
     * Returns user data from AppContext and localStorage
     */
    function getCurrentUser() {
      if (!userProfile?.id) {
        return null
      }

      // Get token from localStorage (standard auth pattern)
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
      
      if (!token && !userProfile.id) {
        return null
      }

      return {
        userId: userProfile.id,
        token: token || 'dev-demo-token', // Fallback for development
        tenantId: userProfile.company || 'default'
      }
    }

    /**
     * Initialize chatbot
     * Retries until user is authenticated and script is loaded
     */
    function initChatbot() {
      const user = getCurrentUser()
      
      if (!user || !user.userId || !user.token) {
        // User not authenticated yet, retry after 500ms
        setTimeout(initChatbot, 500)
        return
      }
      
      // Check if script is already loaded
      if (window.EDUCORE_BOT_LOADED) {
        if (window.initializeEducoreBot) {
          console.log('✅ RAG Bot: Initializing...')
          window.initializeEducoreBot({
            microservice: 'COURSE_BUILDER',
            userId: user.userId,
            token: user.token,
            tenantId: user.tenantId
          })
          console.log('✅ RAG Bot: Initialized successfully!')
        }
        return
      }
      
      // Script not loaded yet, wait and retry
      if (!window.initializeEducoreBot) {
        setTimeout(initChatbot, 100)
        return
      }
      
      // Script loaded, initialize
      console.log('✅ RAG Bot: Initializing...')
      window.initializeEducoreBot({
        microservice: 'COURSE_BUILDER',
        userId: user.userId,
        token: user.token,
        tenantId: user.tenantId
      })
      console.log('✅ RAG Bot: Initialized successfully!')
    }

    /**
     * Load bot script if not already loaded
     */
    function loadBotScript() {
      if (window.EDUCORE_BOT_LOADED) {
        // Script already loaded, just initialize
        initChatbot()
        return
      }

      // Check if script is already in DOM
      const existingScript = document.querySelector('script[src="https://rag-production-3a4c.up.railway.app/embed/bot.js"]')
      if (existingScript) {
        // Script exists but not loaded yet, wait for it
        if (document.readyState === 'loading') {
          existingScript.addEventListener('load', initChatbot)
        } else {
          setTimeout(initChatbot, 100)
        }
        return
      }

      // Create and load script
      const script = document.createElement('script')
      script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js'
      script.async = true
      
      script.onload = () => {
        window.EDUCORE_BOT_LOADED = true
        initChatbot()
      }
      
      script.onerror = () => {
        console.error('❌ RAG Bot: Failed to load script')
        // Retry after 2 seconds
        setTimeout(loadBotScript, 2000)
      }
      
      document.head.appendChild(script)
    }

    // Start initialization when component mounts or user changes
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadBotScript)
    } else {
      loadBotScript()
    }
  }, [userProfile?.id])

  return null // side-effect only component
}

