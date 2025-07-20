import { useState, useEffect } from 'react';
import { Plane, Users } from 'lucide-react';
import ChatInterface from './components/ChatInterface';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  isError?: boolean;
  errorDetails?: {
    error: string;
    error_type: string;
    message: string;
    suggestion: string;
  };
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Get existing session ID from localStorage or generate a new one
    const existingSessionId = localStorage.getItem('travelAgentSessionId');
    if (existingSessionId) {
      setSessionId(existingSessionId);
      console.log('Session ID:', existingSessionId);
    } else {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem('travelAgentSessionId', newSessionId);
      console.log('Session ID:', newSessionId);
    }
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(JSON.stringify(errorData));
      }

      const data = await response.json();
      
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'agent',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, agentMessage]);
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      
      let errorMessage: Message;
      
      try {
        const errorData = JSON.parse((error as Error).message);
        errorMessage = {
          id: (Date.now() + 1).toString(),
          text: errorData.detail?.message || 'Sorry, I encountered an error. Please try again.',
          sender: 'agent',
          timestamp: new Date(),
          isError: true,
          errorDetails: errorData.detail,
        };
      } catch {
        // Handle network errors or other non-JSON errors
        const errorText = (error as Error).message || 'Unknown error occurred';
        let userFriendlyMessage = 'Sorry, I encountered an error. Please try again.';
        let errorType = 'UnknownError';
        let suggestion = 'Please check your internet connection and try again.';
        
        if (errorText.includes('Failed to fetch') || errorText.includes('NetworkError')) {
          userFriendlyMessage = 'Unable to connect to the travel agent service.';
          errorType = 'NetworkError';
          suggestion = 'Please check your internet connection and ensure the backend service is running.';
        } else if (errorText.includes('timeout')) {
          userFriendlyMessage = 'Request timed out. The service may be busy.';
          errorType = 'TimeoutError';
          suggestion = 'Please try again in a moment.';
        }
        
        errorMessage = {
          id: (Date.now() + 1).toString(),
          text: userFriendlyMessage,
          sender: 'agent',
          timestamp: new Date(),
          isError: true,
          errorDetails: {
            error: errorText,
            error_type: errorType,
            message: userFriendlyMessage,
            suggestion: suggestion,
          },
        };
      }
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    // Clear messages
    setMessages([]);
    
    // Generate new session ID
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    localStorage.setItem('travelAgentSessionId', newSessionId);
    console.log('New Session ID:', newSessionId);
  };

  const retryMessage = async (messageId: string) => {
    // Find the error message and the user message that preceded it
    const errorMessageIndex = messages.findIndex(msg => msg.id === messageId);
    if (errorMessageIndex > 0) {
      const userMessage = messages[errorMessageIndex - 1];
      if (userMessage.sender === 'user') {
        // Remove the error message
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        // Retry the user message
        await sendMessage(userMessage.text);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-600 p-2 rounded-lg">
                <Plane className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Advanced Travel Agent</h1>
                <p className="text-sm text-gray-600">AI-powered travel planning assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={startNewConversation}
                className="btn-secondary flex items-center space-x-2"
              >
                <Users className="h-4 w-4" />
                <span>New Chat</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <ChatInterface
            messages={messages}
            onSendMessage={sendMessage}
            isLoading={isLoading}
            onRetryMessage={retryMessage}
          />
        </div>
      </main>
    </div>
  );
}

export default App; 