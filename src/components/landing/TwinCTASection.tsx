/**
 * TwinCTASection - Bottom CTA section
 * M2M Tech brand styling with Space Grotesk display font
 * Uses M2M brand design tokens from index.css
 */

import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, Sparkles, Shield, Leaf, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const benefits = [
  "No credit card required",
  "Enterprise pricing available", 
  "Deploy in days, not months",
];

export function TwinCTASection() {
  const navigate = useNavigate();

  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/50 via-muted/30 to-background" />
      
      {/* Animated background elements */}
      <motion.div 
        className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary/8 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.08, 0.12, 0.08]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-success/6 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.06, 0.1, 0.06]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
      
      <div className="relative max-w-5xl mx-auto px-4 lg:px-8">
        {/* Main CTA card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-card/60 backdrop-blur-sm rounded-3xl border border-border/50 p-8 lg:p-12 shadow-xl"
        >
          <div className="text-center max-w-3xl mx-auto">
            {/* Decorative line */}
            <motion.div 
              className="w-16 h-1 bg-gradient-to-r from-primary to-success mx-auto mb-8 rounded-full"
              initial={{ width: 0, opacity: 0 }}
              whileInView={{ width: 64, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            />
            
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-6">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">Start your journey today</span>
              </span>
            </motion.div>
            
            {/* Headline */}
            <motion.h2 
              className="font-display text-3xl lg:text-5xl font-bold text-foreground mb-4 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Ready to Build Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-success">
                Sovereign AI Data Centre Twin
              </span>
              ?
            </motion.h2>
            
            <motion.p 
              className="text-lg lg:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Get a personalized demo and see your environment modeled with real-time 
              simulation, carbon tracking, and sovereignty scoring.
            </motion.p>
            
            {/* CTA buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row justify-center gap-4 mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Button 
                  size="lg" 
                  className="text-base px-10 h-14 group shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-shadow"
                  onClick={() => navigate("/contact")}
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-base px-10 h-14 border-border text-foreground hover:bg-muted"
                  asChild
                >
                  <a href="mailto:info@m2mtechconnect.com">
                    <Mail className="mr-2 h-5 w-5" />
                    Talk to Our Team
                  </a>
                </Button>
              </motion.div>
            </motion.div>
            
            {/* Benefits row */}
            <motion.div 
              className="flex flex-wrap justify-center gap-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              {benefits.map((benefit, index) => (
                <motion.div 
                  key={benefit}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                >
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>{benefit}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom trust indicators - Deloitte style */}
        <motion.div 
          className="mt-12 pt-8 border-t border-border/30"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span>SOC 2 Type II Compliant</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-success" />
              <span>Carbon Neutral Infrastructure</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <span>🇨🇦</span>
              <span>Canadian Data Sovereignty</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
