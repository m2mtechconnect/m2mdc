/**
 * TwinFeatureSection - Reusable feature section with image and bullets
 * M2M Tech brand styling with Space Grotesk display font
 * Uses M2M brand design tokens from index.css
 */

import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { screenshotManifest } from "@/data/studioScreenshots";

interface TwinFeatureSectionProps {
  title: string;
  subtitle: string;
  bullets: string[];
  imageSrc: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
  flip?: boolean;
  accentColor?: "primary" | "success" | "info" | "warning";
  cta?: {
    label: string;
    href: string;
  };
}

const colorMap = {
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  info: "text-info bg-info/10",
  warning: "text-warning bg-warning/10",
};

const bulletVariants = {
  hidden: { opacity: 0, x: -20 } as const,
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.3 + i * 0.08,
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
  imageWidth,
  imageHeight,
  flip = false,
  accentColor = "primary",
  cta,
}: TwinFeatureSectionProps) {
  const colors = colorMap[accentColor];
  const [textColor, bgColor] = colors.split(" ");

  // Cache-bust marketing screenshots so updates propagate immediately.
  const resolvedImageSrc = imageSrc.includes('/landing/screenshots/')
    ? `${imageSrc}?v=${encodeURIComponent(screenshotManifest.version)}`
    : imageSrc;

  return (
    <section className="py-20 lg:py-28 overflow-hidden bg-background">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className={cn(
          "grid lg:grid-cols-12 gap-12 lg:gap-20 items-center",
        )}>
          {/* Text content - 5 columns */}
          <motion.div 
            className={cn("lg:col-span-5 space-y-6", flip && "lg:order-2")}
            initial={{ opacity: 0, x: flip ? 40 : -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="space-y-4">
              {/* Section indicator line */}
              <motion.div 
                className={`w-12 h-1 rounded-full ${bgColor.replace('/10', '/60')}`}
                initial={{ width: 0 }}
                whileInView={{ width: 48 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
              />
              
              <motion.h2 
                className="font-display text-3xl lg:text-4xl font-bold text-foreground leading-tight"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {title}
              </motion.h2>
              <motion.p 
                className="text-lg text-muted-foreground leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {subtitle}
              </motion.p>
            </div>
            
            <ul className="space-y-4">
              {bullets.map((bullet, index) => (
                <motion.li 
                  key={index} 
                  className="flex items-start gap-3 group"
                  custom={index}
                  variants={bulletVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <motion.div 
                    className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-lg ${bgColor} flex items-center justify-center transition-all group-hover:scale-110`}
                    whileHover={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.3 }}
                  >
                    <Check className={`h-3.5 w-3.5 ${textColor}`} />
                  </motion.div>
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                    {bullet}
                  </span>
                </motion.li>
              ))}
            </ul>

            {cta && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <Button 
                  variant="outline" 
                  className="group border-border hover:border-primary/50"
                  asChild
                >
                  <a href={cta.href}>
                    {cta.label}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
              </motion.div>
            )}
          </motion.div>

          {/* Image - 7 columns */}
          <motion.div 
            className={cn("lg:col-span-7 relative", flip && "lg:order-1")}
            initial={{ opacity: 0, x: flip ? -40 : 40, scale: 0.98 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            {/* Decorative background glow */}
            <motion.div 
              className={`absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 rounded-full blur-3xl ${bgColor.replace('/10', '/5')}`}
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />

            <motion.div 
              className="relative bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-sm rounded-2xl border border-border/40 p-3 shadow-2xl shadow-black/5 overflow-hidden"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.4 }}
            >
              {/* Accent border highlight */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${bgColor.replace('/10', '/50')} rounded-t-2xl`} />
              
              <div className="aspect-[16/10] bg-gradient-to-br from-muted/80 via-muted/50 to-background rounded-xl overflow-hidden relative">
                <motion.img 
                  src={resolvedImageSrc} 
                  alt={imageAlt}
                  width={imageWidth}
                  height={imageHeight}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                  initial={{ scale: 1.05 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
