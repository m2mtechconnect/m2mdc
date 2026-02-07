/**
 * Enterprise Sign In Page
 * Modern auth UI with SSO support and security indicators
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, Mail, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { AuthLayout, SecurityBadge, SSOButtons } from "@/components/auth";

const signInSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z.string()
    .min(1, { message: "Password is required" })
    .max(128, { message: "Password must be less than 128 characters" })
});

export default function SignIn() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const validatedData = signInSchema.parse({
        email: email.trim(),
        password
      });

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        }
        if (authError.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before signing in.');
        }
        throw authError;
      }

      toast.success("Welcome back!");
      navigate("/");
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors?.[0]?.message || 'Validation error');
      } else {
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSSO = async () => {
    toast.info("Google SSO coming soon. Contact your administrator.");
  };

  const handleMicrosoftSSO = async () => {
    toast.info("Microsoft SSO coming soon. Contact your administrator.");
  };

  const handleEnterpriseSSO = async () => {
    toast.info("Enterprise SSO coming soon. Contact your administrator.");
  };

  return (
    <AuthLayout
      title="Sign in to your account"
      subtitle="Enter your credentials to access the studio"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="h-12 pl-10 transition-shadow focus:ring-2 focus:ring-primary/20"
              maxLength={255}
              aria-describedby="email-error"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Link 
              to="/forgot-password" 
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="h-12 pl-10 pr-10 transition-shadow focus:ring-2 focus:ring-primary/20"
              maxLength={128}
              aria-describedby="password-error"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-300" 
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Sign In
        </Button>

        {/* SSO Options */}
        <SSOButtons
          onGoogleClick={handleGoogleSSO}
          onMicrosoftClick={handleMicrosoftSSO}
          onSSOClick={handleEnterpriseSSO}
          disabled={loading}
        />

        {/* Security Badge */}
        <SecurityBadge variant="minimal" className="pt-4" />
      </form>

      {/* Footer Links */}
      <div className="mt-6 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/sign-up" className="text-primary hover:text-primary/80 font-medium transition-colors">
            Sign up
          </Link>
        </p>
        
        <p className="text-xs text-muted-foreground">
          Need access?{" "}
          <a href="mailto:admin@m2m.ai" className="text-primary hover:text-primary/80 transition-colors">
            Contact your M2M administrator
          </a>
        </p>

        {/* Back to Home */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </AuthLayout>
  );
}
