import { z } from "zod";

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  fixStep?: number; // Which step to navigate to fix this
  fixAction?: string; // Description of how to fix
}

// Step 1: Define Goal
const step1Schema = z.object({
  systemName: z
    .string()
    .min(3, "System name must be at least 3 characters")
    .max(80, "System name must be less than 80 characters")
    .regex(/^[a-zA-Z0-9\s-]+$/, "Only letters, numbers, spaces, and hyphens allowed"),
  department: z
    .string()
    .min(1, "Please select a department"),
  outcome: z
    .string()
    .optional(), // Outcome is optional
  successMetric: z
    .string()
    .optional(), // Success metric is optional
});

// Step 2: Choose Template
const step2Schema = z.object({
  selectedTemplate: z.string().nullable(),
});

// Step 3: Configure Intelligence (AI Model + Settings)
const step3Schema = z.object({
  geminiEnabled: z.boolean(),
  vertexEnabled: z.boolean(),
  selectedModel: z.string().min(1, "Please select an AI model"),
  systemPrompt: z
    .string()
    .min(10, "System prompt must be at least 10 characters")
    .max(2000, "System prompt must be less than 2000 characters"),
  topK: z.number().min(1).max(100),
  topN: z.number().min(1).max(20),
  temperature: z.number().min(0).max(2),
});

// Step 4: Connect Business Systems
const step4Schema = z.object({
  connectors: z.record(z.string()),
});

export function validateStep1(state: any): ValidationResult {
  try {
    step1Schema.parse({
      systemName: state.systemName,
      department: state.department,
      outcome: state.outcome,
      successMetric: state.successMetric,
    });
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
          fixStep: 1,
          fixAction: "Complete all required fields",
        })),
      };
    }
    return { valid: false, errors: [] };
  }
}

export function validateStep2(state: any): ValidationResult {
  // Template is optional, so always valid
  return { valid: true, errors: [] };
}

export function validateStep3(state: any): ValidationResult {
  const errors: ValidationError[] = [];

  try {
    step3Schema.parse({
      geminiEnabled: state.geminiEnabled,
      vertexEnabled: state.vertexEnabled,
      selectedModel: state.selectedModel,
      systemPrompt: state.systemPrompt,
      topK: state.topK,
      topN: state.topN,
      temperature: state.temperature,
    });

    // Check if at least one AI engine is enabled
    if (!state.geminiEnabled && !state.vertexEnabled) {
      errors.push({
        field: "aiEngines",
        message: "Enable at least one AI engine (Gemini or Vertex)",
        fixStep: 3,
        fixAction: "Enable an AI engine",
      });
    }

    return { valid: errors.length === 0, errors };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
          fixStep: 3,
          fixAction: "Complete all required configurations",
        })),
      };
    }
    return { valid: false, errors };
  }
}

export function validateStep4(state: any, template?: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate integrations/connectors - optional but check template requirements
  if (template?.requiredIntegrations?.length > 0) {
    const connectedIds = Object.keys(state.connectors || {}).filter(
      (k) => state.connectors[k] === "connected"
    );

    const missingIntegrations = template.requiredIntegrations.filter(
      (req: any) => !connectedIds.includes(req.id)
    );

    if (missingIntegrations.length > 0) {
      errors.push({
        field: "integrations",
        message: `Template requires: ${missingIntegrations.map((i: any) => i.name).join(", ")}`,
        fixStep: 4,
        fixAction: "Connect required integrations",
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateStep5(state: any): ValidationResult {
  // Step 5 (workflow) is optional - validation happens at deploy time
  return { valid: true, errors: [] };
}

export function validateStep6(state: any): ValidationResult {
  // Step 6 (Review & Deploy) - validate that all required steps are complete
  const errors: ValidationError[] = [];

  // Validate all steps (step 2 template is optional, step 5 workflow is optional)
  const step1Result = validateStep1(state);
  const step2Result = validateStep2(state);
  const step3Result = validateStep3(state);
  const step4Result = validateStep4(state);
  const step5Result = validateStep5(state);

  if (!step1Result.valid) {
    errors.push({
      field: "step1",
      message: "Complete Step 1: Define Goal",
      fixStep: 1,
      fixAction: "Fill in required system information",
    });
  }

  if (!step3Result.valid) {
    errors.push({
      field: "step3",
      message: "Complete Step 3: Configure Intelligence",
      fixStep: 3,
      fixAction: "Configure AI model and settings",
    });
  }

  if (!step4Result.valid) {
    errors.push({
      field: "step4",
      message: "Complete Step 4: Connect Business Systems",
      fixStep: 4,
      fixAction: "Connect required integrations",
    });
  }

  return { valid: errors.length === 0, errors };
}

export function validateAllSteps(state: any, currentStep: number, template?: any): ValidationResult {
  const allErrors: ValidationError[] = [];

  // Validate all previous steps up to current step
  if (currentStep >= 1) {
    const step1Result = validateStep1(state);
    allErrors.push(...step1Result.errors);
  }

  if (currentStep >= 2) {
    const step2Result = validateStep2(state);
    allErrors.push(...step2Result.errors);
  }

  if (currentStep >= 3) {
    const step3Result = validateStep3(state);
    allErrors.push(...step3Result.errors);
  }

  if (currentStep >= 4) {
    const step4Result = validateStep4(state, template);
    allErrors.push(...step4Result.errors);
  }

  if (currentStep >= 5) {
    const step5Result = validateStep5(state);
    allErrors.push(...step5Result.errors);
  }

  if (currentStep >= 6) {
    const step6Result = validateStep6(state);
    allErrors.push(...step6Result.errors);
  }

  return { valid: allErrors.length === 0, errors: allErrors };
}

export function getStepCompletionStatus(state: any, step: number, template?: any): "complete" | "incomplete" | "not-started" {
  let result: ValidationResult;

  switch (step) {
    case 1:
      result = validateStep1(state);
      break;
    case 2:
      result = validateStep2(state);
      break;
    case 3:
      result = validateStep3(state);
      break;
    case 4:
      result = validateStep4(state, template);
      break;
    case 5:
      result = validateStep5(state);
      break;
    case 6:
      result = validateStep6(state);
      break;
    default:
      return "not-started";
  }

  if (result.valid) return "complete";

  // Check if any fields are filled (partially complete)
  const hasAnyData = Object.values(state).some((v) => {
    if (typeof v === "string") return v.length > 0;
    if (typeof v === "boolean") return v === true;
    if (typeof v === "object") return v !== null && Object.keys(v).length > 0;
    return false;
  });

  return hasAnyData ? "incomplete" : "not-started";
}
