/**
 * Thermal Heatmap Tile
 * Individual rack tile with gradient color and airflow vector
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { RackWithAisle } from './ThermalHeatmapUtils';
import { getTempColorHSL } from './ThermalHeatmapUtils';
import { ThermalRackTooltip } from './ThermalRackTooltip';

interface ThermalHeatmapTileProps {
  rack: RackWithAisle;
  showAirflow?: boolean;
  onClick?: () => void;
}

export function ThermalHeatmapTile({ rack, showAirflow = true, onClick }: ThermalHeatmapTileProps) {
  const [isHovered, setIsHovered] = useState(false);
  const bgColor = getTempColorHSL(rack.inletTempC);
  
  // Airflow direction based on aisle type
  const airflowDirection = rack.aisleType === 'cold' ? 0 : 180;
  
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            className="relative aspect-square rounded-lg cursor-pointer overflow-hidden"
            style={{ backgroundColor: bgColor }}
            whileHover={{ scale: 1.05 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={onClick}
          >
            {/* Temperature display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <span className="text-xs font-mono font-bold drop-shadow-lg">
                {rack.inletTempC.toFixed(0)}°
              </span>
              <span className="text-[9px] font-mono opacity-80 drop-shadow">
                {rack.name.replace('Rack ', '')}
              </span>
            </div>
            
            {/* Airflow vector overlay */}
            {showAirflow && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                initial={{ opacity: 0.2 }}
                animate={{ opacity: isHovered ? 0.6 : 0.25 }}
              >
                <motion.div
                  style={{ rotate: airflowDirection }}
                  animate={{
                    x: [0, 4, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <ArrowRight className="h-4 w-4 text-white drop-shadow-lg" />
                </motion.div>
              </motion.div>
            )}
            
            {/* Hotspot indicator */}
            {rack.hotspotRisk > 30 && (
              <motion.div
                className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-400"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
            
            {/* Aisle indicator */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${rack.aisleType === 'cold' ? 'bg-blue-400/50' : 'bg-red-400/50'}`} />
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="p-0 bg-transparent border-0">
          <ThermalRackTooltip rack={rack} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
