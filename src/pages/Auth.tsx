import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import m2mLogo from "@/assets/m2m-logo.png";
import { z } from "zod";

// Validation schema
const authSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z.string()
    .min(6, { message: "Password must be at least 6 characters" })
    .max(128, { message: "Password must be less than 128 characters" })
});

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validatedData = authSchema.parse({
        email: email.trim(),
        password
      });

      const { error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please try again.');
        }
        throw error;
      }

      toast.success("Signed in successfully!");
      navigate("/");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors?.[0]?.message || 'Validation error');
      } else {
        toast.error(error instanceof Error ? error.message : "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validatedData = authSchema.parse({
        email: email.trim(),
        password
      });

      const { error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          throw new Error('This email is already registered. Please sign in instead.');
        }
        throw error;
      }

      toast.success("Account created successfully! You can now sign in.");
      setIsSignUp(false);
      setPassword("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors?.[0]?.message || 'Validation error');
      } else {
        toast.error(error instanceof Error ? error.message : "Sign up failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = isSignUp ? handleSignUp : handleSignIn;


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center p-4 relative overflow-hidden">
      {/* AI/ML Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Base gradient glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Neural network grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="neural-grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <circle cx="50" cy="50" r="1.5" fill="#8b5cf6" opacity="0.4">
                <animate attributeName="opacity" values="0.4;0.8;0.4" dur="4s" repeatCount="indefinite" />
              </circle>
              <line x1="50" y1="50" x2="100" y2="50" stroke="#8b5cf6" strokeWidth="0.5" opacity="0.3">
                <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" />
              </line>
              <line x1="50" y1="50" x2="50" y2="100" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3">
                <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3.5s" repeatCount="indefinite" />
              </line>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#neural-grid)" />
        </svg>

        {/* Floating particles */}
        <div className="absolute top-[10%] left-[15%] w-2 h-2 rounded-full bg-yellow-400/60 animate-float" />
        <div className="absolute top-[30%] left-[75%] w-2 h-2 rounded-full bg-purple-400/60 animate-float" style={{ animationDelay: '1s', animationDuration: '8s' }} />
        <div className="absolute top-[60%] left-[25%] w-2 h-2 rounded-full bg-blue-400/60 animate-float" style={{ animationDelay: '2s', animationDuration: '10s' }} />
        <div className="absolute top-[80%] left-[80%] w-2 h-2 rounded-full bg-yellow-400/60 animate-float" style={{ animationDelay: '3s', animationDuration: '9s' }} />
        <div className="absolute top-[40%] left-[50%] w-2 h-2 rounded-full bg-purple-400/60 animate-float" style={{ animationDelay: '1.5s', animationDuration: '7s' }} />
        
        {/* Circuit-like lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,200 Q200,100 400,200 T800,200" stroke="#8b5cf6" strokeWidth="2" fill="none">
            <animate attributeName="stroke-dasharray" values="0,1000;1000,0" dur="6s" repeatCount="indefinite" />
          </path>
          <path d="M100,400 Q300,300 500,400 T900,400" stroke="#3b82f6" strokeWidth="2" fill="none">
            <animate attributeName="stroke-dasharray" values="0,1000;1000,0" dur="7s" repeatCount="indefinite" />
          </path>
          <path d="M0,600 Q250,550 500,600 T1000,600" stroke="#eab308" strokeWidth="2" fill="none" opacity="0.6">
            <animate attributeName="stroke-dasharray" values="0,1000;1000,0" dur="8s" repeatCount="indefinite" />
          </path>
        </svg>

        {/* Data stream effect */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-purple-500/30 to-transparent animate-data-stream" />
        <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-blue-500/30 to-transparent animate-data-stream" style={{ animationDelay: '2s' }} />
      </div>

      <Card className="max-w-md w-full p-8 shadow-2xl border-white/20 backdrop-blur-xl bg-white/90 dark:bg-card/90 relative z-10 ring-1 ring-white/30">
        <div className="mb-8 text-center">
          <img 
            src={m2mLogo} 
            alt="M2M Logo" 
            className="h-16 mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            Welcome to AURA
          </h1>
          <p className="text-muted-foreground">
            {isSignUp ? "Create your account to get started" : "Building autonomous AI systems for enterprise"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="signin-email" className="text-sm font-semibold">Email Address</Label>
            <Input
              id="signin-email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim().slice(0, 255))}
              required
              disabled={loading}
              className="mt-2 h-12"
              maxLength={255}
            />
          </div>

          <div>
            <Label htmlFor="signin-password" className="text-sm font-semibold">Password</Label>
            <Input
              id="signin-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value.slice(0, 128))}
              required
              disabled={loading}
              className="mt-2 h-12"
              minLength={6}
              maxLength={128}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Minimum 6 characters
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold" 
            disabled={loading}
            size="lg"
          >
            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {isSignUp ? "Sign Up" : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setPassword("");
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isSignUp 
              ? "Already have an account? Sign in" 
              : "Don't have an account? Sign up"}
          </button>
        </div>

      </Card>
    </div>
  );
}
