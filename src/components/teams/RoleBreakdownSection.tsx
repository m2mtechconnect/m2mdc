import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Crown, Shield, Wrench, BarChart3, TrendingUp, 
  Users, ShoppingCart, Headphones, DollarSign 
} from "lucide-react";

interface RoleBreakdownSectionProps {
  roleBreakdown: Record<string, number>;
  onRoleClick?: (role: string) => void;
}

const roleConfig = {
  executive: { 
    icon: Crown, 
    label: "Executive", 
    color: "text-primary border-primary",
    description: "Full platform access and strategic oversight"
  },
  manager: { 
    icon: Users, 
    label: "Manager", 
    color: "text-secondary border-secondary",
    description: "Team oversight, deployment, and workflow management"
  },
  engineer: { 
    icon: Wrench, 
    label: "Engineer / DevOps", 
    color: "text-muted-foreground border-muted-foreground",
    description: "Build, maintain, and optimize AI systems"
  },
  compliance: { 
    icon: Shield, 
    label: "Compliance Officer", 
    color: "text-green-600 border-green-600",
    description: "Audit trails, governance, and risk management"
  },
  data_analyst: { 
    icon: BarChart3, 
    label: "Data Analyst", 
    color: "text-blue-600 border-blue-600",
    description: "Analytics, reporting, and insights"
  },
  marketing: { 
    icon: TrendingUp, 
    label: "Marketing", 
    color: "text-purple-600 border-purple-600",
    description: "Campaign management and content automation"
  },
  sales: { 
    icon: ShoppingCart, 
    label: "Sales", 
    color: "text-orange-600 border-orange-600",
    description: "CRM integration and sales automation"
  },
  support: { 
    icon: Headphones, 
    label: "Support", 
    color: "text-cyan-600 border-cyan-600",
    description: "Customer assistance and ticketing systems"
  },
  finance: { 
    icon: DollarSign, 
    label: "Finance", 
    color: "text-emerald-600 border-emerald-600",
    description: "Financial operations and reporting"
  },
};

export default function RoleBreakdownSection({ roleBreakdown, onRoleClick }: RoleBreakdownSectionProps) {
  return (
    <TooltipProvider>
      <Card className="glass-panel p-6">
        <h2 className="text-2xl font-display font-bold mb-6">Roles Overview</h2>
        <div className="space-y-3">
          {Object.entries(roleConfig).map(([roleKey, config]) => {
            const Icon = config.icon;
            const count = roleBreakdown[roleKey] || 0;
            
            return (
              <Tooltip key={roleKey}>
                <TooltipTrigger asChild>
                  <div
                    className="p-4 rounded-lg border border-border hover:border-secondary/50 transition-smooth cursor-pointer"
                    onClick={() => onRoleClick?.(roleKey)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${config.color} bg-background`}>
                          <Icon className={`h-5 w-5 ${config.color.split(' ')[0]}`} />
                        </div>
                        <div>
                          <div className="font-semibold">{config.label}</div>
                          <div className="text-xs text-muted-foreground">{config.description}</div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-lg font-bold px-4 py-2">
                        {count}
                      </Badge>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Click to filter members by this role
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </Card>
    </TooltipProvider>
  );
}
