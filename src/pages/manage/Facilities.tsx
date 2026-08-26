/**
 * Canonical facility administration and first-run facility setup.
 *
 * Facility identity is created before Builder configuration begins. Region,
 * tier and capacity are explicit operator inputs, never silent defaults.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Loader2, MapPin, Plus, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CommandHeader } from '@/components/v2';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { useRBAC } from '@/contexts/RBACContext';
import { createFacilitySetup } from '@/facilities/api';
import { toast } from 'sonner';

const REGIONS = [
  { code: 'ca-central-1', name: 'Montreal', province: 'Quebec' },
  { code: 'ca-west-1', name: 'Vancouver', province: 'British Columbia' },
  { code: 'canada-central', name: 'Toronto', province: 'Ontario' },
  { code: 'canada-east', name: 'Quebec City', province: 'Quebec' },
] as const;

const TIERS = ['Tier I', 'Tier II', 'Tier III', 'Tier IV'] as const;

const EMPTY_FORM = {
  name: '',
  region_code: '',
  tier: '',
  capacity_kw: 0,
};


export default function ManageFacilities() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { can } = useRBAC();
  const {
    twins,
    activeTwinId,
    setActiveTwin,
    isLoading,
    refreshLocations,
    refreshTwins,
  } = useActiveTwin();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    document.title = 'Facilities | AURA DC';
  }, []);

  const canEdit = can('twin.edit');
  const nextStep = params.get('next');
  const configuredTwins = useMemo(
    () => twins.filter((twin) => twin.metadata?.provisioned !== 'default_starter_twin'),
    [twins],
  );

  useEffect(() => {
    if (!canEdit || params.get('create') !== 'true') return;
    setOpen(true);
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('create');
      return next;
    }, { replace: true });
  }, [canEdit, params, setParams]);

  const handleCreate = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error('Enter a facility name.');
      return;
    }
    if (!form.region_code) {
      toast.error('Select the facility region.');
      return;
    }
    if (!form.tier) {
      toast.error('Select the facility tier.');
      return;
    }
    if (!Number.isFinite(form.capacity_kw) || form.capacity_kw <= 0) {
      toast.error('Enter a design capacity greater than 0 kW.');
      return;
    }

    const region = REGIONS.find((item) => item.code === form.region_code);
    if (!region) {
      toast.error('Select a supported facility region.');
      return;
    }

    setCreating(true);
    try {
      const row = await createFacilitySetup({
        name,
        city: region.name,
        province: region.province,
        country: 'Canada',
        regionCode: form.region_code,
        tier: form.tier,
        capacityKw: form.capacity_kw,
        source: nextStep === 'builder' ? 'build-setup' : 'manage-facilities',
      });

      await Promise.all([refreshLocations(), refreshTwins()]);
      await setActiveTwin(row.twin_id);
      toast.success(`${name} created.`);
      setOpen(false);
      setForm(EMPTY_FORM);

      if (nextStep === 'builder') {
        navigate(`/builder?new=true&twin=${encodeURIComponent(row.twin_id)}&source=facility&type=3d_twin`, { replace: true });
      } else {
        navigate(`/blueprint/${row.twin_id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create facility');
    } finally {
      setCreating(false);
    }
  };

  const openFacility = async (twinId: string) => {
    await setActiveTwin(twinId);
    navigate(`/blueprint/${twinId}`);
  };

  return (
    <div className="space-y-6 pb-10" data-testid="manage-facilities-page">
      <CommandHeader
        eyebrow="Build · Facility setup"
        title={
          <span className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" aria-hidden />
            Facilities
          </span>
        }
        subtitle="Create the facility identity that Blueprint, Connections, Simulation and deployment will share. No live infrastructure is provisioned here."
        actions={
          canEdit ? (
            <Button onClick={() => setOpen(true)} data-testid="create-facility">
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Create facility
            </Button>
          ) : undefined
        }
      />

      <Card className="v2-panel">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-base">Facility list</CardTitle>
          <CardDescription>Facilities available to the current workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 p-0">
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden /> Loading facilities…
            </p>
          )}
          {!isLoading && configuredTwins.length === 0 && (
            <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
              <p>No configured facility is available yet.</p>
              {canEdit && (
                <Button className="mt-3" size="sm" onClick={() => setOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden />
                  Create your first facility
                </Button>
              )}
            </div>
          )}
          {configuredTwins.map((twin) => (
            <div
              key={twin.id}
              className="v2-subpanel flex min-w-0 flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-[220px] flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                  {twin.name}
                  {twin.id === activeTwinId && <Badge variant="outline" className="text-xs">Current</Badge>}
                </p>
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {twin.city}
                  <span aria-hidden>·</span>
                  {twin.tier}
                  <span aria-hidden>·</span>
                  <Zap className="h-3 w-3" aria-hidden />
                  <span className="v2-mono">{twin.capacity_kw} kW</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => void setActiveTwin(twin.id)}>
                  Set as current
                </Button>
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => void openFacility(twin.id)}>
                    Open Blueprint
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="facility-create-dialog">
          <DialogHeader>
            <DialogTitle>Create facility</DialogTitle>
            <DialogDescription>
              Define the facility identity used throughout AURA. These are operator-supplied design inputs, not measured telemetry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="facility-name">Facility name</Label>
              <Input
                id="facility-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Toronto AI Data Centre"
                autoComplete="organization"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Region</Label>
              <Select value={form.region_code} onValueChange={(region_code) => setForm({ ...form, region_code })}>
                <SelectTrigger aria-label="Facility region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((region) => (
                    <SelectItem key={region.code} value={region.code}>
                      {region.name}, {region.province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Facility tier</Label>
              <Select value={form.tier} onValueChange={(tier) => setForm({ ...form, tier })}>
                <SelectTrigger aria-label="Facility tier">
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  {TIERS.map((tier) => <SelectItem key={tier} value={tier}>{tier}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="facility-capacity">Design capacity (kW)</Label>
              <Input
                id="facility-capacity"
                type="number"
                min={1}
                step={1}
                value={form.capacity_kw || ''}
                onChange={(event) => setForm({ ...form, capacity_kw: Number(event.target.value) || 0 })}
                placeholder="5000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} data-testid="confirm-create-facility">
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {nextStep === 'builder' ? 'Create and continue to Build' : 'Create facility'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
