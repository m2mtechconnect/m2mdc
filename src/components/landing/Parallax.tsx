/**
 * Parallax - scroll-linked depth for marketing surfaces.
 *
 * Vertical translation only (never horizontal) so the page can never
 * overflow sideways. Fully disabled when the user prefers reduced motion.
 */

import { ReactNode, useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface ParallaxProps {
  children: ReactNode;
  /** Total travel in pixels across the viewport pass. */
  distance?: number;
  className?: string;
}

export function Parallax({ children, distance = 40, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const raw = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const y = useSpring(raw, { stiffness: 120, damping: 30, mass: 0.4 });

  return (
    <div ref={ref} className={className}>
      <motion.div style={prefersReducedMotion ? undefined : { y }} className="h-full w-full">
        {children}
      </motion.div>
    </div>
  );
}

interface ParallaxImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  /** Wrapper classes; should define the visible frame (aspect ratio etc.). */
  containerClassName?: string;
  imgClassName?: string;
  distance?: number;
  onError?: React.ReactEventHandler<HTMLImageElement>;
}

export function ParallaxImage({
  src,
  alt,
  width,
  height,
  containerClassName,
  imgClassName,
  distance = 28,
  onError,
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const raw = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const y = useSpring(raw, { stiffness: 120, damping: 30, mass: 0.4 });

  return (
    <div ref={ref} className={cn("marketing-image-frame relative overflow-hidden", containerClassName)}>
      <motion.img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        onError={onError}
        style={prefersReducedMotion ? undefined : { y }}
        className={cn(
          "marketing-image absolute inset-0 h-[calc(100%+var(--parallax-overscan,4rem))] w-full object-cover object-top",
          imgClassName,
        )}
      />
    </div>
  );
}
