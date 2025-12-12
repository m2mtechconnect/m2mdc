/**
 * Skeleton loaders for simulation page components
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function KPICardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="p-3 rounded-lg border bg-card animate-pulse">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-3 rounded-full" />
        </div>
        <div className="flex items-end justify-between">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-4 w-10" />
        </div>
        <div className="flex items-center justify-between mt-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
    );
  }

  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="flex items-end justify-between mb-3">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-5 w-14" />
        </div>
        <Skeleton className="h-6 w-full mb-3" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-2 w-full mt-3 rounded-full" />
      </CardContent>
    </Card>
  );
}

export function KPIGridSkeleton({ count = 6, compact = false }: { count?: number; compact?: boolean }) {
  return (
    <div className={cn(
      "grid gap-3",
      compact ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-6" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <KPICardSkeleton key={i} compact={compact} />
      ))}
    </div>
  );
}

export function ScenarioCardSkeleton() {
  return (
    <Card className="min-w-[280px] max-w-[320px] animate-pulse">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-5 w-14" />
        </div>
        <Skeleton className="h-8 w-full" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-7 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ScenarioGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ScenarioCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 180 }: { height?: number }) {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className={`w-full rounded`} style={{ height }} />
        <div className="flex justify-between mt-2 pt-2 border-t border-border">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TimeControlsSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <Skeleton className="h-2 w-full mb-4 rounded-full" />
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded" />
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 mt-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-8 rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SimulationPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="rounded-lg border-2 border-border bg-muted/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-48 mb-1" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      {/* KPI Grid */}
      <KPIGridSkeleton count={6} compact />

      {/* Tabs */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-2xl" />
        <ScenarioGridSkeleton count={4} />
      </div>
    </div>
  );
}
