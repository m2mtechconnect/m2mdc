/**
 * Sign Out Confirmation Page
 * Clean sign out experience with options
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle2, LogIn, Home } from "lucide-react";
import { motion } from "framer-motion";
import { AuthLayout } from "@/components/auth";

export default function SignOut() {
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const performSignOut = async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        setSignedOut(true);
        toast.success("You've been signed out successfully");
      } catch (err) {
        console.error("Sign out error:", err);
        toast.error("Failed to sign out");
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    performSignOut();
  }, [navigate]);

  if (loading) {
    return (
      <AuthLayout
        title="Signing out..."
        subtitle="Please wait while we secure your session"
      >
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p className="mt-4 text-muted-foreground">Signing out securely...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="You've been signed out"
      subtitle="Thank you for using M2M Sovereign AI Twin Studio"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-8"
      >
        {/* Success Icon */}
        <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>
        
        {/* Message */}
        <div className="space-y-2">
          <p className="text-muted-foreground">
            Your session has been securely terminated.
          </p>
          <p className="text-sm text-muted-foreground">
            All local data has been cleared from this device.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link to="/sign-in" className="block">
            <Button className="w-full h-12 gap-2 text-base font-medium">
              <LogIn className="h-4 w-4" />
              Sign In Again
            </Button>
          </Link>
          
          <Link to="/twin-datacentre" className="block">
            <Button variant="outline" className="w-full h-11 gap-2">
              <Home className="h-4 w-4" />
              Return to Marketing Site
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground pt-4 border-t border-border">
          © {new Date().getFullYear()} M2M Data Corp. All rights reserved.
        </p>
      </motion.div>
    </AuthLayout>
  );
}
