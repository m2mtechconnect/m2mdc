import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { HelpCircle, Play, RefreshCw, BookOpen, Compass, Activity, Layers } from 'lucide-react';
import { useTour } from '@/context/TourContext';
import { tourRegistry, TourId } from '@/tours/tourRegistry';

const tourIcons: Record<TourId, React.ReactNode> = {
  studioIntro: <Compass className="h-4 w-4" />,
  overview: <BookOpen className="h-4 w-4" />,
  simulation: <Activity className="h-4 w-4" />,
  blueprint: <Layers className="h-4 w-4" />,
};

export function HelpMenu() {
  const { startTour, resetAllTours, isTourSeen } = useTour();

  const handleStartTour = (tourId: TourId) => {
    startTour(tourId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          data-tour="help-menu"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Help</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Guided Tours</DropdownMenuLabel>
        
        {(Object.keys(tourRegistry) as TourId[]).map((tourId) => {
          const tour = tourRegistry[tourId];
          const seen = isTourSeen(tourId);
          
          return (
            <DropdownMenuItem
              key={tourId}
              onClick={() => handleStartTour(tourId)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <span className="text-muted-foreground">
                {tourIcons[tourId]}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span>{tour.name}</span>
                  {seen && (
                    <span className="text-xs text-muted-foreground">✓</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {tour.description}
                </p>
              </div>
              <Play className="h-3 w-3 text-muted-foreground" />
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={resetAllTours}
          className="flex items-center gap-3 cursor-pointer text-muted-foreground"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Restart all tours</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
