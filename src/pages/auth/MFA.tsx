/**
 * MFA Verification Page
 * 6-digit code input with timer and resend
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Shield, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { AuthLayout, SecurityBadge } from "@/components/auth";

export default function MFA() {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === 5 && newCode.every(d => d)) {
      handleSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (fullCode?: string) => {
    const verificationCode = fullCode || code.join('');
    
    if (verificationCode.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // TODO: Integrate with actual MFA verification
      // For now, simulate verification
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate success
      toast.success("Verification successful!");
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    setCanResend(false);
    setResendTimer(30);
    
    // TODO: Integrate with actual resend logic
    toast.success("New code sent to your device");
  };

  return (
    <AuthLayout
      title="Two-Factor Authentication"
      subtitle="Enter the 6-digit code from your authenticator app"
    >
      <div className="space-y-6">
        {/* Security Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Code Input */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-center block">
            Verification Code
          </Label>
          <div className="flex justify-center gap-2">
            {code.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                disabled={loading}
                className="w-12 h-14 text-center text-xl font-semibold transition-shadow focus:ring-2 focus:ring-primary/20"
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <Button 
          onClick={() => handleSubmit()}
          className="w-full h-12 text-base font-medium" 
          disabled={loading || code.some(d => !d)}
        >
          {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Verify
        </Button>

        {/* Resend Code */}
        <div className="text-center">
          {canResend ? (
            <button
              onClick={handleResend}
              className="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Resend code
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Resend code in {resendTimer}s
            </p>
          )}
        </div>

        {/* Alternative Options */}
        <div className="text-center space-y-2 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Having trouble?{" "}
            <a href="mailto:support@m2m.ai" className="text-primary hover:underline">
              Contact support
            </a>
          </p>
        </div>

        {/* Security Badge */}
        <SecurityBadge variant="minimal" />
      </div>
    </AuthLayout>
  );
}
