/**
 * Sovereignty Audit Timeline - Displays sovereignty violations as timeline events
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Globe, Shield, AlertTriangle } from "lucide-react";
import type { SovereigntyViolation, SovereigntyAuditEvent } from "@/sovereignty";
import { getSeverityColor, getJurisdictionDisplayName } from "@/sovereignty";

interface SovereigntyAuditTimelineProps {
  violations: SovereigntyViolation[];
  auditEvents: SovereigntyAuditEvent[];
  onViewDetails?: (violationId: string) => void;
}

function formatReasonCode(reasonCode: string): string {
  const map: Record<string, string> = {
    'UNAPPROVED_CROSS_BORDER': 'Unapproved Cross-Border Transfer',
    'UNAPPROVED_CLOUD_REGION': 'Blocked Region Violation',
    'MISSING_DPA': 'Missing Data Processing Agreement',
    'UNCLASSIFIED_ASSET': 'Unclassified Data Asset',
    'POLICY_MISMATCH': 'Policy Mismatch',
    'SOVEREIGN_LEAKAGE': 'Sovereign Data Leakage',
  };
  return map[reasonCode] || reasonCode.replace(/_/g, ' ');
}

function getSeverityBadgeVariant(severity: string): 'destructive' | 'default' | 'secondary' | 'outline' {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    default:
      return 'secondary';
  }
}

export function SovereigntyAuditTimeline({
  violations,
  auditEvents,
  onViewDetails,
}: SovereigntyAuditTimelineProps) {
  // Combine violations and audit events into timeline
  const timelineItems = [
    ...violations.map((v) => ({
      id: v.id,
      type: 'violation' as const,
      time: new Date(v.detectedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date(v.detectedAt),
      eventType: 'Sovereignty Violation',
      action: formatReasonCode(v.reasonCode),
      system: 'Sovereignty Sentinel',
      risk: v.severity,
      details: v.description,
      jurisdiction: v.jurisdiction,
      resolved: !!v.resolvedAt,
    })),
    ...auditEvents.map((e) => ({
      id: e.id,
      type: 'audit' as const,
      time: new Date(e.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date(e.timestamp),
      eventType: e.eventType.replace(/_/g, ' ').toLowerCase(),
      action: e.description,
      system: e.source || 'System',
      risk: e.severity === 'info' ? 'low' : e.severity === 'warning' ? 'medium' : e.severity === 'error' ? 'high' : 'critical',
      details: typeof e.details === 'string' ? e.details : JSON.stringify(e.details),
      jurisdiction: e.flowId ? 'CA-QC' : undefined,
      resolved: e.eventType === 'VIOLATION_RESOLVED',
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (timelineItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Shield className="h-12 w-12 text-green-500 mb-3" />
        <p className="text-muted-foreground">No sovereignty events detected</p>
        <p className="text-sm text-muted-foreground">All data flows are compliant</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timelineItems.slice(0, 10).map((event, idx) => {
        const isHighRisk = event.risk === 'critical' || event.risk === 'high';
        const isMediumRisk = event.risk === 'medium';
        const isViolation = event.type === 'violation';

        return (
          <div
            key={event.id}
            className={`p-4 rounded-lg border transition-colors hover:bg-muted/50 ${
              isHighRisk
                ? "border-destructive/50 bg-destructive/5"
                : isMediumRisk
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-border"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      isHighRisk ? "bg-destructive" : isMediumRisk ? "bg-amber-500" : "bg-green-500"
                    }`}
                  />
                  {idx < timelineItems.length - 1 && (
                    <div className="h-12 w-px bg-border mt-2" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {isViolation ? (
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                    ) : (
                      <Globe className="h-3 w-3 text-blue-500" />
                    )}
                    <Badge variant="outline" className="text-xs">
                      {event.eventType}
                    </Badge>
                    <span className="font-semibold text-sm">{event.action}</span>
                    <Badge
                      variant={getSeverityBadgeVariant(event.risk)}
                      className="text-xs"
                    >
                      {event.risk.charAt(0).toUpperCase() + event.risk.slice(1)} Risk
                    </Badge>
                    {event.resolved && (
                      <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                        Resolved
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{event.system}</span>
                    {event.jurisdiction && (
                      <>
                        <span>•</span>
                        <span>{getJurisdictionDisplayName(event.jurisdiction)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                {event.time}
              </span>
            </div>
            <p className="text-sm pl-7 mb-3">{typeof event.details === 'string' ? event.details : ''}</p>
            {isViolation && onViewDetails && (
              <div className="flex gap-2 pl-7">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => onViewDetails(event.id)}
                >
                  <Eye className="h-3 w-3 mr-2" />
                  View Details
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
