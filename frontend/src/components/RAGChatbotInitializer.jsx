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
          tenantId: userProfile.company || 'default',
          defaultOpen: false,
          startCollapsed: true,
          autoOpen: false
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
          tenantId: userProfile.company || 'default',
          defaultOpen: false,
          startCollapsed: true,
          autoOpen: false
        })
        
        // Ensure chatbot starts as icon-only (close if auto-opened)
        const forceIconOnly = () => {
          const botContainer = document.getElementById('edu-bot-container')
          if (!botContainer) return
          
          // Try multiple strategies to close the chatbot
          const strategies = [
            // Strategy 1: Find and click close button
            () => {
              const closeBtn = botContainer.querySelector('button[aria-label*="close" i], button[aria-label*="Close" i], [class*="close" i]')
              if (closeBtn) {
                closeBtn.click()
                return true
              }
            },
            // Strategy 2: Find toggle button and click if panel is open
            () => {
              const toggleBtn = botContainer.querySelector('button[class*="toggle" i], button[class*="launcher" i], button[class*="icon" i]')
              const chatPanel = botContainer.querySelector('[class*="chat" i][class*="open" i], [class*="panel" i][class*="open" i]')
              if (toggleBtn && chatPanel) {
                toggleBtn.click()
                return true
              }
            },
            // Strategy 3: Dispatch ESC key to close
            () => {
              const chatPanel = botContainer.querySelector('[class*="chat" i], [class*="panel" i]')
              if (chatPanel) {
                const style = window.getComputedStyle(chatPanel)
                if (style.display !== 'none' && style.visibility !== 'hidden') {
                  chatPanel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
                  return true
                }
              }
            }
          ]
          
          for (const strategy of strategies) {
            if (strategy()) break
          }
        }
        
        // Try to close immediately and retry a few times
        setTimeout(forceIconOnly, 100)
        setTimeout(forceIconOnly, 500)
        setTimeout(forceIconOnly, 1000)
      }
    }

    document.head.appendChild(script)
  }, [userProfile?.id])

  return null // side-effect only component
}

