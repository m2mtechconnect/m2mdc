/**
 * Manage -> Facilities (Stage 7E).
 *
 * Canonical owner of facility administration: the facility list, creation,
 * location and tier, status, default blueprint and archive/delete. Nothing
 * here is duplicated in the global header or in generic Settings.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { useRBAC } from '@/contexts/RBACContext';
import { toast } from 'sonner';

const REGIONS = [
  { code: 'ca-central-1', name: 'Montreal', province: 'Quebec', carbonIntensity: 25 },
  { code: 'ca-west-1', name: 'Vancouver', province: 'BC', carbonIntensity: 12 },
  { code: 'canada-central', name: 'Toronto', province: 'Ontario', carbonIntensity: 40 },
  { code: 'canada-east', name: 'Quebec City', province: 'Quebec', carbonIntensity: 20 },
];

export default function ManageFacilities() {
  const navigate = useNavigate();
  const { can } = useRBAC();
  const { twins, activeTwinId, setActiveTwin, isLoading, createLocation, createTwin } = useActiveTwin();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', region_code: 'ca-central-1', tier: 'Tier III', capacity_kw: 5000 });

  useEffect(() => {
    document.title = 'Facilities | AURA DC';
  }, []);

  const canEdit = can('twin.edit');

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Enter a facility name.');
      return;
    }
    setCreating(true);
    try {
      const region = REGIONS.find((r) => r.code === form.region_code);
      const location = await createLocation({
        name: `${form.name} - ${region?.name ?? 'Unknown'}`,
        city: region?.name ?? 'Montreal',
        province: region?.province,
        country: 'Canada',
        cloud_region: form.region_code,
        provider_type: 'Hybrid',
        industry: 'cloud_saas',
        capacity_kw: form.capacity_kw,
        tier: form.tier,
        tags: [],
      });
      if (!location) throw new Error('Failed to create location');
      const created = await createTwin(location.id, {
        name: form.name,
        city: region?.name ?? 'Montreal',
        region_code: form.region_code,
        tier: form.tier,
        capacity_kw: form.capacity_kw,
        pue_target: 1.3,
        renewable_target_pct: 80,
        carbon_intensity: region?.carbonIntensity ?? 30,
        sovereignty_level: 'standard',
        metadata: { created_from: 'manage-facilities' },
      });
      if (created) {
        toast.success(`${created.name} created.`);
        setOpen(false);
        navigate(`/builder?twinId=${created.id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create facility');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 pb-10" data-testid="manage-facilities-page">
      <CommandHeader
        eyebrow="Operations · Facility control plane"
        title={
          <span className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" aria-hidden />
            Facilities
          </span>
        }
        subtitle="Facility administration: create, configure and retire modelled data-centre facilities. All values remain simulated."
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
          <CardDescription>Facilities you have access to.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 p-0">
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading facilities…
            </p>
          )}
          {!isLoading && twins.length === 0 && (
            <p className="text-sm text-muted-foreground">No facilities yet.</p>
          )}
          {twins.map((t) => (
            <div
              key={t.id}
              className="v2-subpanel flex min-w-0 flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-[220px] flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                  {t.name}
                  {t.id === activeTwinId && <Badge variant="outline" className="text-[11px]">Current</Badge>}
                </p>
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {t.city}
                  <span aria-hidden>·</span>
                  {t.tier}
                  <span aria-hidden>·</span>
                  <Zap className="h-3 w-3" aria-hidden />
                  <span className="v2-mono">{t.capacity_kw} kW</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setActiveTwin(t.id)}>
                  Set as current
                </Button>
                {canEdit && (
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/builder?twinId=${t.id}`}>Edit</Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create facility</DialogTitle>
            <DialogDescription>
              Creates a modelled facility record. No live infrastructure is provisioned.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="facility-name">Facility name</Label>
              <Input
                id="facility-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Montreal Sovereign AI DC"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="facility-capacity">Design capacity (kW)</Label>
              <Input
                id="facility-capacity"
                type="number"
                value={form.capacity_kw}
                onChange={(e) => setForm({ ...form, capacity_kw: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Create facility
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
