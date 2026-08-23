import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHandler } from "../_shared/handler.ts";
import { updateDigitalTwinSchema } from "../_shared/digitalTwinSchemas.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

interface UpdateDigitalTwinInput {
  twinId: string;
  name?: string;
  description?: string;
  status?: 'draft' | 'active' | 'archived';
  config?: any;
}

serve(createHandler<UpdateDigitalTwinInput, any>({
  name: "digital-twin-update",
  authLevel: "user",
  inputSchema: z.object({
    twinId: z.string().uuid(),
  }).merge(updateDigitalTwinSchema),
  handler: async (input, context) => {
    const { log, userId, supabase } = context;
    const { twinId, ...updates } = input;

    log("Updating digital twin", { twinId, updates });

    // Check if twin exists and belongs to user
    const { data: existingTwin } = await supabase
      .from("digital_twins")
      .select("id")
      .eq("id", twinId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingTwin) {
      throw {
        code: "NOT_FOUND",
        message: `Digital twin with ID '${twinId}' not found`,
        status: 404,
      };
    }

    // Update digital twin
    const { data: twin, error } = await supabase
      .from("digital_twins")
      .update(updates)
      .eq("id", twinId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      log("Failed to update digital twin", { error });
      throw {
        code: "INTERNAL_ERROR",
        message: `Failed to update digital twin: ${error.message}`,
        status: 500,
      };
    }

    log("Digital twin updated successfully", { twinId: twin.id });

    return {
      twin: {
        id: twin.id,
        userId: twin.user_id,
        name: twin.name,
        slug: twin.slug,
        description: twin.description,
        status: twin.status,
        config: twin.config,
        createdAt: twin.created_at,
        updatedAt: twin.updated_at,
      },
    };
  },
}));
