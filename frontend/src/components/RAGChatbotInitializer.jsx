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
        
        // Aggressively force chatbot to icon-only state
        const forceIconOnly = () => {
          const botContainer = document.getElementById('edu-bot-container')
          if (!botContainer) return false
          
          let closed = false
          
          // Find all possible chat panel elements
          const chatPanels = [
            ...botContainer.querySelectorAll('[class*="chat" i]'),
            ...botContainer.querySelectorAll('[class*="panel" i]'),
            ...botContainer.querySelectorAll('[class*="widget" i]'),
            ...botContainer.querySelectorAll('iframe'),
            ...botContainer.querySelectorAll('> div:not([class*="button" i]):not([class*="icon" i]):not([class*="launcher" i])')
          ]
          
          // Find launcher/icon button
          const launchers = [
            ...botContainer.querySelectorAll('button[class*="launcher" i]'),
            ...botContainer.querySelectorAll('button[class*="toggle" i]'),
            ...botContainer.querySelectorAll('button[class*="icon" i]'),
            ...botContainer.querySelectorAll('[class*="button" i][class*="chat" i]'),
            ...botContainer.querySelectorAll('[role="button"][class*="chat" i]')
          ]
          
          // Strategy 1: Click close button
          const closeButtons = [
            ...botContainer.querySelectorAll('button[aria-label*="close" i]'),
            ...botContainer.querySelectorAll('button[aria-label*="Close" i]'),
            ...botContainer.querySelectorAll('[class*="close" i]'),
            ...botContainer.querySelectorAll('[data-action*="close" i]')
          ]
          
          for (const btn of closeButtons) {
            if (btn.offsetParent !== null) { // Button is visible
              btn.click()
              closed = true
              break
            }
          }
          
          // Strategy 2: Click launcher/toggle if panel is open
          if (!closed) {
            for (const panel of chatPanels) {
              const style = window.getComputedStyle(panel)
              const isVisible = style.display !== 'none' && 
                              style.visibility !== 'hidden' && 
                              style.opacity !== '0' &&
                              panel.offsetHeight > 0 &&
                              panel.offsetWidth > 0
              
              if (isVisible && launchers.length > 0) {
                // Panel is open, try to click launcher to close
                launchers[0].click()
                closed = true
                break
              }
            }
          }
          
          // Strategy 3: Hide panels directly via style manipulation
          if (!closed) {
            for (const panel of chatPanels) {
              const style = window.getComputedStyle(panel)
              const isVisible = style.display !== 'none' && 
                              style.visibility !== 'hidden' && 
                              panel.offsetHeight > 50 // Large enough to be a chat panel
              
              if (isVisible) {
                // Hide the panel
                panel.style.display = 'none'
                panel.setAttribute('data-forced-closed', 'true')
                closed = true
              }
            }
          }
          
          // Strategy 4: Ensure launcher is visible
          for (const launcher of launchers) {
            launcher.style.display = 'block'
            launcher.style.visibility = 'visible'
            launcher.style.opacity = '1'
          }
          
          return closed
        }
        
        // Continuous monitoring with MutationObserver
        const startMonitoring = () => {
          const botContainer = document.getElementById('edu-bot-container')
          if (!botContainer) return
          
          // Create observer to watch for DOM changes
          const observer = new MutationObserver(() => {
            forceIconOnly()
          })
          
          // Observe all changes in the container
          observer.observe(botContainer, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'data-state']
          })
          
          // Also try to close periodically
          const interval = setInterval(() => {
            if (forceIconOnly()) {
              // If we successfully closed, keep monitoring
            }
          }, 500)
          
          // Clean up after 10 seconds (chatbot should be stable by then)
          setTimeout(() => {
            observer.disconnect()
            clearInterval(interval)
          }, 10000)
        }
        
        // Try to close immediately and start monitoring
        setTimeout(() => {
          forceIconOnly()
          startMonitoring()
        }, 100)
        
        setTimeout(forceIconOnly, 300)
        setTimeout(forceIconOnly, 600)
        setTimeout(forceIconOnly, 1000)
        setTimeout(forceIconOnly, 2000)
      }
    }

    document.head.appendChild(script)
  }, [userProfile?.id])

  return null // side-effect only component
}

