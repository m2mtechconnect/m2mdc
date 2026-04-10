import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DCCard } from "@/components/dc-ui";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import m2mLogo from "@/assets/m2m-logo.png";
import { z } from "zod";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

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
          throw new Error(t('auth.invalidCredentials'));
        }
        throw error;
      }

      toast.success(t('auth.signedInSuccess'));
      navigate("/");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors?.[0]?.message || t('auth.validationError'));
      } else {
        toast.error(error instanceof Error ? error.message : t('auth.authFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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
          throw new Error(t('auth.alreadyRegistered'));
        }
        throw error;
      }

      toast.success(t('auth.accountCreated'));
      setIsSignUp(false);
      setPassword("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors?.[0]?.message || t('auth.validationError'));
      } else {
        toast.error(error instanceof Error ? error.message : t('auth.signUpFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = isSignUp ? handleSignUp : handleSignIn;


  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-3/5 bg-gradient-to-br from-[#0A0F1F] via-[#131B2E] to-[#1A2637] relative overflow-hidden items-center justify-center">
        {/* AI/ML Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Base gradient glow orbs - M2M Gold theme */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-m2m-gold-dark/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-accent/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          
          {/* Neural network grid pattern - M2M Gold */}
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="neural-grid" width="100" height="100" patternUnits="userSpaceOnUse">
                <circle cx="50" cy="50" r="1.5" fill="#FFCC00" opacity="0.4">
                  <animate attributeName="opacity" values="0.4;0.8;0.4" dur="4s" repeatCount="indefinite" />
                </circle>
                <line x1="50" y1="50" x2="100" y2="50" stroke="#FFCC00" strokeWidth="0.5" opacity="0.3">
                  <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" />
                </line>
                <line x1="50" y1="50" x2="50" y2="100" stroke="#D4A700" strokeWidth="0.5" opacity="0.3">
                  <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3.5s" repeatCount="indefinite" />
                </line>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#neural-grid)" />
          </svg>

          {/* Floating particles - M2M Gold */}
          <div className="absolute top-[10%] left-[15%] w-2 h-2 rounded-full bg-accent/60 animate-float" />
          <div className="absolute top-[30%] left-[75%] w-2 h-2 rounded-full bg-m2m-gold-dark/60 animate-float" style={{ animationDelay: '1s', animationDuration: '8s' }} />
          <div className="absolute top-[60%] left-[25%] w-2 h-2 rounded-full bg-accent/60 animate-float" style={{ animationDelay: '2s', animationDuration: '10s' }} />
          <div className="absolute top-[80%] left-[80%] w-2 h-2 rounded-full bg-m2m-gold-dark/60 animate-float" style={{ animationDelay: '3s', animationDuration: '9s' }} />
          
          {/* Circuit-like lines - M2M Gold */}
          <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,200 Q200,100 400,200 T800,200" stroke="#FFCC00" strokeWidth="2" fill="none">
              <animate attributeName="stroke-dasharray" values="0,1000;1000,0" dur="6s" repeatCount="indefinite" />
            </path>
            <path d="M100,400 Q300,300 500,400 T900,400" stroke="#D4A700" strokeWidth="2" fill="none">
              <animate attributeName="stroke-dasharray" values="0,1000;1000,0" dur="7s" repeatCount="indefinite" />
            </path>
            <path d="M0,600 Q250,550 500,600 T1000,600" stroke="#FFCC00" strokeWidth="2" fill="none" opacity="0.6">
              <animate attributeName="stroke-dasharray" values="0,1000;1000,0" dur="8s" repeatCount="indefinite" />
            </path>
          </svg>

          {/* Data stream effect - M2M Gold */}
          <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-accent/30 to-transparent animate-data-stream" />
          <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-m2m-gold-dark/30 to-transparent animate-data-stream" style={{ animationDelay: '2s' }} />
        </div>

        {/* Branding Content */}
        <div className="relative z-10 text-center px-12">
          <img 
            src={m2mLogo} 
            alt="M2M Logo" 
            className="h-20 mx-auto mb-8"
          />
          <h1 className="text-4xl font-bold text-white mb-4">
            {t('auth.welcomeToAura')}
          </h1>
          <p className="text-lg text-white/70 max-w-md mx-auto">
            {t('landing.heroSubtitle')}
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <img 
              src={m2mLogo} 
              alt="M2M Logo" 
              className="h-16 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-foreground">{t('auth.welcomeToAura')}</h1>
          </div>

          <div className="lg:mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {isSignUp ? t('auth.createAccount') : t('auth.signInToAccount')}
            </h2>
            <p className="text-muted-foreground">
              {isSignUp ? t('auth.createYourAccountSubtitle') : t('auth.enterCredentials')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 mt-6">
            <div>
              <Label htmlFor="signin-email" className="text-sm font-semibold">{t('auth.emailAddress')}</Label>
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
              <Label htmlFor="signin-password" className="text-sm font-semibold">{t('auth.password')}</Label>
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
                {t('auth.minChars', { count: 6 })}
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold" 
              disabled={loading}
              size="lg"
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isSignUp ? t('auth.signUp') : t('auth.signIn')}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setPassword("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp 
                ? t('auth.alreadyHaveAccount')
                : t('auth.dontHaveAccount')}
            </button>
            
            {/* Landing page link */}
            <div className="pt-2 border-t border-border">
              <a 
                href="/twin-datacentre"
                className="text-sm text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
              >
                {t('auth.learnAboutTwin')} →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
