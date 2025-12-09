import { createHandler } from "../_shared/handler.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

interface GetDigitalTwinInput {
  twinId: string;
}

export default createHandler<GetDigitalTwinInput, any>({
  name: "digital-twin-get",
  authLevel: "user",
  inputSchema: z.object({
    twinId: z.string().uuid(),
  }),
  handler: async (input, context) => {
    const { log, userId, supabase } = context;

    log("Fetching digital twin", { twinId: input.twinId });

    const { data: twin, error } = await supabase
      .from("digital_twins")
      .select("*")
      .eq("id", input.twinId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      log("Failed to fetch digital twin", { error });
      throw {
        code: "INTERNAL_ERROR",
        message: `Failed to fetch digital twin: ${error.message}`,
        status: 500,
      };
    }

    if (!twin) {
      throw {
        code: "NOT_FOUND",
        message: `Digital twin with ID '${input.twinId}' not found`,
        status: 404,
      };
    }

    log("Digital twin fetched successfully", { twinId: twin.id });

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
});
