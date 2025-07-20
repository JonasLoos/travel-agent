import { useState, useRef, useCallback } from 'react';

interface UseVoiceReturn {
  isListening: boolean;
  isSpeaking: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  speak: (text: string) => Promise<void>;
  transcript: string;
  error: string | null;
}

export const useVoice = (): UseVoiceReturn => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create MediaRecorder for audio recording
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          // Create audio blob
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Send to backend for transcription
          const formData = new FormData();
          formData.append('audio_file', audioBlob, 'recording.webm');
          
          const response = await fetch('/speech-to-text', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to transcribe audio');
          }

          const data = await response.json();
          setTranscript(data.text);
        } catch (err) {
          console.error('Transcription error:', err);
          setError(err instanceof Error ? err.message : 'Failed to transcribe audio');
        } finally {
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Failed to record audio');
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      mediaRecorder.start();
      setIsListening(true);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const speak = useCallback(async (text: string) => {
    try {
      setError(null);
      setIsSpeaking(true);

      // Use backend TTS for better quality and consistency
      const response = await fetch('/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text,
          voice: 'alloy' // OpenAI TTS voice
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to convert text to speech');
      }

      const data = await response.json();
      
      // Convert base64 audio to blob and play
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))],
        { type: 'audio/mp3' }
      );
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        throw new Error('Failed to play audio');
      };
      
      await audio.play();
      
    } catch (err) {
      console.error('Error in text-to-speech:', err);
      setError(err instanceof Error ? err.message : 'Failed to convert text to speech');
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    transcript,
    error,
  };
}; 