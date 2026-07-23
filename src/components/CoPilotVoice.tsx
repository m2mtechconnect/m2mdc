import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/hooks/useEdgeFunction";
import { logger } from "@/lib/logger";
import { handleError } from "@/lib/errorHandlers";

interface CoPilotVoiceProps {
  onTranscript?: (text: string) => void;
}

export const CoPilotVoice = ({ onTranscript }: CoPilotVoiceProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Check for browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Not Supported",
        description: "Voice input is not supported in this browser. Try Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      logger.debug('Voice input received', { component: 'CoPilotVoice', action: 'onresult', metadata: { transcript } });
      
      if (onTranscript) {
        onTranscript(transcript);
      }

      setIsProcessing(true);
      
      try {
        // Call copilot-chat edge function with the managed AI gateway
        const data = await invokeEdgeFunction('copilot-chat-simple', {
          messages: [{ role: 'user', content: transcript }],
          role: 'architect'
        });

        const responseText = data.text || "I couldn't process that request.";
        
        // Speak the response
        speak(responseText);
        
      } catch (error) {
        handleError(error, {
          component: 'CoPilotVoice',
          action: 'onresult',
          fallbackMessage: 'Failed to process voice input'
        });
      } finally {
        setIsProcessing(false);
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      logger.error('Speech recognition error', new Error(event.error), { component: 'CoPilotVoice', action: 'onerror' });
      setIsListening(false);
      setIsProcessing(false);
      
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        toast({
          title: "Voice Error",
          description: `Speech recognition error: ${event.error}`,
          variant: "destructive",
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    synthRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [toast, onTranscript]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
      toast({
        title: "Listening",
        description: "Speak now...",
      });
    } catch (error) {
      handleError(error, {
        component: 'CoPilotVoice',
        action: 'startListening',
        fallbackMessage: 'Failed to start voice recognition'
      });
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  };

  const speak = (text: string) => {
    if (!synthRef.current) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      toast({
        title: "Speech Error",
        description: "Failed to speak response",
        variant: "destructive",
      });
    };

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    setIsSpeaking(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const toggleSpeaking = () => {
    if (isSpeaking) {
      stopSpeaking();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isListening ? "destructive" : "outline"}
        size="icon"
        onClick={toggleListening}
        disabled={isProcessing}
        className="relative"
        aria-label={isListening ? "Stop listening" : "Start voice input"}
        aria-pressed={isListening}
      >
        {isListening ? (
          <>
            <MicOff className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
          </>
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      <Button
        variant={isSpeaking ? "destructive" : "ghost"}
        size="icon"
        onClick={toggleSpeaking}
        disabled={!isSpeaking}
        aria-label={isSpeaking ? "Mute assistant voice" : "Assistant voice output"}
        aria-pressed={isSpeaking}
      >
        {isSpeaking ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>

      {isProcessing && (
        <span className="text-sm text-muted-foreground animate-pulse">
          Processing...
        </span>
      )}
    </div>
  );
};
