/**
 * DC Twin Builder Step 1 - Overview
 * Reads from useDCTwinBuilderStore, provides full editing capabilities
 */

import { useState } from 'react';
import { 
  Building2, Briefcase, Bot, TrendingUp, Clock, Zap, Target, 
  Server, Thermometer, Globe, Cpu, Wind, Shield, Pencil, RefreshCw 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { toast } from 'sonner';
import { DCCard, DCSectionHeader, DCKPITile } from '@/components/dc-ui';
import { BUILDER, GLOBAL } from '@/ux';

const INDUSTRY_OPTIONS = [
  'Government', 'Technology', 'Financial Services', 'Retail', 
  'Telecom', 'Healthcare', 'IT Operations', 'Sustainability', 'Compliance', 'Finance'
];

export function DCStep1Summary() {
  const { 
    overview, 
    updateOverview, 
    sourceRecommendation,
    markStepComplete 
  } = useDCTwinBuilderStore();
  const { openWithQuestion } = useCoPilotContext();
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editCapacity, setEditCapacity] = useState('');
  const [editTier, setEditTier] = useState('');
  const [editRenewable, setEditRenewable] = useState('');

  const handleOpenEdit = () => {
    setEditName(overview.twinName);
    setEditDescription(overview.description || overview.twinSummary);
    setEditIndustry(overview.industries[0] || 'Technology');
    setEditCapacity(String(overview.capacityKw));
    setEditTier(overview.tier);
    setEditRenewable(String(overview.renewablePercent));
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    
    try {
      updateOverview({
        twinName: editName,
        description: editDescription,
        twinSummary: editDescription,
        industries: [editIndustry, ...overview.industries.slice(1)],
        capacityKw: parseInt(editCapacity) || overview.capacityKw,
        tier: editTier as any,
        renewablePercent: parseInt(editRenewable) || overview.renewablePercent,
      });
      
      toast.success('Overview updated successfully');
      setIsEditOpen(false);
      markStepComplete(1);
    } catch (error) {
      console.error('[DCBuilder:Step1] Failed to save edits:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAskCoPilot = (prompt: string) => {
    openWithQuestion(prompt);
  };

  return (
    <div className="space-y-6 max-w-[920px] mx-auto">
      {/* Header */}
      <DCSectionHeader
        title={BUILDER.STEPS.STEP_1.TITLE}
        subtitle={BUILDER.STEPS.STEP_1.SUBTITLE}
        icon={<Server className="h-5 w-5" />}
      />

      {/* Source Badge */}
      {sourceRecommendation?.url && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-2 px-3 py-1.5 border-primary/30 bg-primary/5">
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs">Generated from: {new URL(sourceRecommendation.url).hostname}</span>
            <Badge className="ml-2 text-xs">{sourceRecommendation.blueprintProfile}</Badge>
          </Badge>
        </div>
      )}

      {/* Main Twin Overview Card */}
      <DCCard 
        title={overview.twinName}
        subtitle={GLOBAL.TWIN_SUFFIX}
        icon={<Bot className="h-5 w-5" />}
        status="normal"
      >
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
            <p className="text-sm">
              {overview.description || overview.twinSummary || 'Configure this data centre twin to monitor and optimize your facility.'}
            </p>
          </div>

          {overview.keyCapabilities.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <Target className="h-3 w-3" />
                Key Capabilities
              </h4>
              <div className="space-y-1">
                {overview.keyCapabilities.map((capability, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {capability}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {overview.industries.slice(0, 4).map((industry, idx) => (
              <Badge key={idx} className="bg-destructive/10 text-destructive border-destructive/30">
                <Building2 className="h-3 w-3 mr-1" />
                {industry}
              </Badge>
            ))}
            <Badge className="bg-info/10 text-info border-info/30">
              <Globe className="h-3 w-3 mr-1" />
              Sovereign Compute
            </Badge>
          </div>
        </div>
      </DCCard>

      {/* Facility Specifications */}
      <DCCard 
        title="Facility Specifications" 
        subtitle="Data Centre infrastructure configuration"
        icon={<Server className="h-4 w-4" />}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-3.5 w-3.5 text-info" />
              <p className="text-xs text-muted-foreground">Facility Location</p>
            </div>
            <p className="text-sm font-medium">{overview.facilityLocation || 'CA-ON (Toronto)'}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="h-3.5 w-3.5 text-accent" />
              <p className="text-xs text-muted-foreground">GPU Fleet</p>
            </div>
            <p className="text-sm font-medium">{overview.gpuFleet || 'NVIDIA H100 x 256'}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Wind className="h-3.5 w-3.5 text-info" />
              <p className="text-xs text-muted-foreground">Cooling Type</p>
            </div>
            <p className="text-sm font-medium">{overview.coolingType || 'Liquid + Chilled Water'}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3.5 w-3.5 text-warning" />
              <p className="text-xs text-muted-foreground">Capacity</p>
            </div>
            <p className="text-sm font-medium">{overview.capacityKw} kW</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3.5 w-3.5 text-success" />
              <p className="text-xs text-muted-foreground">Renewable %</p>
            </div>
            <p className="text-sm font-medium">{overview.renewablePercent}%</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-3.5 w-3.5 text-info" />
              <p className="text-xs text-muted-foreground">Tier</p>
            </div>
            <p className="text-sm font-medium">{overview.tier}</p>
          </div>
        </div>
      </DCCard>

      {/* Data Centre KPIs */}
      <div className="grid gap-4 grid-cols-3">
        <DCKPITile
          label="Target PUE"
          value="1.2-1.4"
          sublabel="Power efficiency"
          status="normal"
          icon={<Zap className="h-4 w-4" />}
          trend="up"
        />
        <DCKPITile
          label="Carbon Reduction"
          value="25-40%"
          sublabel="Annual target"
          status="normal"
          icon={<TrendingUp className="h-4 w-4" />}
          trend="up"
        />
        <DCKPITile
          label="Uptime SLA"
          value="99.99%"
          sublabel="Availability"
          status="info"
          icon={<Clock className="h-4 w-4" />}
          trend="up"
        />
      </div>

      {/* KPIs Improved */}
      {overview.kpisImproved.length > 0 && (
        <DCCard title="KPIs Improved" icon={<TrendingUp className="h-4 w-4" />}>
          <div className="flex flex-wrap gap-2">
            {overview.kpisImproved.map((kpi, idx) => (
              <Badge key={idx} variant="outline" className="bg-success/10 text-success border-success/30">
                {kpi}
              </Badge>
            ))}
          </div>
        </DCCard>
      )}

      {/* Actions */}
      <DCCard className="bg-muted/30">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ready to configure this data centre twin? Click "Next" to set up agents, data sources, and KPIs.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleOpenEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Configuration
            </Button>
            <Button variant="outline" className="flex-1" disabled>
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-scan URL
            </Button>
          </div>
          
          {/* Co-Pilot Quick Actions */}
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Ask Co-Pilot:</p>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs bg-muted hover:bg-muted/80"
                onClick={() => handleAskCoPilot('Suggest PUE optimization strategies for this data centre twin.')}
              >
                PUE Optimization
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs bg-muted hover:bg-muted/80"
                onClick={() => handleAskCoPilot('What thermal monitoring KPIs should I track?')}
              >
                Thermal KPIs
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs bg-muted hover:bg-muted/80"
                onClick={() => handleAskCoPilot('What are the key sovereignty compliance requirements for this data centre?')}
              >
                Sovereignty Checks
              </Button>
            </div>
          </div>
        </div>
      </DCCard>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Twin Configuration</DialogTitle>
            <DialogDescription>
              Update the name, description, and facility specifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Twin Name</Label>
              <Input 
                id="edit-name" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Data Centre Twin name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea 
                id="edit-description" 
                value={editDescription} 
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What does this twin monitor and control?"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-industry">Industry</Label>
                <Select value={editIndustry} onValueChange={setEditIndustry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tier">Tier</Label>
                <Select value={editTier} onValueChange={setEditTier}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tier III">Tier III</SelectItem>
                    <SelectItem value="Tier IV">Tier IV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-capacity">Capacity (kW)</Label>
                <Input 
                  id="edit-capacity" 
                  type="number"
                  value={editCapacity} 
                  onChange={(e) => setEditCapacity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-renewable">Renewable %</Label>
                <Input 
                  id="edit-renewable" 
                  type="number"
                  value={editRenewable} 
                  onChange={(e) => setEditRenewable(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
