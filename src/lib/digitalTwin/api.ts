/**
 * Digital Twin API Client
 * Client-side wrappers for Digital Twin edge functions
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface TwinRunResult {
  twinId: string;
  runId: string;
  eventId: string;
  status: "completed" | "pending_human" | "failed";
  logs: Array<{ nodeId: string; message: string; timestamp: string; level?: string }>;
  stateChanges: any[];
  humanTasks?: Array<{
    nodeId: string;
    role: string;
    taskId: string;
    summary: string;
  }>;
}

export interface TwinRunSummary {
  id: string;
  run_id: string;
  event_id: string;
  status: string;
  created_at: string;
  duration_ms: number | null;
  summary: string;
}

export interface TwinRunDetail {
  id: string;
  twin_id: string;
  event_id: string;
  run_id: string;
  status: string;
  logs: any[];
  state_changes: any[];
  created_at: string;
  completed_at?: string;
  twin: {
    id: string;
    name: string;
    slug: string;
  };
}

interface RestResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
  correlationId: string;
}

/**
 * Trigger a digital twin event
 */
export async function triggerTwinEvent(input: {
  twinId?: string;
  twinSlug?: string;
  eventId: string;
  payload: any;
}): Promise<TwinRunResult> {
  logger.info("Triggering twin event", {
    component: "DigitalTwinAPI",
    metadata: { eventId: input.eventId },
  });

  try {
    const { data, error } = await supabase.functions.invoke<RestResponse<{ run: TwinRunResult }>>(
      "digital-twin-event",
      {
        body: {
          twin_id: input.twinId,
          twin_slug: input.twinSlug,
          event_id: input.eventId,
          payload: input.payload,
        },
      }
    );

    if (error) {
      logger.error("Edge function invocation error", error, {
        component: "DigitalTwinAPI",
      });
      throw new Error(error.message || "Failed to trigger twin event");
    }

    if (!data || !data.success) {
      const errorMsg = data?.error?.message || "Unknown error";
      logger.error("Twin event trigger failed", new Error(errorMsg), {
        component: "DigitalTwinAPI",
        metadata: { correlationId: data?.correlationId },
      });
      throw new Error(errorMsg);
    }

    logger.info("Twin event triggered successfully", {
      component: "DigitalTwinAPI",
      metadata: { runId: data.data?.run.runId },
    });

    return data.data!.run;
  } catch (error) {
    logger.error("Failed to trigger twin event", error, {
      component: "DigitalTwinAPI",
    });
    throw error;
  }
}

/**
 * List runs for a digital twin
 */
export async function listTwinRuns(input: {
  twinId?: string;
  twinSlug?: string;
  status?: "completed" | "pending_human" | "failed";
  limit?: number;
}): Promise<{ runs: TwinRunSummary[] }> {
  logger.info("Listing twin runs", {
    component: "DigitalTwinAPI",
    metadata: { twinId: input.twinId, twinSlug: input.twinSlug },
  });

  try {
    // Build query params
    const params = new URLSearchParams();
    if (input.twinId) params.append("twin_id", input.twinId);
    if (input.twinSlug) params.append("twin_slug", input.twinSlug);
    if (input.status) params.append("status", input.status);
    if (input.limit) params.append("limit", input.limit.toString());

    const { data, error } = await supabase.functions.invoke<RestResponse<{ runs: TwinRunSummary[] }>>(
      `digital-twin-runs-list?${params.toString()}`,
      { method: "GET" }
    );

    if (error) {
      logger.error("Edge function invocation error", error, {
        component: "DigitalTwinAPI",
      });
      throw new Error(error.message || "Failed to list twin runs");
    }

    if (!data || !data.success) {
      const errorMsg = data?.error?.message || "Unknown error";
      logger.error("List twin runs failed", new Error(errorMsg), {
        component: "DigitalTwinAPI",
        metadata: { correlationId: data?.correlationId },
      });
      throw new Error(errorMsg);
    }

    logger.info("Twin runs listed successfully", {
      component: "DigitalTwinAPI",
      metadata: { count: data.data?.runs.length },
    });

    return { runs: data.data!.runs };
  } catch (error) {
    logger.error("Failed to list twin runs", error, {
      component: "DigitalTwinAPI",
    });
    throw error;
  }
}

/**
 * Get detailed information about a specific run
 */
export async function getTwinRun(input: {
  id?: string;
  runId?: string;
}): Promise<{ run: TwinRunDetail }> {
  logger.info("Getting twin run details", {
    component: "DigitalTwinAPI",
    metadata: { id: input.id, runId: input.runId },
  });

  try {
    // Build query params
    const params = new URLSearchParams();
    if (input.id) params.append("id", input.id);
    if (input.runId) params.append("run_id", input.runId);

    const { data, error } = await supabase.functions.invoke<RestResponse<{ run: TwinRunDetail }>>(
      `digital-twin-run-get?${params.toString()}`,
      { method: "GET" }
    );

    if (error) {
      logger.error("Edge function invocation error", error, {
        component: "DigitalTwinAPI",
      });
      throw new Error(error.message || "Failed to get twin run");
    }

    if (!data || !data.success) {
      const errorMsg = data?.error?.message || "Unknown error";
      logger.error("Get twin run failed", new Error(errorMsg), {
        component: "DigitalTwinAPI",
        metadata: { correlationId: data?.correlationId },
      });
      throw new Error(errorMsg);
    }

    logger.info("Twin run retrieved successfully", {
      component: "DigitalTwinAPI",
      metadata: { runId: data.data?.run.run_id },
    });

    return { run: data.data!.run };
  } catch (error) {
    logger.error("Failed to get twin run", error, {
      component: "DigitalTwinAPI",
    });
    throw error;
  }
}
