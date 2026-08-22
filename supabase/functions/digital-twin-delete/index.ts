import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHandler } from "../_shared/handler.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

interface DeleteDigitalTwinInput {
  twinId: string;
}

serve(createHandler<DeleteDigitalTwinInput, any>({
  name: "digital-twin-delete",
  authLevel: "user",
  inputSchema: z.object({
    twinId: z.string().uuid(),
  }),
  handler: async (input, context) => {
    const { log, userId, supabase } = context;

    log("Deleting digital twin", { twinId: input.twinId });

    // Check if twin exists and belongs to user
    const { data: existingTwin } = await supabase
      .from("digital_twins")
      .select("id, name")
      .eq("id", input.twinId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingTwin) {
      throw {
        code: "NOT_FOUND",
        message: `Digital twin with ID '${input.twinId}' not found`,
        status: 404,
      };
    }

    // Delete digital twin (cascade will delete runs)
    const { error } = await supabase
      .from("digital_twins")
      .delete()
      .eq("id", input.twinId)
      .eq("user_id", userId);

    if (error) {
      log("Failed to delete digital twin", { error });
      throw {
        code: "INTERNAL_ERROR",
        message: `Failed to delete digital twin: ${error.message}`,
        status: 500,
      };
    }

    log("Digital twin deleted successfully", { twinId: input.twinId });

    return {
      success: true,
      message: `Digital twin '${existingTwin.name}' deleted successfully`,
    };
  },
}));
