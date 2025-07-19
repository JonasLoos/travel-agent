import React, { useState, useEffect, useRef } from 'react';
import { Send, Plane, Hotel, MapPin, Calendar, Users, DollarSign } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import TravelPlanForm from './components/TravelPlanForm';

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
  const [showPlanForm, setShowPlanForm] = useState(false);

  useEffect(() => {
    // Get existing session ID from localStorage or generate a new one
    const existingSessionId = localStorage.getItem('travelAgentSessionId');
    if (existingSessionId) {
      setSessionId(existingSessionId);
    } else {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem('travelAgentSessionId', newSessionId);
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

  const createTravelPlan = async (planData: any) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/plan-trip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(JSON.stringify(errorData));
      }

      const data = await response.json();
      
      const agentMessage: Message = {
        id: Date.now().toString(),
        text: data.plan,
        sender: 'agent',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, agentMessage]);
      setShowPlanForm(false);
    } catch (error: unknown) {
      console.error('Error creating travel plan:', error);
      
      let errorMessage: Message;
      
      try {
        const errorData = JSON.parse((error as Error).message);
        errorMessage = {
          id: Date.now().toString(),
          text: errorData.detail?.message || 'Sorry, I encountered an error while creating your travel plan. Please try again.',
          sender: 'agent',
          timestamp: new Date(),
          isError: true,
          errorDetails: errorData.detail,
        };
      } catch {
        // Handle network errors or other non-JSON errors
        const errorText = (error as Error).message || 'Unknown error occurred';
        let userFriendlyMessage = 'Sorry, I encountered an error while creating your travel plan. Please try again.';
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
          id: Date.now().toString(),
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
                <p className="text-xs text-gray-400 mt-1">Session: {sessionId.substring(0, 20)}...</p>
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
              <button
                onClick={() => setShowPlanForm(!showPlanForm)}
                className="btn-primary flex items-center space-x-2"
              >
                <Calendar className="h-4 w-4" />
                <span>Plan Trip</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <ChatInterface
              messages={messages}
              onSendMessage={sendMessage}
              isLoading={isLoading}
              onRetryMessage={retryMessage}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => sendMessage("I need help planning a trip to Paris for next month")}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="font-medium text-gray-900">Plan Paris Trip</p>
                      <p className="text-sm text-gray-600">Get recommendations for Paris</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => sendMessage("Find me the best hotels in New York City")}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Hotel className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="font-medium text-gray-900">Find Hotels</p>
                      <p className="text-sm text-gray-600">Search for accommodations</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => sendMessage("What's the weather like in Tokyo this week?")}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="font-medium text-gray-900">Check Weather</p>
                      <p className="text-sm text-gray-600">Get weather forecasts</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What I Can Help With</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Plane className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-700">Flight search and recommendations</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Hotel className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-700">Hotel recommendations</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-700">Activity planning</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-700">Weather information</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-700">Group travel planning</span>
                </div>
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-700">Budget optimization</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Travel Plan Form Modal */}
      {showPlanForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <TravelPlanForm
              onSubmit={createTravelPlan}
              onCancel={() => setShowPlanForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 