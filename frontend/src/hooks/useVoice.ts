import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceReturn {
  isListening: boolean;
  isSpeaking: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
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
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSpokenTextRef = useRef<string>('');

  const cleanupAudio = useCallback(() => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
    lastSpokenTextRef.current = '';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      if (mediaRecorderRef.current && isListening) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [cleanupAudio, isListening]);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');
      
      // Stop any current audio before starting recording
      cleanupAudio();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
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
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
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
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Failed to record audio');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
    }
  }, [cleanupAudio]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const stopSpeaking = useCallback(() => {
    cleanupAudio();
  }, [cleanupAudio]);

  const speak = useCallback(async (text: string) => {
    // Prevent duplicate requests for the same text
    if (lastSpokenTextRef.current === text && isSpeaking) {
      cleanupAudio();
      return;
    }
    
    // If already speaking, stop current audio and don't start new one
    if (isSpeaking) {
      cleanupAudio();
      return;
    }
    
    try {
      setError(null);
      setIsSpeaking(true);
      lastSpokenTextRef.current = text;

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      const response = await fetch('/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text,
          voice: 'alloy'
        }),
        signal: abortControllerRef.current.signal,
      });

      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to convert text to speech');
      }

      const data = await response.json();
      
      // Check again if request was aborted before processing audio
      if (abortControllerRef.current.signal.aborted) {
        return;
      }
      
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))],
        { type: 'audio/mp3' }
      );
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        cleanupAudio();
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        cleanupAudio();
        URL.revokeObjectURL(audioUrl);
        setError('Failed to play audio');
      };
      
      await audio.play();
      
    } catch (err) {
      // Don't set error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Speak request was cancelled');
        return;
      }
      
      console.error('Error in text-to-speech:', err);
      setError(err instanceof Error ? err.message : 'Failed to convert text to speech');
      cleanupAudio();
    }
  }, [isSpeaking, cleanupAudio]);

  return {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    transcript,
    error,
  };
}; 