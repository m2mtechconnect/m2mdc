/**
 * StudioScreenshot - Reusable component for displaying Studio UI screenshots
 * Handles responsive variants, lazy loading, and fallbacks
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { studioScreenshots, getScreenshot, type ScreenshotVariants } from '@/data/studioScreenshots';

interface StudioScreenshotProps {
  screenshotKey: keyof typeof studioScreenshots;
  className?: string;
  showTitle?: boolean;
  priority?: boolean;
  aspectRatio?: 'video' | 'square' | 'wide' | 'auto';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  border?: boolean;
  hoverEffect?: boolean;
}

export function StudioScreenshot({
  screenshotKey,
  className,
  showTitle = false,
  priority = false,
  aspectRatio = 'video',
  rounded = '2xl',
  shadow = 'xl',
  border = true,
  hoverEffect = true,
}: StudioScreenshotProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');

  const screenshot = studioScreenshots[screenshotKey];

  useEffect(() => {
    if (screenshot) {
      // Determine which variant to use based on viewport
      const getResponsiveVariant = (): 'desktop' | 'tablet' | 'mobile' => {
        if (typeof window === 'undefined') return 'desktop';
        const width = window.innerWidth;
        if (width < 640) return 'mobile';
        if (width < 1024) return 'tablet';
        return 'desktop';
      };

      const variant = getResponsiveVariant();
      setCurrentSrc(getScreenshot(screenshotKey, variant));
    }
  }, [screenshotKey, screenshot]);

  if (!screenshot) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-muted/50 text-muted-foreground',
        getAspectClass(aspectRatio),
        getRoundedClass(rounded),
        className
      )}>
        <span className="text-sm">Screenshot unavailable</span>
      </div>
    );
  }

  const aspectClass = getAspectClass(aspectRatio);
  const roundedClass = getRoundedClass(rounded);
  const shadowClass = getShadowClass(shadow);

  return (
    <figure className={cn('relative overflow-hidden group', className)}>
      {/* Loading skeleton */}
      {!isLoaded && !hasError && (
        <div className={cn(
          'absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse',
          roundedClass
        )} />
      )}

      {/* Main image */}
      <picture>
        {/* WebP sources for modern browsers */}
        <source
          media="(max-width: 639px)"
          srcSet={screenshot.mobile || screenshot.desktop}
          type="image/webp"
        />
        <source
          media="(max-width: 1023px)"
          srcSet={screenshot.tablet || screenshot.desktop}
          type="image/webp"
        />
        <source
          media="(min-width: 1024px)"
          srcSet={screenshot.desktop}
          type="image/webp"
        />
        
        <img
          src={hasError ? '/placeholder.svg' : currentSrc || screenshot.desktop}
          alt={screenshot.alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            setIsLoaded(true);
          }}
          className={cn(
            'w-full h-full object-cover transition-all duration-500',
            aspectClass,
            roundedClass,
            shadowClass,
            border && 'border border-border/30',
            hoverEffect && 'group-hover:scale-[1.02] group-hover:shadow-2xl',
            !isLoaded && 'opacity-0',
            isLoaded && 'opacity-100'
          )}
        />
      </picture>

      {/* Gradient overlay for depth */}
      <div className={cn(
        'absolute inset-0 pointer-events-none',
        'bg-gradient-to-t from-background/20 via-transparent to-transparent',
        roundedClass
      )} />

      {/* Title overlay */}
      {showTitle && (
        <figcaption className={cn(
          'absolute bottom-0 left-0 right-0 p-4',
          'bg-gradient-to-t from-background/90 to-transparent',
          rounded !== 'none' && 'rounded-b-2xl'
        )}>
          <span className="text-sm font-medium text-foreground">
            {screenshot.title}
          </span>
        </figcaption>
      )}
    </figure>
  );
}

// Helper functions for class generation
function getAspectClass(aspect: string): string {
  switch (aspect) {
    case 'video': return 'aspect-video';
    case 'square': return 'aspect-square';
    case 'wide': return 'aspect-[21/9]';
    case 'auto': return '';
    default: return 'aspect-video';
  }
}

function getRoundedClass(rounded: string): string {
  switch (rounded) {
    case 'none': return 'rounded-none';
    case 'sm': return 'rounded-sm';
    case 'md': return 'rounded-md';
    case 'lg': return 'rounded-lg';
    case 'xl': return 'rounded-xl';
    case '2xl': return 'rounded-2xl';
    default: return 'rounded-2xl';
  }
}

function getShadowClass(shadow: string): string {
  switch (shadow) {
    case 'none': return 'shadow-none';
    case 'sm': return 'shadow-sm';
    case 'md': return 'shadow-md';
    case 'lg': return 'shadow-lg';
    case 'xl': return 'shadow-xl';
    case '2xl': return 'shadow-2xl';
    default: return 'shadow-xl';
  }
}

export default StudioScreenshot;
