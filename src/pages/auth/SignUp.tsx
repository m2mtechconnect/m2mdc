/**
 * Enterprise Sign Up Page
 * Registration with password strength and SSO
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Lock, Mail, Eye, EyeOff, User } from "lucide-react";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { AuthLayout, SecurityBadge, PasswordStrengthMeter, SSOButtons } from "@/components/auth";

const signUpSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" }),
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(128, { message: "Password must be less than 128 characters" })
    .regex(/[a-z]/, { message: "Password must contain a lowercase letter" })
    .regex(/[A-Z]/, { message: "Password must contain an uppercase letter" })
    .regex(/[0-9]/, { message: "Password must contain a number" })
});

export default function SignUp() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
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

    if (!agreeTerms) {
      setError("Please agree to the terms and conditions");
      setLoading(false);
      return;
    }

    try {
      const validatedData = signUpSchema.parse({
        name: name.trim(),
        email: email.trim(),
        password
      });

      const { error: authError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: validatedData.name,
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('This email is already registered. Please sign in instead.');
        }
        throw authError;
      }

      toast.success("Account created! Check your email to verify your account.");
      navigate("/sign-in");
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors?.[0]?.message || 'Validation error');
      } else {
        setError(err instanceof Error ? err.message : "Sign up failed");
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
      title="Create your account"
      subtitle="Get started with the Sovereign AI Twin Studio"
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

        {/* Name Input */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Full Name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              placeholder="John Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              className="h-12 pl-10 transition-shadow focus:ring-2 focus:ring-primary/20"
              maxLength={100}
            />
          </div>
        </div>

        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Work Email
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
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="h-12 pl-10 pr-10 transition-shadow focus:ring-2 focus:ring-primary/20"
              maxLength={128}
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
          <PasswordStrengthMeter password={password} />
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-start space-x-3">
          <Checkbox
            id="terms"
            checked={agreeTerms}
            onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
            disabled={loading}
            className="mt-0.5"
          />
          <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
            I agree to the{" "}
            <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
          </Label>
        </div>

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-300" 
          disabled={loading || !agreeTerms}
        >
          {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Create Account
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
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/sign-in" className="text-primary hover:text-primary/80 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
