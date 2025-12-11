/**
 * TwinFeatureSection - Reusable feature section with image and bullets
 */

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TwinFeatureSectionProps {
  title: string;
  subtitle: string;
  bullets: string[];
  imageSrc: string;
  imageAlt: string;
  flip?: boolean;
}

export function TwinFeatureSection({
  title,
  subtitle,
  bullets,
  imageSrc,
  imageAlt,
  flip = false,
}: TwinFeatureSectionProps) {
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <div className={cn(
          "grid lg:grid-cols-2 gap-12 lg:gap-16 items-center",
          flip && "lg:flex-row-reverse"
        )}>
          {/* Text content */}
          <div className={cn("space-y-6", flip && "lg:order-2")}>
            <div className="space-y-4">
              <h2 className="text-3xl lg:text-4xl font-bold text-white">
                {title}
              </h2>
              <p className="text-lg text-slate-400">
                {subtitle}
              </p>
            </div>
            
            <ul className="space-y-3">
              {bullets.map((bullet, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-slate-300">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Image */}
          <div className={cn(
            "relative group",
            flip && "lg:order-1"
          )}>
            <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-3 shadow-xl overflow-hidden transition-transform group-hover:scale-[1.02]">
              <div className="aspect-[16/10] bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden">
                <img 
                  src={imageSrc} 
                  alt={imageAlt}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Show placeholder gradient if image not found
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {/* Subtle overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" />
              </div>
              
              {/* Glow effect */}
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-primary/10 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
