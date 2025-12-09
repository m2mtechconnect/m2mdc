import { createHandler } from "../_shared/handler.ts";
import { listDigitalTwinsSchema } from "../_shared/digitalTwinSchemas.ts";

interface ListDigitalTwinsInput {
  status?: 'draft' | 'active' | 'archived';
  search?: string;
  limit?: number;
  offset?: number;
}

export default createHandler<ListDigitalTwinsInput, any>({
  name: "digital-twin-list",
  authLevel: "user",
  inputSchema: listDigitalTwinsSchema,
  handler: async (input, context) => {
    const { log, userId, supabase } = context;
    const { status, search, limit = 50, offset = 0 } = input;

    log("Listing digital twins", { status, search, limit, offset });

    let query = supabase
      .from("digital_twins")
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply pagination
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: twins, error, count } = await query;

    if (error) {
      log("Failed to list digital twins", { error });
      throw {
        code: "INTERNAL_ERROR",
        message: `Failed to list digital twins: ${error.message}`,
        status: 500,
      };
    }

    log("Digital twins listed successfully", { count: twins?.length });

    return {
      twins: (twins || []).map((twin: any) => ({
        id: twin.id,
        userId: twin.user_id,
        name: twin.name,
        slug: twin.slug,
        description: twin.description,
        status: twin.status,
        config: twin.config,
        createdAt: twin.created_at,
        updatedAt: twin.updated_at,
      })),
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    };
  },
});
