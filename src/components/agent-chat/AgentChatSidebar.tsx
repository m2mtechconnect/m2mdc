import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquare,
  Plus,
  Clock,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

interface AgentChatSidebarProps {
  agentId: string;
  currentConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
}

export function AgentChatSidebar({
  agentId,
  currentConversationId,
  onConversationSelect,
  onNewConversation,
}: AgentChatSidebarProps) {
  const { open: collapsed } = useSidebar();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, [agentId]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agent_conversations')
        .select(`
          id,
          title,
          created_at,
          updated_at
        `)
        .eq('agent_id', agentId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get message counts for each conversation
      const conversationsWithCounts = await Promise.all(
        (data || []).map(async (conv) => {
          const { count } = await supabase
            .from('agent_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id);
          
          return { ...conv, message_count: count || 0 };
        })
      );

      setConversations(conversationsWithCounts);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversation history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      // Delete messages first
      await supabase
        .from('agent_messages')
        .delete()
        .eq('conversation_id', conversationId);

      // Delete conversation
      const { error } = await supabase
        .from('agent_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      toast({
        title: 'Conversation deleted',
        description: 'The conversation has been removed',
      });

      // Reload conversations
      await loadConversations();

      // If deleted conversation was active, create new one
      if (conversationId === currentConversationId) {
        onNewConversation();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  const confirmDelete = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  return (
    <>
      <Sidebar
        className={collapsed ? 'w-14' : 'w-64'}
        collapsible="icon"
      >
        <SidebarContent>
          <SidebarGroup>
            <div className="px-2 py-2">
              <Button
                onClick={onNewConversation}
                className="w-full gap-2"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                {!collapsed && <span>New Chat</span>}
              </Button>
            </div>

            <SidebarGroupLabel className="px-4 py-2">
              {!collapsed && 'Recent Conversations'}
            </SidebarGroupLabel>

            <SidebarGroupContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  {!collapsed && (
                    <p className="text-xs text-muted-foreground">
                      No conversations yet
                    </p>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <SidebarMenu>
                    {conversations.map((conversation) => {
                      const isActive = conversation.id === currentConversationId;
                      
                      return (
                        <SidebarMenuItem key={conversation.id}>
                          <SidebarMenuButton
                            onClick={() => onConversationSelect(conversation.id)}
                            className={`
                              group relative
                              ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'}
                            `}
                          >
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
                              
                              {!collapsed && (
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm truncate flex-1">
                                      {conversation.title || 'Untitled Chat'}
                                    </p>
                                    {isActive && (
                                      <Badge variant="default" className="text-xs px-1.5 py-0">
                                        Active
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {formatDistanceToNow(new Date(conversation.updated_at), {
                                        addSuffix: true,
                                      })}
                                    </span>
                                    {conversation.message_count !== undefined && (
                                      <>
                                        <span>•</span>
                                        <span>{conversation.message_count} msgs</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {!collapsed && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => confirmDelete(conversation.id, e)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </ScrollArea>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone and will remove all messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => conversationToDelete && handleDeleteConversation(conversationToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
