/**
 * Component to initialize RAG Chatbot Widget
 * This component handles the initialization of the RAG chatbot
 * and should be included in the main App component
 */

import { useRAGChatbot } from '../hooks/useRAGChatbot'

/**
 * RAG Chatbot Initializer Component
 * Initializes the RAG chatbot widget when user is logged in
 * 
 * Note: The microservice identifier may need to be configured.
 * The guide mentions "ASSESSMENT" and "DEVLAB" as supported.
 * Course Builder might need a different identifier or may not be
 * directly supported yet. Check with RAG service team.
 */
export default function RAGChatbotInitializer() {
  // Initialize chatbot
  // You can pass a specific microservice identifier if needed
  // For now, using null to let it use the default from env var
  useRAGChatbot(null)

  // This component doesn't render anything
  // It just initializes the chatbot widget
  return null
}

