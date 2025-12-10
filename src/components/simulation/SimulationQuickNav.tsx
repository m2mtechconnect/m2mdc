/**
 * Simulation Quick Nav - Sticky left-side mini navigation
 * Only visible during active simulation
 */

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Activity, Thermometer, Wind, Zap, Network, 
  Shield, DollarSign, BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SimulationQuickNavProps {
  isVisible: boolean;
  activeSection: string;
  onNavigate: (section: string) => void;
}

const navItems = [
  { id: 'kpis', label: 'Live KPIs', icon: Activity, color: 'text-primary' },
  { id: 'thermal', label: 'Thermal', icon: Thermometer, color: 'text-destructive' },
  { id: 'cooling', label: 'Cooling', icon: Wind, color: 'text-info' },
  { id: 'power', label: 'Power', icon: Zap, color: 'text-warning' },
  { id: 'network', label: 'Network', icon: Network, color: 'text-purple-500' },
  { id: 'sovereignty', label: 'Sovereignty', icon: Shield, color: 'text-accent' },
  { id: 'carbon', label: 'Carbon & Cost', icon: DollarSign, color: 'text-success' },
];

export const SimulationQuickNav = memo(function SimulationQuickNav({
  isVisible,
  activeSection,
  onNavigate
}: SimulationQuickNavProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-40"
        >
          <TooltipProvider delayDuration={200}>
            <div className="flex flex-col gap-2 p-2 bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={isActive ? 'default' : 'ghost'}
                          size="icon"
                          className={cn(
                            'h-10 w-10 transition-all',
                            isActive && 'ring-2 ring-primary/30'
                          )}
                          onClick={() => onNavigate(item.id)}
                        >
                          <Icon className={cn('h-5 w-5', !isActive && item.color)} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>
                );
              })}
              
              <div className="h-px bg-border my-1" />
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => onNavigate('charts')}
                  >
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  KPI Charts
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
