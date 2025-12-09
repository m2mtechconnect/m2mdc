import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  citations?: any[];
  followUps?: string[];
  metrics?: any;
}

interface ConversationSession {
  id: string;
  session_id: string;
  last_query: string | null;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

export const useCopilotHistory = (sessionId: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);

  const saveMessages = async (messages: Message[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const lastUserMessage = messages.filter(m => m.role === 'user').pop();

      // Check if session exists
      const { data: existing } = await supabase
        .from('copilot_sessions')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('copilot_sessions')
          .update({
            context: { messages } as any,
            last_query: lastUserMessage?.content || null,
            response_count: messages.filter(m => m.role === 'assistant').length,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('copilot_sessions')
          .insert({
            session_id: sessionId,
            user_id: user.id,
            context: { messages } as any,
            last_query: lastUserMessage?.content || null,
            response_count: messages.filter(m => m.role === 'assistant').length,
          });
      }
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  };

  const loadMessages = async (): Promise<Message[]> => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('copilot_sessions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('Failed to load conversation:', error);
        }
        return [];
      }

      return (data?.context as any)?.messages || [];
    } catch (error) {
      console.error('Failed to load conversation:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('copilot_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedSessions = (data || []).map(session => ({
        id: session.id,
        session_id: session.session_id,
        last_query: session.last_query,
        created_at: session.created_at,
        updated_at: session.updated_at,
        messages: ((session.context as any)?.messages || []) as Message[],
      }));

      setSessions(formattedSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const deleteSession = async (deletedId: string) => {
    try {
      const { error } = await supabase
        .from('copilot_sessions')
        .delete()
        .eq('id', deletedId);

      if (error) throw error;

      toast.success('Conversation deleted');
      loadAllSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const clearCurrentSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('copilot_sessions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast.success('Conversation cleared');
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  };

  useEffect(() => {
    loadAllSessions();
  }, []);

  return {
    isLoading,
    sessions,
    saveMessages,
    loadMessages,
    loadAllSessions,
    deleteSession,
    clearCurrentSession,
  };
};
