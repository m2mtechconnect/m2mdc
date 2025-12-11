/**
 * TwinFeatureSection - Reusable feature section with image and bullets
 * Uses M2M brand design tokens from index.css
 */

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TwinFeatureSectionProps {
  title: string;
  subtitle: string;
  bullets: string[];
  imageSrc: string;
  imageAlt: string;
  flip?: boolean;
}

const bulletVariants = {
  hidden: { opacity: 0, x: -20 } as const,
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.3 + i * 0.1,
      duration: 0.4,
    },
  }),
};

export function TwinFeatureSection({
  title,
  subtitle,
  bullets,
  imageSrc,
  imageAlt,
  flip = false,
}: TwinFeatureSectionProps) {
  return (
    <section className="py-16 lg:py-24 overflow-hidden bg-background">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <div className={cn(
          "grid lg:grid-cols-2 gap-12 lg:gap-16 items-center",
          flip && "lg:flex-row-reverse"
        )}>
          {/* Text content */}
          <motion.div 
            className={cn("space-y-6", flip && "lg:order-2")}
            initial={{ opacity: 0, x: flip ? 50 : -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="space-y-4">
              <motion.h2 
                className="text-3xl lg:text-4xl font-bold text-foreground"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {title}
              </motion.h2>
              <motion.p 
                className="text-lg text-muted-foreground"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {subtitle}
              </motion.p>
            </div>
            
            <ul className="space-y-3">
              {bullets.map((bullet, index) => (
                <motion.li 
                  key={index} 
                  className="flex items-start gap-3"
                  custom={index}
                  variants={bulletVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <motion.div 
                    className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center"
                    whileHover={{ scale: 1.2, backgroundColor: "hsl(var(--primary) / 0.4)" }}
                    transition={{ duration: 0.2 }}
                  >
                    <Check className="h-3 w-3 text-primary" />
                  </motion.div>
                  <span className="text-muted-foreground">{bullet}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Image */}
          <motion.div 
            className={cn("relative group", flip && "lg:order-1")}
            initial={{ opacity: 0, x: flip ? -50 : 50, scale: 0.95 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <motion.div 
              className="relative bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-3 shadow-xl overflow-hidden"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="aspect-[16/10] bg-gradient-to-br from-muted to-background rounded-lg overflow-hidden">
                <motion.img 
                  src={imageSrc} 
                  alt={imageAlt}
                  className="w-full h-full object-cover"
                  initial={{ scale: 1.1 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {/* Subtle overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent" />
              </div>
              
              {/* Glow effect on hover */}
              <motion.div 
                className="absolute inset-0 bg-primary/5 rounded-2xl pointer-events-none"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
            
            {/* Decorative elements */}
            <motion.div 
              className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-primary/10 rounded-full blur-3xl"
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.1, 0.15, 0.1]
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
