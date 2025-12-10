/**
 * DataCentreSelector - Global Twin Selection Dropdown
 * Appears in the top navigation for switching between data centre twins
 */

import { useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Building2, 
  Plus, 
  MapPin, 
  Zap, 
  Leaf,
  Shield,
  Loader2
} from 'lucide-react';
import { useTwinContext } from '@/contexts/TwinContext';
import { CANADIAN_REGIONS, getRegionByCode, getRegionCarbonClass } from '@/data/regions';
import { useToast } from '@/hooks/use-toast';

export function DataCentreSelector() {
  const { 
    twinId, 
    setTwinId, 
    twins, 
    twin, 
    isLoading, 
    createTwin,
    hydrateDashboard,
    hydrateBlueprint,
    hydrateSimulation,
    hydrateAgents,
    hydrateSovereignty,
    hydrateCarbon,
    hydrateFinancial,
  } = useTwinContext();
  
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTwinData, setNewTwinData] = useState({
    name: '',
    city: '',
    region_code: 'ca-central-1',
    tier: 'Tier III',
    capacity_kw: 5000,
  });

  const handleTwinChange = (value: string) => {
    setTwinId(value);
    
    // Trigger global hydration for all components
    hydrateDashboard();
    hydrateBlueprint();
    hydrateSimulation();
    hydrateAgents();
    hydrateSovereignty();
    hydrateCarbon();
    hydrateFinancial();
    
    toast({
      title: "Data Centre Switched",
      description: `Now viewing: ${twins.find(t => t.id === value)?.name || 'Unknown'}`,
    });
  };

  const handleCreateTwin = async () => {
    if (!newTwinData.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the data centre twin.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const region = getRegionByCode(newTwinData.region_code);
      
      const created = await createTwin({
        name: newTwinData.name,
        city: region?.city || newTwinData.city || 'Montreal',
        region_code: newTwinData.region_code,
        tier: newTwinData.tier,
        capacity_kw: newTwinData.capacity_kw,
        pue_target: region?.default_pue || 1.3,
        renewable_target_pct: region?.energy_mix.renewable || 80,
        carbon_intensity: region?.carbon_intensity || 30,
        sovereignty_level: region?.sovereignty_profile.level || 'standard',
        metadata: {
          created_from: 'selector',
          region_profile: region,
        },
      });

      if (created) {
        toast({
          title: "Twin Created",
          description: `${created.name} has been created successfully.`,
        });
        setIsCreateOpen(false);
        setNewTwinData({
          name: '',
          city: '',
          region_code: 'ca-central-1',
          tier: 'Tier III',
          capacity_kw: 5000,
        });
      }
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create twin",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getCarbonBadgeVariant = (intensity: number) => {
    const carbonClass = getRegionCarbonClass(intensity);
    switch (carbonClass) {
      case 'ultra-low': return 'default';
      case 'low': return 'secondary';
      case 'medium': return 'outline';
      case 'high': return 'destructive';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading twins...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      
      <Select value={twinId || ''} onValueChange={handleTwinChange}>
        <SelectTrigger className="w-[280px] bg-background">
          <SelectValue placeholder="Select Data Centre Twin">
            {twin && (
              <div className="flex items-center gap-2">
                <span className="truncate">{twin.name}</span>
                <Badge variant="outline" className="text-xs">
                  {twin.tier}
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {twins.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No data centre twins yet.
              <br />
              Create one to get started.
            </div>
          ) : (
            twins.map((t) => {
              const region = getRegionByCode(t.region_code);
              return (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{t.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{t.city}</span>
                        <span>•</span>
                        <Zap className="h-3 w-3" />
                        <span>{t.capacity_kw} kW</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {region && (
                        <Badge 
                          variant={getCarbonBadgeVariant(region.carbon_intensity)}
                          className="text-xs"
                        >
                          <Leaf className="h-3 w-3 mr-1" />
                          {region.carbon_intensity}g
                        </Badge>
                      )}
                      {t.sovereignty_level === 'federal' && (
                        <Shield className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Data Centre Twin</DialogTitle>
            <DialogDescription>
              Create a new data centre twin for a specific region or custom site.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Twin Name</Label>
              <Input
                id="name"
                placeholder="e.g., Montreal Sovereign AI DC"
                value={newTwinData.name}
                onChange={(e) => setNewTwinData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="region">Region</Label>
              <Select 
                value={newTwinData.region_code} 
                onValueChange={(value) => {
                  const region = getRegionByCode(value);
                  setNewTwinData(prev => ({ 
                    ...prev, 
                    region_code: value,
                    city: region?.city || prev.city,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {CANADIAN_REGIONS.map((region) => (
                    <SelectItem key={region.id} value={region.region_code}>
                      <div className="flex items-center gap-2">
                        <span>{region.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {region.provider.toUpperCase()}
                        </Badge>
                        <Badge 
                          variant={getCarbonBadgeVariant(region.carbon_intensity)}
                          className="text-xs"
                        >
                          {region.carbon_intensity}g CO₂/kWh
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tier">Tier</Label>
                <Select 
                  value={newTwinData.tier} 
                  onValueChange={(value) => setNewTwinData(prev => ({ ...prev, tier: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tier II">Tier II</SelectItem>
                    <SelectItem value="Tier III">Tier III</SelectItem>
                    <SelectItem value="Tier IV">Tier IV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="capacity">Capacity (kW)</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={newTwinData.capacity_kw}
                  onChange={(e) => setNewTwinData(prev => ({ 
                    ...prev, 
                    capacity_kw: parseInt(e.target.value) || 5000 
                  }))}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTwin} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Twin
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
