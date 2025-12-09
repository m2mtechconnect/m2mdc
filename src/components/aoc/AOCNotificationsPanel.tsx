import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Check, X, AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AOCNotificationsPanelProps {
  agentId: string;
}

interface Notification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionable: boolean;
}

export function AOCNotificationsPanel({ agentId }: AOCNotificationsPanelProps) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'error',
      title: 'Agent Offline',
      message: 'Agent stopped responding 2 hours ago. Check deployment status.',
      timestamp: '2 hours ago',
      read: false,
      actionable: true,
    },
    {
      id: '2',
      type: 'warning',
      title: 'High Token Usage',
      message: 'Token consumption is 85% of daily limit.',
      timestamp: '4 hours ago',
      read: false,
      actionable: true,
    },
    {
      id: '3',
      type: 'success',
      title: 'Deployment Successful',
      message: 'Version 2.3.1 deployed to production successfully.',
      timestamp: '6 hours ago',
      read: true,
      actionable: false,
    },
    {
      id: '4',
      type: 'info',
      title: 'Sarah Chen Joined',
      message: 'Sarah Chen is now viewing the AOC.',
      timestamp: '8 hours ago',
      read: true,
      actionable: false,
    },
    {
      id: '5',
      type: 'warning',
      title: 'P95 Latency Spike',
      message: 'Response time increased to 2.5s (threshold: 2.0s).',
      timestamp: '1 day ago',
      read: true,
      actionable: true,
    },
  ]);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast({
      title: '✓ Notification Dismissed',
      description: 'Notification removed',
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast({
      title: '✓ All Read',
      description: 'All notifications marked as read',
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'error': return XCircle;
      case 'warning': return AlertTriangle;
      case 'success': return CheckCircle2;
      case 'info': return Info;
      default: return Bell;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'success': return 'text-green-500';
      case 'info': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Notifications</h3>
          </div>
          <Badge variant={unreadCount > 0 ? "default" : "secondary"} className="text-xs">
            {unreadCount} Unread
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Real-time alerts and updates
        </p>
      </div>

      {/* Actions */}
      {unreadCount > 0 && (
        <div className="p-3 border-b">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={markAllAsRead}
          >
            <Check className="h-3.5 w-3.5 mr-2" />
            Mark All as Read
          </Button>
        </div>
      )}

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {notifications.map((notification) => {
            const Icon = getIcon(notification.type);
            const color = getColor(notification.type);
            
            return (
              <Card
                key={notification.id}
                className={`p-3 ${!notification.read ? 'bg-accent/50 border-primary/20' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    notification.type === 'error' ? 'bg-red-500/10' :
                    notification.type === 'warning' ? 'bg-yellow-500/10' :
                    notification.type === 'success' ? 'bg-green-500/10' :
                    'bg-blue-500/10'
                  }`}>
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-medium">{notification.title}</h4>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {notification.timestamp}
                      </span>
                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => dismissNotification(notification.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
