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

// Phase 3: Adaptive Learning System Types

export interface WorkflowPattern {
  workflowType: string;
  completionRate: number;
  averageTimeMinutes: number;
  preferredPhaseOrder: string[];
  commonStuckPoints: string[];
  successfulStrategies: string[];
  lastUsed: Date;
  totalCompletions: number;
}

export interface ContextPattern {
  triggerWords: string[];
  chosenWorkflow: string;
  successRate: number;
  frequency: number;
  lastMatched: Date;
}

export interface UserBehaviorMetrics {
  totalSessionTime: number;
  averageSessionLength: number;
  toolUsageFrequency: Record<string, number>;
  preferredCelebrationLevel: string;
  workflowSwitchFrequency: number;
  contextAwarenessAccuracy: number;
  predictiveHintAcceptanceRate: number;
  flowModeUsage: number;
}

export interface UserProfile {
  userId: string;
  createdAt: Date;
  lastActive: Date;
  workflowPatterns: WorkflowPattern[];
  contextPatterns: ContextPattern[];
  behaviorMetrics: UserBehaviorMetrics;
  preferences: {
    defaultWorkflow: string;
    celebrationLevel: string;
    flowModeEnabled: boolean;
    predictiveHintsEnabled: boolean;
    learningEnabled: boolean;
  };
  personalizedSuggestions: string[];
  achievements: {
    id: string;
    name: string;
    description: string;
    unlockedAt: Date;
    category: string;
  }[];
}

export interface PredictiveContext {
  currentWorkflow: string;
  currentPhase: string;
  timeInPhase: number;
  recentActions: string[];
  userBehaviorProfile: UserBehaviorMetrics;
  sessionContext: string;
  workingTime: number;
  isStuck: boolean;
  confidence: number;
}

export interface AdaptiveHint {
  type: 'next-step' | 'workflow-suggestion' | 'optimization' | 'prevention' | 'encouragement';
  content: string;
  confidence: number;
  timing: 'immediate' | 'after-delay' | 'on-request' | 'predictive';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context: string;
  learningBasis: string[];
}

export interface FlowState {
  isActive: boolean;
  intensity: 'whisper' | 'gentle' | 'active';
  contextualAwareness: boolean;
  backgroundTracking: boolean;
  predictiveHints: boolean;
  lastHintTime: Date;
  hintCooldown: number;
  sessionFocus: string;
  interruptionCount: number;
}

export interface LearningSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  workflowsUsed: string[];
  contextsProvided: string[];
  hintsAccepted: number;
  hintsRejected: number;
  celebrationLevel: string;
  userSatisfactionSignals: number;
  productivityMetrics: {
    stepsCompleted: number;
    timeToCompletion: number;
    errorRate: number;
    flowStateTime: number;
  };
}

export interface WorkflowState {
  currentWorkflow: string;
  currentPhase: number;
  phaseProgress: Record<string, string[]>;
  lastUpdated: Date;
  sessionStartTime: Date;
}