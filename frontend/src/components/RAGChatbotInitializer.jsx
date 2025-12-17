import { useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'

/**
 * RAG Chatbot Initializer
 * Minimal side-effect component that loads and initializes the Educore RAG Chatbot.
 * Follows official integration docs exactly - no custom logic, no UI control.
 */
export default function RAGChatbotInitializer() {
  const { userProfile } = useApp()

  useEffect(() => {
    // Must run in browser
    if (typeof window === 'undefined') {
      return
    }

    // Initialization must happen ONLY AFTER LOGIN and ONLY WHEN all are true:
    // - userProfile exists
    // - userProfile.id exists
    // - token exists (localStorage)
    if (!userProfile?.id) {
      return
    }

    const token = window.localStorage ? window.localStorage.getItem('token') : null
    if (!token) {
      return
    }

    // Load script if not already loaded
    if (!window.EDUCORE_BOT_LOADED) {
      const script = document.createElement('script')
      script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js'
      script.async = true

      script.onload = () => {
        if (window.initializeEducoreBot) {
          window.initializeEducoreBot({
            microservice: 'COURSE_BUILDER',
            userId: userProfile.id,
            token: token,
            tenantId: userProfile.company || 'default'
          })
        }
      }

      document.head.appendChild(script)
      window.EDUCORE_BOT_LOADED = true
    } else {
      // Script already loaded, initialize immediately
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: 'COURSE_BUILDER',
          userId: userProfile.id,
          token: token,
          tenantId: userProfile.company || 'default'
        })
      }
    }
  }, [userProfile])

  // This component renders nothing; it only performs side-effects
  return null
}

