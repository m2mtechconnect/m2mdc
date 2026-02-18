import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { HelpCircle, Play, RefreshCw, BookOpen, Compass, Activity, Layers, Shield, Wrench, Users, UserCog } from 'lucide-react';
import { useTour } from '@/context/TourContext';
import { tourRegistry, TourId, tourRoutes } from '@/tours/tourRegistry';
import { useNavigate, useLocation } from 'react-router-dom';

const tourIcons: Record<TourId, React.ReactNode> = {
  studioIntro: <Compass className="h-4 w-4" />,
  overview: <BookOpen className="h-4 w-4" />,
  simulation: <Activity className="h-4 w-4" />,
  blueprint: <Layers className="h-4 w-4" />,
  role_executive: <UserCog className="h-4 w-4" />,
  role_manager: <Users className="h-4 w-4" />,
  role_engineer: <Wrench className="h-4 w-4" />,
  role_security_admin: <Shield className="h-4 w-4" />,
};

export function HelpMenu() {
  const { startTour, resetAllTours, isTourSeen } = useTour();
  const navigate = useNavigate();
  const location = useLocation();

  const handleStartTour = (tourId: TourId) => {
    const targetRoute = tourRoutes[tourId];
    const currentPath = location.pathname + location.search;
    
    // Navigate to the correct route if not already there
    if (currentPath !== targetRoute) {
      navigate(targetRoute);
      // Small delay to let the page render before starting tour
      setTimeout(() => startTour(tourId), 300);
    } else {
      startTour(tourId);
    }
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
              <span className="text-primary">
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
