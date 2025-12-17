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
    // Must run in the browser and have a user profile
    if (typeof window === 'undefined') return
    if (!userProfile || !userProfile.id) return

    // Token: similar to getCurrentUser() pattern in the docs
    const token = window.localStorage ? window.localStorage.getItem('token') : null
    if (!token) return

    function initChatbot() {
      // Follows the docs: check initializeEducoreBot, retry if needed
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: MICROSERVICE_NAME,
          userId: userProfile.id,
          token,
          tenantId: userProfile.company || 'default'
        })
      } else {
        setTimeout(initChatbot, 100)
      }
    }

    // Load script exactly as shown in the React examples in the docs
    if (!window.EDUCORE_BOT_LOADED) {
      const script = document.createElement('script')
      script.src = RAG_SCRIPT_URL
      script.async = true
      script.onload = () => {
        window.EDUCORE_BOT_LOADED = true
        initChatbot()
      }
      document.head.appendChild(script)
    } else {
      // Script already loaded → just initialize
      initChatbot()
    }
  }, [userProfile])

  // This component renders nothing; it only performs side‑effects
  return null
}


