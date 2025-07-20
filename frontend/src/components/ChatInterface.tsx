import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, RefreshCw, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useVoice } from '../hooks/useVoice';

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

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onRetryMessage?: (messageId: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading, onRetryMessage }) => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [wasLoading, setWasLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  
  const {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    transcript,
    error: voiceError
  } = useVoice();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Focus input when loading changes from true to false (agent finished responding)
    if (wasLoading && !isLoading) {
      inputRef.current?.focus();
    }
    setWasLoading(isLoading);
  }, [isLoading, wasLoading]);

  // Update input when transcript changes
  useEffect(() => {
    if (transcript) {
      setInputMessage(transcript);
    }
  }, [transcript]);

  // Auto-speak agent messages when enabled
  useEffect(() => {
    if (autoSpeak && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'agent' && !lastMessage.isError && !isSpeaking) {
        speak(lastMessage.text);
      }
    }
  }, [messages, autoSpeak, speak, isSpeaking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !isLoading) {
      onSendMessage(inputMessage);
      setInputMessage('');
      if (isListening) {
        stopListening();
      }
    }
  };

  const handleVoiceInput = async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  const handleSpeakLastMessage = () => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'agent' && !lastMessage.isError) {
        speak(lastMessage.text);
      }
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="card h-[600px] flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Travel Assistant</h2>
            <p className="text-sm text-gray-600">Ask me anything about travel planning!</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={`p-2 rounded-lg transition-colors ${
                autoSpeak 
                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={autoSpeak ? 'Disable auto-speak' : 'Enable auto-speak'}
            >
              {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Voice Error Display */}
      {voiceError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{voiceError}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start Planning Your Trip</h3>
            <p className="text-gray-600">Ask me about destinations, flights, hotels, activities, or anything travel-related!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`message-bubble max-w-xs md:max-w-md lg:max-w-lg ${
                  message.sender === 'user' ? 'user-message' : 'agent-message'
                } ${message.isError ? 'border-red-300 bg-red-50' : ''}`}
              >
                <div className="whitespace-pre-wrap">{message.text}</div>
                
                {message.sender === 'agent' && !message.isError && (
                  <button
                    onClick={() => speak(message.text)}
                    disabled={isSpeaking}
                    className="mt-2 p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                    title="Listen to this message"
                  >
                    <Volume2 className="h-3 w-3" />
                  </button>
                )}
                
                {message.isError && message.errorDetails && (
                  <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-lg">
                    <div className="text-sm font-medium text-red-800 mb-2">
                      Error Details:
                    </div>
                    <div className="text-xs text-red-700 space-y-1">
                      <div><strong>Type:</strong> {message.errorDetails.error_type}</div>
                      <div><strong>Error:</strong> {message.errorDetails.error}</div>
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <strong>Suggestion:</strong> {message.errorDetails.suggestion}
                      </div>
                    </div>
                    {onRetryMessage && (
                      <button
                        onClick={() => onRetryMessage(message.id)}
                        className="mt-3 flex items-center space-x-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Retry</span>
                      </button>
                    )}
                  </div>
                )}
                
                <div className={`text-xs mt-2 ${
                  message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="message-bubble agent-message max-w-xs md:max-w-md lg:max-w-lg">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 pt-4">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={isListening ? "Listening..." : "Ask about travel planning, destinations, flights, hotels..."}
            className="input-field flex-1"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleVoiceInput}
            disabled={isLoading}
            className={`p-2 rounded-lg transition-colors ${
              isListening 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        
        {/* Voice input status */}
        {isListening && (
          <div className="mt-2 text-sm text-blue-600 flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span>Listening... Speak now</span>
          </div>
        )}
      </form>
    </div>
  );
};

export default ChatInterface; 