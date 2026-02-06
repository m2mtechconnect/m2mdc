import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Activity, 
  UserPlus, 
  Settings, 
  Shield, 
  Rocket, 
  FileText,
  AlertTriangle,
  Archive,
  ExternalLink 
} from "lucide-react";

interface ActivityItem {
  user: string;
  action: string;
  target: string;
  time: string;
  type?: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  onViewAll?: () => void;
  onItemClick?: (activity: ActivityItem) => void;
}

const getActivityIcon = (action: string) => {
  if (action.includes("deploy") || action.includes("deployed")) return Rocket;
  if (action.includes("invite") || action.includes("added")) return UserPlus;
  if (action.includes("permission") || action.includes("role")) return Shield;
  if (action.includes("update") || action.includes("changed")) return Settings;
  if (action.includes("flag") || action.includes("alert")) return AlertTriangle;
  if (action.includes("archive")) return Archive;
  if (action.includes("document") || action.includes("RAG")) return FileText;
  return Activity;
};

const getActivityColor = (action: string) => {
  if (action.includes("deploy") || action.includes("deployed")) return "text-secondary";
  if (action.includes("invite") || action.includes("added")) return "text-primary";
  if (action.includes("permission") || action.includes("role")) return "text-info";
  if (action.includes("flag") || action.includes("alert")) return "text-orange-600";
  if (action.includes("archive")) return "text-muted-foreground";
  return "text-foreground";
};

export default function ActivityFeed({ activities, onViewAll, onItemClick }: ActivityFeedProps) {
  return (
    <TooltipProvider>
      <Card className="glass-panel p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-display font-bold">Recent Activity</h2>
          {onViewAll && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onViewAll}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </TooltipTrigger>
              <TooltipContent>View complete activity history</TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="space-y-4">
          {activities && activities.length > 0 ? (
            activities.map((activity, index) => {
              const Icon = getActivityIcon(activity.action);
              const color = getActivityColor(activity.action);
              
              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div
                      className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-secondary/50 transition-smooth cursor-pointer"
                      onClick={() => onItemClick?.(activity)}
                    >
                      <div className={`p-2 rounded-full bg-muted/50 ${color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-semibold">{activity.user}</span>
                          {" "}
                          <span className="text-muted-foreground">{activity.action}</span>
                          {" "}
                          <span className="font-medium">{activity.target}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Click for detailed view and audit trail
                  </TooltipContent>
                </Tooltip>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </Card>
    </TooltipProvider>
  );
}
