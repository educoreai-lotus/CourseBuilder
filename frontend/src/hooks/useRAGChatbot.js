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
    // Hard guard: prevent React re-initialization issues
    if (window.__EDUCORE_BOT_INITIALIZED__) {
      console.log('[RAG Chatbot] Already initialized — skipping')
      return
    }

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
          tenantId: userProfile.company || 'default',
          defaultOpen: false,        // MUST be false - start closed
          startCollapsed: true,      // MUST be true - show only launcher icon
          autoOpen: false            // Explicitly disable auto-open
        })
        
        // Force close the widget after initialization (external script may auto-open in CHAT mode)
        // Use multiple timeouts to catch auto-open at different stages
        const forceClose = () => {
          const container = document.querySelector('#edu-bot-container')
          if (!container) return
          
          // Method 1: Find and hide chat windows directly
          const chatWindows = container.querySelectorAll('iframe, [class*="bot-window"], [class*="chat-window"], [class*="widget"]:not([class*="launcher"]):not([class*="toggle"]):not(button)')
          chatWindows.forEach(window => {
            if (window && window.style) {
              const computedStyle = window.getComputedStyle ? window.getComputedStyle(window) : null
              const isVisible = computedStyle && computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden'
              
              if (isVisible || window.style.display === 'block' || window.style.display === 'flex') {
                window.style.setProperty('display', 'none', 'important')
                window.style.setProperty('visibility', 'hidden', 'important')
                window.style.setProperty('opacity', '0', 'important')
                console.log('[RAG Chatbot] 🔒 Closed chat window via CSS')
              }
            }
          })
          
          // Method 2: Try to find and click close/toggle button
          const closeButtons = container.querySelectorAll(
            'button[class*="close"], button[class*="toggle"], [role="button"][class*="close"], [role="button"][class*="toggle"], [aria-label*="close" i], [aria-label*="toggle" i]'
          )
          closeButtons.forEach(btn => {
            const isOpen = btn.getAttribute('aria-expanded') === 'true' || 
                          btn.classList.contains('open') || 
                          btn.getAttribute('data-open') === 'true'
            if (isOpen && btn !== container.querySelector('button:first-child, [role="button"]:first-child')) {
              // Don't click the launcher button itself
              try {
                btn.click()
                console.log('[RAG Chatbot] 🔒 Clicked close button')
              } catch (e) {
                console.warn('[RAG Chatbot] Could not click close button:', e)
              }
            }
          })
        }
        
        // Try to close at multiple intervals to catch auto-open
        setTimeout(forceClose, 300)  // First attempt
        setTimeout(forceClose, 800)  // Second attempt (after auto-open might have happened)
        setTimeout(forceClose, 1500) // Third attempt (final check)
        
        // Also monitor for auto-open and close it if it happens
        const observer = new MutationObserver(() => {
          const container = document.querySelector('#edu-bot-container')
          if (container) {
            const chatWindows = container.querySelectorAll('iframe, [class*="bot-window"], [class*="chat-window"]')
            chatWindows.forEach(window => {
              if (window && window.style) {
                const display = window.style.display || (window.getComputedStyle ? window.getComputedStyle(window).display : '')
                if (display === 'block' || display === 'flex') {
                  // Widget opened, close it
                  forceClose()
                }
              }
            })
          }
        })
        
        // Start observing after a short delay
        setTimeout(() => {
          const container = document.querySelector('#edu-bot-container')
          if (container) {
            observer.observe(container, { 
              childList: true, 
              subtree: true, 
              attributes: true, 
              attributeFilter: ['style', 'class', 'aria-expanded'] 
            })
            console.log('[RAG Chatbot] 👀 Started monitoring for auto-open')
          }
        }, 1000)
        
        initializedRef.current = true
        globalInitializedRef.current = true
        window.EDUCORE_BOT_INITIALIZED = true // Global flag for persistence
        window.__EDUCORE_BOT_INITIALIZED__ = true // Hard guard for React re-renders
        console.log('[RAG Chatbot] ✅ Initialized successfully (collapsed mode)')
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

