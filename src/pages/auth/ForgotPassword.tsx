/**
 * Forgot Password Page
 * Password reset request with enterprise styling
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { AuthLayout, SecurityBadge } from "@/components/auth";

const emailSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" })
});

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const validatedData = emailSchema.parse({
        email: email.trim()
      });

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        validatedData.email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) throw resetError;

      setSuccess(true);
      toast.success("Password reset email sent!");
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors?.[0]?.message || 'Validation error');
      } else {
        setError(err instanceof Error ? err.message : "Failed to send reset email");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="We've sent you a password reset link"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          
          <div className="space-y-2">
            <p className="text-muted-foreground">
              We sent a password reset link to:
            </p>
            <p className="font-medium text-foreground">{email}</p>
          </div>

          <p className="text-sm text-muted-foreground">
            Didn't receive the email? Check your spam folder or{" "}
            <button 
              onClick={() => setSuccess(false)} 
              className="text-primary hover:underline"
            >
              try again
            </button>
          </p>

          <Link to="/sign-in">
            <Button variant="outline" className="w-full h-11 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Button>
          </Link>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link"
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
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full h-12 text-base font-medium" 
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Send Reset Link
        </Button>

        {/* Security Badge */}
        <SecurityBadge variant="minimal" className="pt-4" />
      </form>

      {/* Footer Links */}
      <div className="mt-6 text-center">
        <Link 
          to="/sign-in" 
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Sign In
        </Link>
      </div>
    </AuthLayout>
  );
}
