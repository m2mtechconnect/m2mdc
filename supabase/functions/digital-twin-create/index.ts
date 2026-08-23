import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHandler } from "../_shared/handler.ts";
import { createDigitalTwinSchema } from "../_shared/digitalTwinSchemas.ts";

interface CreateDigitalTwinInput {
  name: string;
  slug: string;
  description?: string;
  status?: 'draft' | 'active' | 'archived';
  config: any;
}

serve(createHandler<CreateDigitalTwinInput, any>({
  name: "digital-twin-create",
  authLevel: "user",
  inputSchema: createDigitalTwinSchema,
  handler: async (input, context) => {
    const { log, userId, supabase } = context;

    log("Creating digital twin", { name: input.name, slug: input.slug });

    // Check if slug is already taken
    const { data: existingTwin } = await supabase
      .from("digital_twins")
      .select("id")
      .eq("slug", input.slug)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingTwin) {
      throw {
        code: "CONFLICT",
        message: `A digital twin with slug '${input.slug}' already exists`,
        status: 409,
      };
    }

    // Insert new digital twin
    const { data: twin, error } = await supabase
      .from("digital_twins")
      .insert({
        user_id: userId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        status: input.status || 'draft',
        config: input.config,
      })
      .select()
      .single();

    if (error) {
      log("Failed to create digital twin", { error });
      throw {
        code: "INTERNAL_ERROR",
        message: `Failed to create digital twin: ${error.message}`,
        status: 500,
      };
    }

    log("Digital twin created successfully", { twinId: twin.id });

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
