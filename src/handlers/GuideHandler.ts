import { AdaptiveHint, Workflow, WorkflowPhase, GuideArgs, GuideAction, VALID_GUIDE_ACTIONS, MAX_CONTEXT_LENGTH, MAX_COMPLETED_LENGTH } from "../types";
import { AdaptiveLearningEngine } from "../behavioral-adoption/adaptive-learning-engine";
import { CelebrationGenerator } from "../behavioral-adoption/celebration-generator";
import { ProgressTracker } from "../behavioral-adoption/progress-tracker";
import { Milestone } from "../behavioral-adoption/progress-tracker";
import { PhaseCompletionDetector } from "../workflow/phase-completion";
import { ProgressDisplay } from "../workflow/progress-display";
import { WorkflowDetector } from "../workflow/workflow-detector";
import { OutputFormat, GuideResponseData, formatGuideAsText, createResponse } from "../output/formatters";

// Configuration constants
/** Probability of showing a success story for inspiration (0-1) */
const SUCCESS_STORY_PROBABILITY = 0.3;
/** Default estimated minutes per workflow (for completion tracking) */
const DEFAULT_WORKFLOW_DURATION_MINUTES = 30;

export interface ProgressInfo {
  completed: number;
  total: number;
  percentage: number;
  remaining: number;
}

export interface GuideHandlerDependencies {
  workflows: Map<string, Workflow>;
  getCurrentWorkflow: () => string;
  setCurrentWorkflow: (workflow: string) => void;
  getCurrentPhase: () => number;
  setCurrentPhase: (phase: number) => void;
  phaseProgress: Map<string, string[]>;
  learningEngine: AdaptiveLearningEngine;
  celebrationGenerator: CelebrationGenerator;
  progressTracker: ProgressTracker;
  detectWorkflowFromContext: (context?: string) => string;
  generateWorkflowSuggestion: (detectedWorkflow: string, context?: string) => string;
  saveWorkflowState: () => Promise<void>;
  recordProgress: (completed: string) => Promise<void>;
  getCurrentPhaseName: () => string;
  getWorkflowProgress: () => { completed: number; total: number };
  getTotalCompletedSteps: (workflow: Workflow) => number;
  formatAdaptiveHint: (hint: AdaptiveHint) => string;
  generateProgressSummary: (progress: ProgressInfo, justCompletedPhase: boolean, justMarkedDone: boolean) => string;
}

export class GuideHandler {
  constructor(private deps: GuideHandlerDependencies) {}

  /**
   * Validates and normalizes guide arguments
   */
  private validateArgs(args: unknown): { valid: true; args: GuideArgs } | { valid: false; error: string } {
    const safeArgs = (args && typeof args === 'object' ? args : {}) as Record<string, unknown>;

    // Validate action
    const action = (safeArgs.action as string) ?? "check";
    if (!VALID_GUIDE_ACTIONS.has(action as GuideAction)) {
      return { valid: false, error: `Invalid action: ${action}. Valid actions: ${Array.from(VALID_GUIDE_ACTIONS).join(", ")}` };
    }

    // Validate context length
    const context = safeArgs.context as string | undefined;
    if (context && context.length > MAX_CONTEXT_LENGTH) {
      return { valid: false, error: `Context too long (${context.length} chars). Maximum: ${MAX_CONTEXT_LENGTH}` };
    }

    // Validate completed length
    const completed = safeArgs.completed as string | undefined;
    if (completed && completed.length > MAX_COMPLETED_LENGTH) {
      return { valid: false, error: `Completed description too long (${completed.length} chars). Maximum: ${MAX_COMPLETED_LENGTH}` };
    }

    // Validate output_format
    const outputFormat = (safeArgs.output_format as string) ?? "text";
    if (outputFormat !== "text" && outputFormat !== "json") {
      return { valid: false, error: `Invalid output_format: ${outputFormat}. Valid formats: text, json` };
    }

    return {
      valid: true,
      args: {
        action: action as GuideAction,
        completed,
        context,
        output_format: outputFormat as "text" | "json"
      }
    };
  }

