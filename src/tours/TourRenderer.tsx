import Joyride, { CallBackProps, STATUS, EVENTS, ACTIONS, Step } from 'react-joyride';
import { useTour } from '@/context/TourContext';
import { tourRegistry } from './tourRegistry';
import { useMemo } from 'react';

// Filter out steps with missing targets for graceful degradation
function filterValidSteps(steps: Step[]): Step[] {
  return steps.filter((step) => {
    if (typeof step.target === 'string') {
      const element = document.querySelector(step.target);
      return element !== null;
    }
    return true;
  });
}

export function TourRenderer() {
  const { activeTourId, setActiveTourId, completeTour, stepIndex, setStepIndex } = useTour();

  const handleCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;

    // Handle step navigation
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        setStepIndex(index + 1);
      } else if (action === ACTIONS.PREV) {
        setStepIndex(index - 1);
      }
    }

    // Handle tour completion or skip
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      if (activeTourId) {
        completeTour(activeTourId);
      }
      setActiveTourId(null);
      setStepIndex(0);
    }

    // Handle close button
    if (action === ACTIONS.CLOSE) {
      if (activeTourId) {
        completeTour(activeTourId);
      }
      setActiveTourId(null);
      setStepIndex(0);
    }
  };

  // Filter steps based on available targets (responsive safety)
  const validSteps = useMemo(() => {
    if (!activeTourId) return [];
    const tour = tourRegistry[activeTourId];
    if (!tour) return [];
    return filterValidSteps(tour.steps);
  }, [activeTourId]);

  if (!activeTourId) return null;

  const tour = tourRegistry[activeTourId];
  if (!tour || validSteps.length === 0) return null;

  return (
    <Joyride
      steps={validSteps}
      run={true}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableOverlayClose
      spotlightClicks
      callback={handleCallback}
      styles={{
        options: {
          arrowColor: 'hsl(var(--card))',
          backgroundColor: 'hsl(var(--card))',
          overlayColor: 'rgba(0, 0, 0, 0.7)',
          primaryColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--foreground))',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '420px',
          padding: '20px',
        },
        tooltipTitle: {
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '8px',
          color: 'hsl(var(--foreground))',
        },
        tooltipContent: {
          fontSize: '14px',
          lineHeight: 1.6,
          color: 'hsl(var(--muted-foreground))',
          padding: '8px 0',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          borderRadius: '8px',
          color: 'hsl(var(--primary-foreground))',
          fontSize: '14px',
          fontWeight: 500,
          padding: '8px 16px',
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
          fontSize: '14px',
          marginRight: '8px',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
          fontSize: '13px',
        },
        buttonClose: {
          color: 'hsl(var(--muted-foreground))',
        },
        spotlight: {
          borderRadius: '8px',
        },
        tooltipFooter: {
          marginTop: '16px',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Skip tour',
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
}
