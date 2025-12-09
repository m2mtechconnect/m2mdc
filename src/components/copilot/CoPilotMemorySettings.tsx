/**
 * Co-Pilot Memory Settings
 * 
 * Manage Co-Pilot's persistent memory preferences
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { Trash2, Brain, Info } from 'lucide-react';
import { toast } from 'sonner';

export function CoPilotMemorySettings() {
  const { memory, memoryEnabled, setMemoryEnabled, clearMemory, getMemory } = useCoPilotContext();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearMemory = async () => {
    setIsClearing(true);
    try {
      await clearMemory();
      toast.success('Co-Pilot memory cleared successfully');
    } catch (error) {
      toast.error('Failed to clear memory');
    } finally {
      setIsClearing(false);
    }
  };

  const lastAgent = getMemory('last_agent_id');
  const lastIndustry = getMemory('last_industry');
  const recentTasks = getMemory('recent_tasks');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Co-Pilot Memory
          </CardTitle>
          <CardDescription>
            Co-Pilot remembers your preferences and context to provide better assistance across sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="memory-enabled">Enable Memory</Label>
              <p className="text-sm text-muted-foreground">
                Allow Co-Pilot to remember your work context and preferences
              </p>
            </div>
            <Switch
              id="memory-enabled"
              checked={memoryEnabled}
              onCheckedChange={setMemoryEnabled}
            />
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Co-Pilot stores your recent agents, industries, and preferences to provide contextual assistance. 
                No sensitive data or PII is stored unless explicitly approved.
              </p>
            </div>

            {memoryEnabled && Object.keys(memory).length > 0 && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm">Stored Memory</h4>
                <div className="space-y-2 text-xs">
                  {lastAgent && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Agent:</span>
                      <span className="font-medium">{lastAgent.agentName || 'Unnamed'}</span>
                    </div>
                  )}
                  {lastIndustry && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Industry:</span>
                      <span className="font-medium">{lastIndustry.industry}</span>
                    </div>
                  )}
                  {recentTasks?.tasks?.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recent Tasks:</span>
                      <span className="font-medium">{recentTasks.tasks.length} stored</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="mt-4"
                  disabled={!memoryEnabled || Object.keys(memory).length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Memory
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Co-Pilot Memory?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all stored preferences, context, and history. 
                    Co-Pilot will no longer remember your previous work or preferences. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearMemory}
                    disabled={isClearing}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isClearing ? 'Clearing...' : 'Clear Memory'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What Gets Remembered?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Recent agents and digital twins you've worked on</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Industry focus and department preferences</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Your preferred response style (concise vs detailed)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Last 5 tasks or questions you asked</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Active page and workflow context</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
