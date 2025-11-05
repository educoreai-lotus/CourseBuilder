import { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function ChatbotWidget() {
  const { theme } = useApp()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return
    
    const newMessage = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    }
    
    setMessages([...messages, newMessage])
    setInput('')
    
    // Simulate bot response
    setTimeout(() => {
      const botResponse = {
        id: Date.now() + 1,
        text: "I'm here to help! How can I assist you with Course Builder today?",
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botResponse])
    }, 1000)
  }

  return (
    <div className={`chatbot-widget ${isOpen ? 'visible' : ''}`}>
      {isOpen && (
        <div className="chatbot-panel" style={{
          position: 'fixed',
          bottom: '80px',
          right: 'var(--spacing-lg)',
          width: '350px',
          maxHeight: '500px',
          background: 'var(--bg-card)',
          border: '1px solid var(--bg-tertiary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1001
        }}>
          <div className="chatbot-header" style={{
            padding: 'var(--spacing-md)',
            borderBottom: '1px solid var(--bg-tertiary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Course Builder Assistant</h3>
            <button onClick={() => setIsOpen(false)} aria-label="Close chatbot">
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="chatbot-messages" style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--spacing-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-sm)'
          }}>
            {messages.length === 0 && (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 'var(--spacing-lg)' }}>
                <p>Hi! I'm your Course Builder assistant. How can I help you today?</p>
              </div>
            )}
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.sender === 'user' ? 'var(--gradient-primary)' : 'var(--bg-secondary)',
                  color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  maxWidth: '80%'
                }}
              >
                {msg.text}
              </div>
            ))}
          </div>
          
          <div className="chatbot-input" style={{
            padding: 'var(--spacing-md)',
            borderTop: '1px solid var(--bg-tertiary)',
            display: 'flex',
            gap: 'var(--spacing-sm)'
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything..."
              style={{ flex: 1 }}
            />
            <button
              onClick={handleSend}
              className="btn btn-primary"
              style={{ padding: 'var(--spacing-sm)' }}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="chatbot-toggle"
        aria-label="Open chatbot"
      >
        <div className="chatbot-avatar">
          <i className="fas fa-robot"></i>
        </div>
      </button>
    </div>
  )
}

