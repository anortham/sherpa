/**
 * Workflow YAML Schema Validator
 *
 * Validates workflow structure at runtime to catch configuration errors early.
 * Uses TypeScript runtime checks instead of external validation libraries.
 */

import { Workflow, WorkflowPhase } from "../types";

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  workflow?: Workflow;
}

/**
 * Validates a parsed workflow object against the expected schema
 */
export function validateWorkflow(data: unknown, source: string = "workflow"): ValidationResult {
  const errors: ValidationError[] = [];

  // Check if data is an object
  if (!data || typeof data !== "object") {
    return {
      valid: false,
      errors: [{ path: source, message: "Workflow must be an object" }]
    };
  }

  const obj = data as Record<string, unknown>;

  // Validate required string fields
  if (!obj.name || typeof obj.name !== "string" || obj.name.trim() === "") {
    errors.push({ path: `${source}.name`, message: "Workflow name is required and must be a non-empty string" });
  }

  if (!obj.description || typeof obj.description !== "string" || obj.description.trim() === "") {
    errors.push({ path: `${source}.description`, message: "Workflow description is required and must be a non-empty string" });
  }

  // Validate optional trigger_hints
  if (obj.trigger_hints !== undefined) {
    if (!Array.isArray(obj.trigger_hints)) {
      errors.push({ path: `${source}.trigger_hints`, message: "trigger_hints must be an array" });
    } else {
      obj.trigger_hints.forEach((hint, index) => {
        if (typeof hint !== "string") {
          errors.push({ path: `${source}.trigger_hints[${index}]`, message: "trigger_hints must contain only strings" });
        }
      });
    }
  }

  // Validate phases (required)
  if (!obj.phases) {
    errors.push({ path: `${source}.phases`, message: "Workflow must have a 'phases' array" });
  } else if (!Array.isArray(obj.phases)) {
    errors.push({ path: `${source}.phases`, message: "phases must be an array" });
  } else if (obj.phases.length === 0) {
    errors.push({ path: `${source}.phases`, message: "Workflow must have at least one phase" });
  } else {
    // Validate each phase
    (obj.phases as unknown[]).forEach((phase, index) => {
      const phaseErrors = validatePhase(phase, `${source}.phases[${index}]`);
      errors.push(...phaseErrors);
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Type assertion after validation
  return {
    valid: true,
    errors: [],
    workflow: {
      name: obj.name as string,
      description: obj.description as string,
      trigger_hints: (obj.trigger_hints as string[] | undefined),
      phases: (obj.phases as WorkflowPhase[])
    }
  };
}

/**
 * Validates a single workflow phase
 */
function validatePhase(data: unknown, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== "object") {
    return [{ path, message: "Phase must be an object" }];
  }

  const phase = data as Record<string, unknown>;

  // Validate phase name
  if (!phase.name || typeof phase.name !== "string" || phase.name.trim() === "") {
    errors.push({ path: `${path}.name`, message: "Phase name is required and must be a non-empty string" });
  }

  // Validate phase guidance
  if (!phase.guidance || typeof phase.guidance !== "string" || phase.guidance.trim() === "") {
    errors.push({ path: `${path}.guidance`, message: "Phase guidance is required and must be a non-empty string" });
  }

  // Validate suggestions (required, must have at least one)
  if (!phase.suggestions) {
    errors.push({ path: `${path}.suggestions`, message: "Phase must have a 'suggestions' array" });
  } else if (!Array.isArray(phase.suggestions)) {
    errors.push({ path: `${path}.suggestions`, message: "suggestions must be an array" });
  } else if (phase.suggestions.length === 0) {
    errors.push({ path: `${path}.suggestions`, message: "Phase must have at least one suggestion" });
  } else {
    (phase.suggestions as unknown[]).forEach((suggestion, index) => {
      if (typeof suggestion !== "string" || suggestion.trim() === "") {
        errors.push({
          path: `${path}.suggestions[${index}]`,
          message: "Each suggestion must be a non-empty string"
        });
      }
    });
  }

  return errors;
}

/**
 * Formats validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map(e => `  - ${e.path}: ${e.message}`).join("\n");
}
