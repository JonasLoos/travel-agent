import React from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useVoice } from '../hooks/useVoice';

interface VoiceControlsProps {
  onTranscriptChange?: (transcript: string) => void;
  autoSpeak?: boolean;
  onAutoSpeakChange?: (enabled: boolean) => void;
}

const VoiceControls: React.FC<VoiceControlsProps> = ({
  onTranscriptChange,
  autoSpeak = false,
  onAutoSpeakChange
}) => {
  const {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    transcript,
    error
  } = useVoice();

  React.useEffect(() => {
    if (onTranscriptChange && transcript) {
      onTranscriptChange(transcript);
    }
  }, [transcript, onTranscriptChange]);

  const handleVoiceInput = async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  const handleAutoSpeakToggle = () => {
    if (onAutoSpeakChange) {
      onAutoSpeakChange(!autoSpeak);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Voice Input Button */}
      <button
        onClick={handleVoiceInput}
        className={`p-2 rounded-lg transition-colors ${
          isListening 
            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title={isListening ? 'Stop listening' : 'Start voice input'}
      >
        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>

      {/* Auto-Speak Toggle */}
      <button
        onClick={handleAutoSpeakToggle}
        className={`p-2 rounded-lg transition-colors ${
          autoSpeak 
            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title={autoSpeak ? 'Disable auto-speak' : 'Enable auto-speak'}
      >
        {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>

      {/* Status Indicators */}
      {isListening && (
        <div className="flex items-center space-x-1 text-sm text-blue-600">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span>Listening...</span>
        </div>
      )}

      {isSpeaking && (
        <div className="flex items-center space-x-1 text-sm text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Speaking...</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
};

export default VoiceControls; 