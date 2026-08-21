/**
 * Enterprise Auth Layout
 * Full-screen split layout with animated background
 */

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AuraLogo } from '@/components/brand/AuraLogo';
import { BackgroundGrid } from './BackgroundGrid';

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding with animated background */}
      <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden items-center justify-center bg-gradient-to-br from-[#0A0F1F] via-[#131B2E] to-[#1A2637]">
        <BackgroundGrid />
        
        {/* Branding Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 text-center px-12 max-w-xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 flex justify-center"
          >
            <AuraLogo surface="dark" className="scale-125" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-4xl font-semibold text-white mb-3 tracking-tight"
          >
            Sovereign AI Twin Studio
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg text-white/60 leading-relaxed"
          >
            Enterprise-grade AI-assisted digital twin systems for sovereign data centre operations. 
            Build, simulate, and deploy intelligent digital twins.
          </motion.p>
          
          {/* Feature highlights */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-10 flex justify-center gap-8 text-sm text-white/40"
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-dc-green" />
              <span>Carbon Modelling</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <span>Data Residency Controls</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span>AI-Powered</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-6 sm:p-8 bg-background">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="mb-3 flex justify-center">
              <AuraLogo surface="light" />
            </div>
            <p className="text-sm text-muted-foreground">Sovereign AI Twin Studio</p>
          </div>

          {(title || subtitle) && (
            <div className="mb-8">
              {title && (
                <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-2 text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {children}
        </motion.div>
      </div>
    </div>
  );
}
