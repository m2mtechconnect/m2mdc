import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { logger } from '@/lib/logger';
import { handleError } from '@/lib/errorHandlers';

interface TourStep {
  target: string; // CSS selector
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface GuidedTourProps {
  tourId: string;
  steps: TourStep[];
  onComplete?: () => void;
}

export const GuidedTour = ({ tourId, steps, onComplete }: GuidedTourProps) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    try {
      // Check if user has seen this tour
      const hasSeenTour = localStorage.getItem(`tour-completed-${tourId}`);
      if (!hasSeenTour && steps.length > 0) {
        // Delay tour start slightly for better UX
        const timer = setTimeout(() => setIsActive(true), 1000);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      handleError(error, {
        component: 'GuidedTour',
        action: 'useEffect',
        fallbackMessage: 'Failed to check tour status'
      });
    }
  }, [tourId, steps.length]);

  useEffect(() => {
    if (!isActive || steps.length === 0 || !steps[currentStep]) return;

    const updatePosition = () => {
      const step = steps[currentStep];
      if (!step || !step.target) return;
      
      const element = document.querySelector(step.target);
      
      if (!element) {
        logger.warn(`Tour target not found: ${step.target}`, { component: 'GuidedTour', action: 'updatePosition' });
        return;
      }

      const rect = element.getBoundingClientRect();
      const cardWidth = 360;
      const cardHeight = 200;
      const offset = 20;

      let top = 0;
      let left = 0;

      switch (step.position || 'bottom') {
        case 'top':
          top = rect.top - cardHeight - offset;
          left = rect.left + rect.width / 2 - cardWidth / 2;
          break;
        case 'bottom':
          top = rect.bottom + offset;
          left = rect.left + rect.width / 2 - cardWidth / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - cardHeight / 2;
          left = rect.left - cardWidth - offset;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - cardHeight / 2;
          left = rect.right + offset;
          break;
      }

      // Keep within viewport
      top = Math.max(20, Math.min(window.innerHeight - cardHeight - 20, top));
      left = Math.max(20, Math.min(window.innerWidth - cardWidth - 20, left));

      setPosition({ top, left });

      // Highlight element
      element.classList.add('tour-highlight');
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      const step = steps[currentStep];
      if (step) {
        const element = document.querySelector(step.target);
        if (element) {
          element.classList.remove('tour-highlight');
        }
      }
    };
  }, [isActive, currentStep, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    try {
      localStorage.setItem(`tour-completed-${tourId}`, 'true');
    } catch (error) {
      handleError(error, {
        component: 'GuidedTour',
        action: 'handleComplete',
        fallbackMessage: 'Failed to save tour completion'
      });
    }
    setIsActive(false);
    onComplete?.();
  };

  const handleSkip = () => {
    try {
      localStorage.setItem(`tour-completed-${tourId}`, 'true');
    } catch (error) {
      handleError(error, {
        component: 'GuidedTour',
        action: 'handleSkip',
        fallbackMessage: 'Failed to save tour skip'
      });
    }
    setIsActive(false);
  };

  if (!isActive || steps.length === 0) return null;

  const step = steps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]" />

      {/* Tour Card */}
      <Card
        className="fixed z-[101] w-[360px] shadow-2xl border-2 border-primary animate-in fade-in"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{step.title}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>{step.description}</CardDescription>
        </CardHeader>

        <CardFooter className="flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-smooth ${
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {currentStep < steps.length - 1 ? (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              ) : (
                'Finish'
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 102;
          box-shadow: 0 0 0 4px hsl(var(--primary)), 0 0 0 8px hsl(var(--primary) / 0.3);
          border-radius: 8px;
          transition: box-shadow 0.3s ease;
        }
      `}</style>
    </>
  );
};
