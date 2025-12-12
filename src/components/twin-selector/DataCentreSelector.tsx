/**
 * DataCentreSelector - Global Twin Selection Dropdown
 * Appears in the top navigation for switching between data centre twins
 * Uses ActiveTwinContext as single source of truth
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Building2, 
  Plus, 
  MapPin, 
  Zap, 
  Leaf,
  Shield,
  Loader2,
  MoreVertical,
  Copy,
  Pencil,
  Trash2,
  Settings2
} from 'lucide-react';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { useRecommendationStore } from '@/stores/recommendationStore';
import { toast } from 'sonner';
import { DeleteTwinModal } from './DeleteTwinModal';

// Region data for new twin creation
const REGIONS = [
  { code: 'ca-central-1', name: 'Montreal', province: 'Quebec', carbonIntensity: 25 },
  { code: 'ca-west-1', name: 'Vancouver', province: 'BC', carbonIntensity: 12 },
  { code: 'canada-central', name: 'Toronto', province: 'Ontario', carbonIntensity: 40 },
  { code: 'canada-east', name: 'Quebec City', province: 'Quebec', carbonIntensity: 20 },
];

export function DataCentreSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    activeTwinId, 
    setActiveTwin, 
    twins, 
    twin, 
    locations,
    isLoading, 
    createLocation,
    createTwin,
    deleteTwin,
  } = useActiveTwin();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newTwinData, setNewTwinData] = useState({
    name: '',
    region_code: 'ca-central-1',
    tier: 'Tier III',
    capacity_kw: 5000,
  });

  // Check if we're in simulation snapshot mode (should hide destructive actions)
  const isSimulationMode = location.pathname.includes('/data-centre-twin') && 
    location.search.includes('view=simulation');

  const handleTwinChange = (value: string) => {
    // CRITICAL: Clear any active recommendation when switching twins
    // This ensures recommendations don't leak into real twin views
    useRecommendationStore.getState().clearRecommendation();
    
    setActiveTwin(value);
    const selectedTwin = twins.find(t => t.id === value);
    console.log('[DataCentreSelector] Twin switched to:', selectedTwin?.name);
    toast.success(`Switched to: ${selectedTwin?.name || 'Unknown'}`);
  };

  const handleCreateTwin = async () => {
    if (!newTwinData.name.trim()) {
      toast.error('Please enter a name for the data centre twin.');
      return;
    }

    setIsCreating(true);
    try {
      const region = REGIONS.find(r => r.code === newTwinData.region_code);
      
      // Create location first
      const newLocation = await createLocation({
        name: `${newTwinData.name} - ${region?.name || 'Unknown'}`,
        city: region?.name || 'Montreal',
        province: region?.province,
        country: 'Canada',
        cloud_region: newTwinData.region_code,
        provider_type: 'Hybrid',
        industry: 'cloud_saas',
        capacity_kw: newTwinData.capacity_kw,
        tier: newTwinData.tier,
        tags: [],
      });

      if (!newLocation) {
        throw new Error('Failed to create location');
      }

      // Create twin linked to location
      const created = await createTwin(newLocation.id, {
        name: newTwinData.name,
        city: region?.name || 'Montreal',
        region_code: newTwinData.region_code,
        tier: newTwinData.tier,
        capacity_kw: newTwinData.capacity_kw,
        pue_target: 1.3,
        renewable_target_pct: 80,
        carbon_intensity: region?.carbonIntensity || 30,
        sovereignty_level: 'standard',
        metadata: {
          created_from: 'selector',
        },
      });

      if (created) {
        toast.success(`${created.name} has been created successfully.`);
        setIsCreateOpen(false);
        setNewTwinData({
          name: '',
          region_code: 'ca-central-1',
          tier: 'Tier III',
          capacity_kw: 5000,
        });
        // Navigate to builder for this new twin
        navigate(`/builder?twinId=${created.id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create twin');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTwin = async () => {
    if (!twin || !activeTwinId) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteTwin(activeTwinId);
      
      if (success) {
        toast.success(`${twin.name} has been deleted.`);
        setIsDeleteOpen(false);
        // Navigate to dashboard after deletion
        navigate('/');
      } else {
        toast.error('Failed to delete twin. Please try again.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete twin');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicateTwin = () => {
    if (!twin) return;
    // Pre-fill the create dialog with current twin's data
    setNewTwinData({
      name: `${twin.name} (Copy)`,
      region_code: twin.region_code,
      tier: twin.tier,
      capacity_kw: twin.capacity_kw,
    });
    setIsCreateOpen(true);
    toast.info('Duplicating twin... Customize and save.');
  };

  const getCarbonBadgeVariant = (intensity: number | null) => {
    if (!intensity) return 'outline';
    if (intensity < 20) return 'default';
    if (intensity < 50) return 'secondary';
    if (intensity < 200) return 'outline';
    return 'destructive';
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      
      <Select value={activeTwinId || ''} onValueChange={handleTwinChange}>
        <SelectTrigger className="w-[220px] lg:w-[260px] bg-background">
          <SelectValue placeholder="Select Data Centre">
            {twin && (
              <div className="flex items-center gap-2">
                <span className="truncate">{twin.name}</span>
                <Badge variant="outline" className="text-xs hidden sm:inline-flex">
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
              const twinLocation = locations.find(l => l.id === t.location_id);
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
                      {t.carbon_intensity && (
                        <Badge 
                          variant={getCarbonBadgeVariant(t.carbon_intensity)}
                          className="text-xs"
                        >
                          <Leaf className="h-3 w-3 mr-1" />
                          {t.carbon_intensity}g
                        </Badge>
                      )}
                      {t.sovereignty_level === 'sovereign' && (
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

      {/* Twin Actions Dropdown */}
      {twin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate(`/builder?twinId=${activeTwinId}`)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Edit in Builder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/data-centre-twin?twinId=${activeTwinId}`)}>
              <Pencil className="h-4 w-4 mr-2" />
              Open Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicateTwin}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate Twin
            </DropdownMenuItem>
            
            {/* Only show delete option when NOT in simulation mode */}
            {!isSimulationMode && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setIsDeleteOpen(true)}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Twin
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Create Twin Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="flex-shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Data Centre Twin</DialogTitle>
            <DialogDescription>
              Create a new data centre twin for a specific region.
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
                onValueChange={(value) => setNewTwinData(prev => ({ ...prev, region_code: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((region) => (
                    <SelectItem key={region.code} value={region.code}>
                      <div className="flex items-center gap-2">
                        <span>{region.name}, {region.province}</span>
                        <Badge 
                          variant={getCarbonBadgeVariant(region.carbonIntensity)}
                          className="text-xs"
                        >
                          {region.carbonIntensity}g CO₂/kWh
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

      {/* Delete Twin Modal */}
      {twin && (
        <DeleteTwinModal
          isOpen={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          twinName={twin.name}
          twinId={twin.id}
          onConfirmDelete={handleDeleteTwin}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
