import { useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'

/**
 * RAG Chatbot Initializer
 * Side-effect only component that loads and initializes the Educore RAG Chatbot
 * 
 * Requirements:
 * - Loads script from Railway backend
 * - Initializes ONLY after user authentication
 * - Uses exact container ID: edu-bot-container
 * - Uses exact script URL: https://rag-production-3a4c.up.railway.app/embed/bot.js
 * - Microservice name: COURSE_BUILDER
 */
export default function RAGChatbotInitializer() {
  const { userProfile } = useApp()

  useEffect(() => {
    // Only initialize after user is authenticated
    if (!userProfile?.id) {
      return
    }

    // Get token from localStorage (standard auth pattern)
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null

    // If no token, use a default token for development
    // In production, this should come from actual authentication
    const authToken = token || 'dev-demo-token'

    // Prevent double loading
    if (window.EDUCORE_BOT_LOADED) {
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: 'COURSE_BUILDER',
          userId: userProfile.id,
          token: authToken,
          tenantId: userProfile.company || 'default'
        })
      }
      return
    }

    const script = document.createElement('script')
    script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js'
    script.async = true

    script.onload = () => {
      window.EDUCORE_BOT_LOADED = true
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: 'COURSE_BUILDER',
          userId: userProfile.id,
          token: authToken,
          tenantId: userProfile.company || 'default'
        })
      }
    }

    document.head.appendChild(script)
  }, [userProfile?.id])

  return null // side-effect only component
}

