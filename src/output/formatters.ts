/**
 * Output Formatters - Lean text output for AI consumption
 *
 * Inspired by miller's approach: text is the default, JSON for backward compatibility.
 * Text output is optimized for token efficiency and AI readability.
 */

export type OutputFormat = "text" | "json";

/**
 * Guide tool response data structure
 */
export interface GuideResponseData {
  action: string;
  workflow: {
    name: string;
    key: string;
    description?: string;
  };
  phase: {
    name: string;
    guidance: string;
    number: number;
    total: number;
  };
  progress: {
    completed: number;
    total: number;
    percentage: number;
    remaining: number;
  };
  nextSteps: string[];
  flags: {
    isPhaseComplete: boolean;
    isWorkflowComplete: boolean;
  };
  // Optional fields
  celebration?: string;
  adaptiveHint?: {
    type: string;
    content: string;
    confidence: number;
  };
  workflowSuggestion?: string;
  encouragement?: string;
  workflowCompletion?: string;
  inspiration?: string;
  milestones?: any[];
  // For advance action
  previousPhase?: string;
  currentPhase?: {
    name: string;
    guidance: string;
    number: number;
    total: number;
  };
  // For error states
  error?: string;
  suggestion?: string;
}

/**
 * Approach tool response data structure for list action
 */
export interface ApproachListData {
  action: "list";
  currentWorkflow: string;
  workflows: Array<{
    key: string;
    name: string;
    description: string;
    phases: number;
    triggerHints: string[];
  }>;
  stats: {
    workflowsCompleted: number;
    stepsCompleted: number;
  };
  motivation?: string;
  tips?: string[];
  insights?: string[];
}

/**
 * Approach tool response data structure for set action
 */
export interface ApproachSetData {
  action: "set";
  previousWorkflow: string;
  currentWorkflow: {
    key: string;
    name: string;
    description: string;
    totalPhases: number;
  };
  firstPhase: {
    name: string;
    guidance: string;
    firstSteps: string[];
  };
  celebration?: string;
  inspiration?: string;
}

/**
 * Approach tool response data structure for error
 */
export interface ApproachErrorData {
  action: "set";
  error: string;
  requested: string;
  available: string[];
}

export type ApproachResponseData = ApproachListData | ApproachSetData | ApproachErrorData;

/**
 * Format guide response as lean text
 *
 * Output format:
 * ```
 * [workflow] phase N/M | progress%
 *
 * Phase: phase name
 * guidance text
 *
 * Next:
 * - step 1
 * - step 2
 * - step 3
 *
 * [celebration/hint if present]
 * ```
 */
export function formatGuideAsText(data: GuideResponseData): string {
  const lines: string[] = [];

  // Handle error state
  if (data.error) {
    lines.push(`error: ${data.error}`);
    if (data.suggestion) {
      lines.push(`→ ${data.suggestion}`);
    }
    return lines.join("\n");
  }

  // Handle advance action
  if (data.action === "advance" && data.previousPhase && data.currentPhase) {
    lines.push(`${data.workflow.key} ${data.currentPhase.number}/${data.currentPhase.total}`);
    lines.push("");
    lines.push(`Advanced: ${data.previousPhase} → ${data.currentPhase.name}`);
    lines.push(data.currentPhase.guidance);
    if (data.nextSteps && data.nextSteps.length > 0) {
      lines.push("");
      lines.push("Next:");
      data.nextSteps.forEach(step => lines.push(`- ${step}`));
    }
    if (data.celebration) {
      lines.push("");
      lines.push(data.celebration);
    }
    return lines.join("\n");
  }

  // Header: workflow + phase progress
  const { workflow, phase, progress } = data;
  lines.push(`${workflow.key} ${phase.number}/${phase.total} | ${progress.percentage}%`);

  // Phase info
  lines.push("");
  lines.push(`${phase.name}`);
  lines.push(phase.guidance);

  // Next steps
  if (data.nextSteps && data.nextSteps.length > 0) {
    lines.push("");
    lines.push("Next:");
    data.nextSteps.forEach(step => lines.push(`- ${step}`));
  }

  // Celebration (if marking done)
  if (data.celebration) {
    lines.push("");
    lines.push(data.celebration);
  }

  // Adaptive hint
  if (data.adaptiveHint) {
    lines.push("");
    lines.push(`💡 ${data.adaptiveHint.content}`);
  }

  // Workflow suggestion
  if (data.workflowSuggestion) {
    lines.push("");
    lines.push(data.workflowSuggestion);
  }

  // Workflow completion
  if (data.workflowCompletion) {
    lines.push("");
    lines.push(data.workflowCompletion);
  }

  // Milestones
  if (data.milestones && data.milestones.length > 0) {
    lines.push("");
    data.milestones.forEach(m => lines.push(`🏆 ${m.name || m}`));
  }

  return lines.join("\n");
}

