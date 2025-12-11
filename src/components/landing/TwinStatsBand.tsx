/**
 * TwinStatsBand - Full-width metrics/ROI band
 * Inspired by Monday.com's flip cards with testimonials and impactful metrics
 * Uses M2M brand design tokens from index.css
 */

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Zap, Leaf, Clock, Quote } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface StatCard {
  icon: typeof TrendingUp;
  value: string;
  label: string;
  colorClass: string;
  bgClass: string;
  testimonial?: {
    quote: string;
    author: string;
    role: string;
  };
}

const stats: StatCard[] = [
  {
    icon: TrendingUp,
    value: "18–24%",
    label: "ROI Impact",
    colorClass: "text-success",
    bgClass: "bg-success/10 group-hover:bg-success/20",
    testimonial: {
      quote: "The twin simulation helped us identify $2.4M in potential savings before we broke ground.",
      author: "VP Infrastructure",
      role: "Major Canadian Bank",
    },
  },
  {
    icon: Zap,
    value: "30–50%",
    label: "Energy Savings",
    colorClass: "text-warning",
    bgClass: "bg-warning/10 group-hover:bg-warning/20",
    testimonial: {
      quote: "We reduced our cooling costs by 42% in the first quarter after implementing recommendations.",
      author: "DC Operations Lead",
      role: "Enterprise Retailer",
    },
  },
  {
    icon: Leaf,
    value: "70%+",
    label: "Renewable Mix",
    colorClass: "text-success",
    bgClass: "bg-success/10 group-hover:bg-success/20",
    testimonial: {
      quote: "The carbon modeling gave us confidence to commit to net-zero by 2030.",
      author: "Chief Sustainability Officer",
      role: "Global Technology Co",
    },
  },
  {
    icon: Clock,
    value: "6,970",
    label: "Hours Saved Monthly",
    colorClass: "text-info",
    bgClass: "bg-info/10 group-hover:bg-info/20",
    testimonial: {
      quote: "Our team now focuses on strategy instead of manual reporting. It's a game changer.",
      author: "Director of Operations",
      role: "Hyperscale Provider",
    },
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 } as const,
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5 },
  },
};

function FlipCard({ stat, index }: { stat: StatCard; index: number }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.div 
      variants={cardVariants}
      className="perspective-1000"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <motion.div
        className="relative w-full h-[200px] cursor-pointer preserve-3d transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front face - Metric */}
        <Card 
          className="absolute inset-0 backface-hidden bg-card/60 border-border/50 hover:border-primary/40 transition-all duration-300 group"
          style={{ backfaceVisibility: "hidden" }}
        >
          <CardContent className="h-full flex flex-col items-center justify-center p-6 text-center">
            <motion.div 
              className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${stat.bgClass} mb-4 transition-colors`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              <stat.icon className={`h-7 w-7 ${stat.colorClass}`} />
            </motion.div>
            <motion.div 
              className={`text-4xl lg:text-5xl font-bold mb-2 ${stat.colorClass}`}
              initial={{ scale: 0.5, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ 
                duration: 0.5, 
                delay: 0.3 + index * 0.1,
                type: "spring",
                stiffness: 200
              }}
            >
              {stat.value}
            </motion.div>
            <div className="text-sm text-muted-foreground font-medium">
              {stat.label}
            </div>
            {stat.testimonial && (
              <div className="mt-3 text-xs text-muted-foreground/60">
                Hover to see testimonial
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back face - Testimonial */}
        {stat.testimonial && (
          <Card 
            className="absolute inset-0 backface-hidden bg-gradient-to-br from-primary/10 via-card to-card border-primary/30"
            style={{ 
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <CardContent className="h-full flex flex-col justify-center p-5">
              <Quote className="h-6 w-6 text-primary/40 mb-2" />
              <p className="text-sm text-foreground leading-relaxed mb-4 line-clamp-4">
                "{stat.testimonial.quote}"
              </p>
              <div className="mt-auto">
                <div className="text-sm font-semibold text-foreground">
                  {stat.testimonial.author}
                </div>
                <div className="text-xs text-muted-foreground">
                  {stat.testimonial.role}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}

export function TwinStatsBand() {
  return (
    <section className="relative py-20 border-y border-border/30 overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-muted/30 via-background to-muted/30" />
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.02]" />
      
      <div className="relative max-w-6xl mx-auto px-4 lg:px-8">
        <motion.div 
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-block mb-4"
          >
            <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Measurable Results
            </span>
          </motion.div>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Real Impact on Your Operations
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Organizations using our platform see measurable improvements across efficiency, 
            sustainability, and cost metrics.
          </p>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {stats.map((stat, index) => (
            <FlipCard key={index} stat={stat} index={index} />
          ))}
        </motion.div>

        {/* Bottom trust indicator */}
        <motion.div 
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <p className="text-sm text-muted-foreground">
            Based on customer-reported metrics from production deployments
          </p>
        </motion.div>
      </div>
    </section>
  );
}
