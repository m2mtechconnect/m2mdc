import { useTranslation } from "react-i18next";
/**
 * PendingApproval - Shown to authenticated users who haven't been approved by admin yet
 */

import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Shield, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function PendingApproval() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="glass-panel p-8 max-w-md text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Clock className="h-8 w-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold">Account Pending Approval</h1>
          <p className="text-muted-foreground">
            Your account has been created successfully. An administrator will review and approve your access shortly.
          </p>
        </div>

        <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-left">
            For security, all new accounts require admin approval before accessing the Data Centre Studio.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleSignOut}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </Card>
    </div>
  );
}
