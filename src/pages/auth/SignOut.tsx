/**
 * Sign Out Page
 * Immediately signs out and redirects to landing page
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function SignOut() {
  const navigate = useNavigate();

  useEffect(() => {
    const performSignOut = async () => {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Sign out error:", err);
      } finally {
        // Always redirect to landing page
        navigate('/', { replace: true });
      }
    };

    performSignOut();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
        <p className="mt-4 text-muted-foreground">Signing out...</p>
      </div>
    </div>
  );
}
