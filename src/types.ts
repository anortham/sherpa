export interface WorkflowPhase {
  name: string;
  guidance: string;
  suggestions: string[];
}

export interface Workflow {
  name: string;
  description: string;
  trigger_hints?: string[];
  phases: WorkflowPhase[];
}

export interface ToolDescription {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface ServerInstructions {
  content: string;
  lastUpdated: Date;
  context?: {
    currentWorkflow?: string;
    workflowPhase?: number;
    encouragements?: string[];
  };
}