/**
 * Format approach response as lean text
 *
 * List output format:
 * ```
 * Workflows (current: general):
 *
 * tdd - Test-Driven Development
 *   Build reliable software through testing first
 *
 * bug-hunt - Bug Hunt
 *   Systematic debugging and issue resolution
 * ```
 *
 * Set output format:
 * ```
 * → tdd (Test-Driven Development)
 *
 * Phase 1: 🔴 Red Phase
 * Write a failing test that describes the desired behavior
 *
 * Start with:
 * - Create test file
 * - Write simple assertion
 * ```
 */
export function formatApproachAsText(data: ApproachResponseData): string {
  const lines: string[] = [];

  // Handle error
  if ("error" in data) {
    lines.push(`error: ${data.error}`);
    lines.push(`requested: ${data.requested}`);
    lines.push("");
    lines.push("Available:");
    data.available.forEach(w => lines.push(`- ${w}`));
    return lines.join("\n");
  }

  // Handle list
  if (data.action === "list") {
    const listData = data as ApproachListData;
    lines.push(`Workflows (current: ${listData.currentWorkflow}):`);
    lines.push("");

    listData.workflows.forEach(wf => {
      lines.push(`${wf.key} - ${wf.name} (${wf.phases} phases)`);
      lines.push(`  ${wf.description}`);
      if (wf.triggerHints.length > 0) {
        lines.push(`  triggers: ${wf.triggerHints.join(", ")}`);
      }
      lines.push("");
    });

    if (listData.stats.workflowsCompleted > 0) {
      lines.push(`Stats: ${listData.stats.workflowsCompleted} workflows, ${listData.stats.stepsCompleted} steps completed`);
    }

    if (listData.tips && listData.tips.length > 0) {
      lines.push("");
      lines.push("Tips:");
      listData.tips.forEach(tip => lines.push(`- ${tip}`));
    }

    return lines.join("\n");
  }

  // Handle set
  const setData = data as ApproachSetData;
  const isSwitch = setData.previousWorkflow !== setData.currentWorkflow.key;

  if (isSwitch) {
    lines.push(`→ ${setData.previousWorkflow} → ${setData.currentWorkflow.key}`);
  } else {
    lines.push(`→ ${setData.currentWorkflow.key} (restarted)`);
  }
  lines.push(`${setData.currentWorkflow.name}`);
  lines.push("");

  lines.push(`Phase 1: ${setData.firstPhase.name}`);
  lines.push(setData.firstPhase.guidance);
  lines.push("");

  lines.push("Start with:");
  setData.firstPhase.firstSteps.forEach(step => lines.push(`- ${step}`));

  if (setData.celebration) {
    lines.push("");
    lines.push(setData.celebration);
  }

  return lines.join("\n");
}

/**
 * Helper to create MCP response with format handling
 */
export function createResponse(
  summary: string,
  data: any,
  outputFormat: OutputFormat = "text",
  textFormatter: (data: any) => string
): { content: { type: string; text: string }[] } {
  if (outputFormat === "json") {
    // Backward compatible: summary + JSON
    return {
      content: [
        {
          type: "text",
          text: `${summary}\n\n${JSON.stringify(data, null, 2)}`
        }
      ]
    };
  }

  // Default: lean text output
  return {
    content: [
      {
        type: "text",
        text: textFormatter(data)
      }
    ]
  };
}