  async handleGuide(args: unknown): Promise<{ content: { type: string; text: string }[] }> {
    // Validate input
    const validation = this.validateArgs(args);
    if (!validation.valid) {
      const errorData: GuideResponseData = {
        action: "check",
        error: validation.error,
        workflow: { name: "", key: "" },
        phase: { name: "", guidance: "", number: 0, total: 0 },
        progress: { completed: 0, total: 0, percentage: 0, remaining: 0 },
        nextSteps: [],
        flags: { isPhaseComplete: false, isWorkflowComplete: false }
      };
      return createResponse(`❌ error | ${validation.error}`, errorData, "text", formatGuideAsText);
    }

    const { action, completed, context, output_format: outputFormat } = validation.args;

    // Record tool usage for learning
    this.deps.learningEngine.recordToolUsage("guide", validation.args);

    // Get workflow early so advance action can use it
    const workflow = this.deps.workflows.get(this.deps.getCurrentWorkflow());
    if (!workflow) {
      const errorData: GuideResponseData = {
        action,
        error: "No workflow loaded",
        suggestion: "Use 'approach set <workflow>' to choose a workflow",
        workflow: { name: "", key: "" },
        phase: { name: "", guidance: "", number: 0, total: 0 },
        progress: { completed: 0, total: 0, percentage: 0, remaining: 0 },
        nextSteps: [],
        flags: { isPhaseComplete: false, isWorkflowComplete: false }
      };
      return createResponse("❌ error | No workflow loaded", errorData, outputFormat, formatGuideAsText);
    }

    // Handle quick shortcuts
    if (action === "tdd") {
      this.deps.setCurrentWorkflow("tdd");
      this.deps.setCurrentPhase(0);
      this.deps.phaseProgress.clear();
      this.deps.learningEngine.recordWorkflowUsage("tdd", context);
      await this.deps.saveWorkflowState();
      return await this.handleGuide({ action: "check", output_format: outputFormat });
    }

    if (action === "bug") {
      this.deps.setCurrentWorkflow("bug-hunt");
      this.deps.setCurrentPhase(0);
      this.deps.phaseProgress.clear();
      this.deps.learningEngine.recordWorkflowUsage("bug-hunt", context);
      await this.deps.saveWorkflowState();
      return await this.handleGuide({ action: "check", output_format: outputFormat });
    }

    if (action === "next") {
      // Context-aware workflow detection
      if (context) {
        const suggestedWorkflow = this.deps.detectWorkflowFromContext(context);
        if (suggestedWorkflow !== this.deps.getCurrentWorkflow()) {
          this.deps.setCurrentWorkflow(suggestedWorkflow);
          this.deps.setCurrentPhase(0);
          this.deps.phaseProgress.clear();
          this.deps.learningEngine.recordWorkflowUsage(suggestedWorkflow, context);
          await this.deps.saveWorkflowState();
        }
      }
      return await this.handleGuide({ action: "check", output_format: outputFormat });
    }

    if (action === "advance") {
      // Manual phase advancement - let users skip to next phase when needed
      if (this.deps.getCurrentPhase() < workflow.phases.length - 1) {
        const previousPhase = workflow.phases[this.deps.getCurrentPhase()];
        this.deps.setCurrentPhase(this.deps.getCurrentPhase() + 1);
        const newPhase = workflow.phases[this.deps.getCurrentPhase()];

        // Record manual advancement for learning
        this.deps.learningEngine.recordToolUsage("guide-advance", { from: previousPhase.name, to: newPhase.name });

        // Generate phase entry celebration for new phase
        const phaseEntryCelebration = this.deps.celebrationGenerator.generatePhaseEntryCelebration(this.deps.getCurrentWorkflow(), newPhase.name);

        const advanceData: GuideResponseData = {
          action: "advance",
          previousPhase: previousPhase.name,
          currentPhase: {
            name: newPhase.name,
            guidance: newPhase.guidance,
            number: this.deps.getCurrentPhase() + 1,
            total: workflow.phases.length
          },
          workflow: { name: workflow.name, key: this.deps.getCurrentWorkflow() },
          phase: { name: newPhase.name, guidance: newPhase.guidance, number: this.deps.getCurrentPhase() + 1, total: workflow.phases.length },
          progress: { completed: 0, total: newPhase.suggestions.length, percentage: 0, remaining: newPhase.suggestions.length },
          nextSteps: newPhase.suggestions.slice(0, 3),
          flags: { isPhaseComplete: false, isWorkflowComplete: false },
          celebration: phaseEntryCelebration || undefined
        };

        const summary = `🔄 advance | ${workflow.name} | ${newPhase.name} (${this.deps.getCurrentPhase() + 1}/${workflow.phases.length})`;
        return createResponse(summary, advanceData, outputFormat, formatGuideAsText);
      } else {
        const errorData: GuideResponseData = {
          action: "advance",
          error: "Already in final phase",
          suggestion: "Complete remaining steps or start new workflow with 'approach set <workflow>'",
          workflow: { name: workflow.name, key: this.deps.getCurrentWorkflow() },
          phase: {
            name: workflow.phases[this.deps.getCurrentPhase()].name,
            guidance: workflow.phases[this.deps.getCurrentPhase()].guidance,
            number: this.deps.getCurrentPhase() + 1,
            total: workflow.phases.length
          },
          progress: { completed: 0, total: 0, percentage: 0, remaining: 0 },
          nextSteps: [],
          flags: { isPhaseComplete: false, isWorkflowComplete: false }
        };
        return createResponse("⚠️ advance | Already in final phase", errorData, outputFormat, formatGuideAsText);
      }
    }

    // Smart workflow detection for any context provided
    let workflowSuggestion = "";
    if (context && action === "check") {
      const detectedWorkflow = this.deps.detectWorkflowFromContext(context);
      workflowSuggestion = this.deps.generateWorkflowSuggestion(detectedWorkflow, context);
    }

    // Generate predictive hints based on learning
    let adaptiveHint: AdaptiveHint | null = null;
    if (action === "check") {
      const workflow = this.deps.workflows.get(this.deps.getCurrentWorkflow());
      if (workflow) {
        const predictiveContext = this.deps.learningEngine.generatePredictiveContext(
          this.deps.getCurrentWorkflow(),
          workflow.phases[this.deps.getCurrentPhase()]?.name || "unknown",
          context
        );
        adaptiveHint = this.deps.learningEngine.generateAdaptiveHint(predictiveContext);
      }
    }

    // Record progress tracking
    this.deps.progressTracker.recordProgressCheck();

    const phase = workflow.phases[this.deps.getCurrentPhase()];
    let progress = this.deps.phaseProgress.get(phase.name) || [];

    // Handle step completion with enhanced celebration
    let celebrationMessage = "";
    let newMilestones: Milestone[] = [];

    if (action === "done" && completed) {
      await this.deps.recordProgress(completed);
      progress = this.deps.phaseProgress.get(phase.name) || []; // Refresh progress after recording
      const stepMilestones = this.deps.progressTracker.recordStepCompletion(this.deps.getCurrentWorkflow(), completed);
      if (stepMilestones.length > 0) {
        newMilestones = [...newMilestones, ...stepMilestones];
      }

      // Generate celebration for completed step
      const celebrationContext = {
        workflowType: this.deps.getCurrentWorkflow(),
        phaseName: phase.name,
        stepDescription: completed,
        isPhaseComplete: progress.length >= phase.suggestions.length, // Check with updated progress
        isWorkflowComplete: false,
        newMilestones
      };

      celebrationMessage = this.deps.celebrationGenerator.generateCelebration(celebrationContext);
    }

    // Calculate remaining suggestions - use intelligent completion detection
    // Instead of requiring exact matches, track completion by counting user entries
    const remainingSuggestions = Math.max(0, phase.suggestions.length - progress.length);

    // Check if should advance to next phase
    // Enhanced phase completion logic with smarter semantic understanding

    // Check if phase is complete using comprehensive detection logic
    const isPhaseComplete = PhaseCompletionDetector.isPhaseComplete(this.deps.getCurrentWorkflow(), phase, progress, completed);

    const isWorkflowComplete = isPhaseComplete && this.deps.getCurrentPhase() >= workflow.phases.length - 1;

    if (isPhaseComplete && this.deps.getCurrentPhase() < workflow.phases.length - 1) {
      // Generate phase completion celebration
      const phaseCompletionContext = {
        workflowType: this.deps.getCurrentWorkflow(),
        phaseName: phase.name,
        isPhaseComplete: true,
        isWorkflowComplete: false
      };

      const phaseCompletionCelebration = this.deps.celebrationGenerator.generateCelebration(phaseCompletionContext);
      celebrationMessage = celebrationMessage ? `${celebrationMessage}\n\n${phaseCompletionCelebration}` : phaseCompletionCelebration;

      this.deps.setCurrentPhase(this.deps.getCurrentPhase() + 1);
      await this.deps.saveWorkflowState();

      // Add phase entry celebration for new phase
      if (this.deps.getCurrentPhase() < workflow.phases.length) {
        const newPhase = workflow.phases[this.deps.getCurrentPhase()];
        const phaseEntryCelebration = this.deps.celebrationGenerator.generatePhaseEntryCelebration(this.deps.getCurrentWorkflow(), newPhase.name);
        celebrationMessage = `${celebrationMessage}\n\n${phaseEntryCelebration}`;
      }

      // Don't recurse - continue with the flow to show the new phase
      // The rest of the method will handle building the response for the new phase
    }

    // Build enhanced response
    const currentPhase = workflow.phases[this.deps.getCurrentPhase()];
    const currentProgress = this.deps.phaseProgress.get(currentPhase.name) || [];

    // Calculate accurate progress using ProgressDisplay utilities
    const actualProgress = ProgressDisplay.calculateActualProgress(
      currentProgress,
      action,
      completed,
      isPhaseComplete,
      this.deps.getCurrentPhase()
    );

    // Show all suggestions - users can track progress by count rather than exact matches
    const currentRemaining = currentPhase.suggestions;

    // Build response object with optional celebration fields
    interface IntermediateResponse {
      workflow: string;
      phase: string;
      guidance: string;
      suggestions: string[];
      phase_number: string;
      progress: ProgressInfo;
      celebration?: string;
      tool_encouragement?: string;
      progress_encouragement?: string;
      success_inspiration?: string;
      workflow_completion?: string;
    }

    const response: IntermediateResponse = {
      workflow: workflow.name,
      phase: currentPhase.name,
      guidance: currentPhase.guidance,
      suggestions: currentRemaining,
      phase_number: `${this.deps.getCurrentPhase() + 1}/${workflow.phases.length}`,
      progress: ProgressDisplay.createProgressObject(
        actualProgress,
        currentPhase,
        this.deps.getCurrentPhase(),
        workflow.phases.length
      )
    };

    // Add celebration message if we have one
    if (celebrationMessage) {
      response.celebration = celebrationMessage;
    }

    // Add tool usage encouragement
    const toolEncouragement = this.deps.celebrationGenerator.generateToolUsageEncouragement("next");
    if (toolEncouragement) {
      response.tool_encouragement = toolEncouragement;
    }

    // Add progress encouragement
    const progressEncouragement = this.deps.progressTracker.getProgressEncouragement();
    if (progressEncouragement) {
      response.progress_encouragement = progressEncouragement;
    }

    // Add success story context (shown occasionally for inspiration)
    const successStory = this.deps.celebrationGenerator.generateSuccessStory(this.deps.getCurrentWorkflow());
    if (successStory && Math.random() < SUCCESS_STORY_PROBABILITY) {
      response.success_inspiration = successStory;
    }

    // Check for workflow completion
    if (isWorkflowComplete) {
      const totalStepsCompleted = this.deps.getTotalCompletedSteps(workflow);
      const completionMilestones = this.deps.progressTracker.recordWorkflowCompletion(
        this.deps.getCurrentWorkflow(),
        totalStepsCompleted,
        DEFAULT_WORKFLOW_DURATION_MINUTES // Could be enhanced with actual timing
      );
      if (completionMilestones.length > 0) {
        newMilestones = [...newMilestones, ...completionMilestones];
      }

      const workflowCompletionContext = {
        workflowType: this.deps.getCurrentWorkflow(),
        phaseName: currentPhase.name,
        isPhaseComplete: true,
        isWorkflowComplete: true,
        newMilestones
      };

      const completionCelebration = this.deps.celebrationGenerator.generateCelebration(workflowCompletionContext);
      response.workflow_completion = completionCelebration;

      // Record completion with learning engine for adaptive insights
      this.deps.learningEngine.recordWorkflowCompletion(
        this.deps.getCurrentWorkflow(),
        DEFAULT_WORKFLOW_DURATION_MINUTES,
        true // Success
      );

      this.deps.phaseProgress.clear();
      this.deps.setCurrentPhase(0);
    }

    // Build concise human-readable summary
    const actionEmoji = action === "done" ? "✅" : action === "check" ? "🔍" : "🎯";
    const completedSteps = actualProgress.completed ?? 0;
    const total = actualProgress.total ?? 0;
    const progressPercent = total > 0 ? Math.round((completedSteps / total) * 100) : 0;
    const summary = `${actionEmoji} ${action} | ${workflow.name} | ${currentPhase.name} (${this.deps.getCurrentPhase() + 1}/${workflow.phases.length}) | ${completedSteps}/${total} steps (${progressPercent}%)`;

    // Build structured data for agent consumption
    const structuredData: GuideResponseData = {
      action,
      workflow: {
        name: workflow.name,
        key: this.deps.getCurrentWorkflow(),
        description: workflow.description
      },
      phase: {
        name: currentPhase.name,
        guidance: currentPhase.guidance,
        number: this.deps.getCurrentPhase() + 1,
        total: workflow.phases.length
      },
      progress: {
        completed: completedSteps,
        total,
        percentage: progressPercent,
        remaining: total - completedSteps
      },
      nextSteps: response.suggestions || [],
      flags: {
        isPhaseComplete,
        isWorkflowComplete
      }
    };

    // Add optional fields only if they exist
    if (response.celebration) {
      structuredData.celebration = response.celebration;
    }
    if (adaptiveHint) {
      structuredData.adaptiveHint = {
        type: adaptiveHint.type,
        content: adaptiveHint.content,
        confidence: adaptiveHint.confidence
      };
    }
    if (workflowSuggestion) {
      structuredData.workflowSuggestion = workflowSuggestion;
    }
    if (response.progress_encouragement) {
      structuredData.encouragement = response.progress_encouragement;
    }
    if (response.workflow_completion) {
      structuredData.workflowCompletion = response.workflow_completion;
    }
    if (response.success_inspiration) {
      structuredData.inspiration = response.success_inspiration;
    }
    if (newMilestones.length > 0) {
      structuredData.milestones = newMilestones;
    }

    return createResponse(summary, structuredData, outputFormat, formatGuideAsText);
  }
}