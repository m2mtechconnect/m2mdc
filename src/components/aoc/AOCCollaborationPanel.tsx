import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Eye, MessageSquare, Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AOCCollaborationPanelProps {
  agentId: string;
}

interface UserPresence {
  user_id: string;
  user_email: string;
  user_name: string;
  online_at: string;
  viewing_section?: string;
}

interface Activity {
  id: string;
  user_name: string;
  action: string;
  timestamp: string;
  section: string;
}

export function AOCCollaborationPanel({ agentId }: AOCCollaborationPanelProps) {
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([
    {
      id: '1',
      user_name: 'Sarah Chen',
      action: 'Modified workflow node',
      timestamp: '2 minutes ago',
      section: 'Workflow Graph',
    },
    {
      id: '2',
      user_name: 'Mike Johnson',
      action: 'Exported performance metrics',
      timestamp: '15 minutes ago',
      section: 'Metrics',
    },
    {
      id: '3',
      user_name: 'Alex Rivera',
      action: 'Updated alert threshold',
      timestamp: '1 hour ago',
      section: 'Alerts',
    },
    {
      id: '4',
      user_name: 'Sarah Chen',
      action: 'Deployed to staging',
      timestamp: '2 hours ago',
      section: 'Environment',
    },
  ]);

  useEffect(() => {
    const channel = supabase.channel(`aoc_presence_${agentId}`);

    // Track current user presence
    const trackPresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userPresence = {
        user_id: user.id,
        user_email: user.email || '',
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
        online_at: new Date().toISOString(),
        viewing_section: 'Overview',
      };

      await channel.track(userPresence);
    };

    // Listen to presence changes
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: UserPresence[] = [];
        
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          presences.forEach((presence) => {
            users.push(presence as UserPresence);
          });
        });
        
        setActiveUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await trackPresence();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (userId: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-teal-500',
    ];
    const index = userId.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Collaboration</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {activeUsers.length} Active
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          See who's viewing and recent changes
        </p>
      </div>

      {/* Active Users */}
      <div className="p-4 border-b">
        <h4 className="text-xs font-semibold mb-3 flex items-center gap-2">
          <Eye className="h-3.5 w-3.5" />
          Active Now
        </h4>
        <div className="space-y-2">
          {activeUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No other users viewing</p>
          ) : (
            activeUsers.map((user, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={`${getAvatarColor(user.user_id)} text-white text-xs`}>
                    {getInitials(user.user_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.user_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.viewing_section || 'Overview'}
                  </p>
                </div>
                <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 pb-3 border-b">
          <h4 className="text-xs font-semibold flex items-center gap-2">
            <Bell className="h-3.5 w-3.5" />
            Recent Activity
          </h4>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {recentActivity.map((activity) => (
              <Card key={activity.id} className="p-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(activity.user_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">
                      <span className="font-medium">{activity.user_name}</span>
                      {' '}
                      <span className="text-muted-foreground">{activity.action}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {activity.section}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {activity.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Team Notes Section */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-3.5 w-3.5" />
          <h4 className="text-xs font-semibold">Team Notes</h4>
        </div>
        <div className="text-xs text-muted-foreground bg-accent/50 rounded-lg p-3">
          "Testing new workflow configuration - will deploy to production tomorrow if metrics look good. - Sarah"
        </div>
      </div>
    </div>
  );
}
