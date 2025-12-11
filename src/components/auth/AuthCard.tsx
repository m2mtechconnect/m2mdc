/**
 * Enterprise Auth Card
 * Glass-morphism card with subtle animations
 */

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AuthCardProps {
  children: ReactNode;
  className?: string;
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-xl p-6 sm:p-8",
        "bg-card/80 dark:bg-card/60",
        "backdrop-blur-sm",
        "border border-border/50",
        "shadow-[0_4px_24px_-4px_rgba(0,0,0,0.1),0_8px_48px_-8px_rgba(0,0,0,0.05)]",
        "dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.3),0_8px_48px_-8px_rgba(0,0,0,0.2)]",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
