import { AdaptiveHint, Workflow } from "../types";
import { AdaptiveLearningEngine } from "../behavioral-adoption/adaptive-learning-engine";
import { CelebrationGenerator } from "../behavioral-adoption/celebration-generator";
import { ProgressTracker } from "../behavioral-adoption/progress-tracker";
import { PhaseCompletionDetector } from "../workflow/phase-completion";
import { ProgressDisplay } from "../workflow/progress-display";
import { WorkflowDetector } from "../workflow/workflow-detector";

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
  generateProgressSummary: (progress: any, justCompletedPhase: boolean, justMarkedDone: boolean) => string;
}

export class GuideHandler {
  constructor(private deps: GuideHandlerDependencies) {}

  async handleGuide(args: any): Promise<{ content: { type: string; text: string }[] }> {
    const safeArgs = args ?? {};
    const action = safeArgs.action ?? "check";
    const completed = safeArgs.completed;
    const context = safeArgs.context;

    // Record tool usage for learning
    this.deps.learningEngine.recordToolUsage("guide", safeArgs);

    // Get workflow early so advance action can use it
    const workflow = this.deps.workflows.get(this.deps.getCurrentWorkflow());
    if (!workflow) {
      return {
        content: [
          {
            type: "text",
            text: "❌ error | No workflow loaded\n\n" + JSON.stringify({
              error: "No workflow loaded",
              action: "Use 'approach set <workflow>' to choose a workflow"
            }, null, 2)
          }
        ]
      };
    }

    // Handle quick shortcuts
    if (action === "tdd") {
      this.deps.setCurrentWorkflow("tdd");
      this.deps.setCurrentPhase(0);
      this.deps.phaseProgress.clear();
      this.deps.learningEngine.recordWorkflowUsage("tdd", context);
      await this.deps.saveWorkflowState();
      return await this.handleGuide({ action: "check" });
    }

    if (action === "bug") {
      this.deps.setCurrentWorkflow("bug-hunt");
      this.deps.setCurrentPhase(0);
      this.deps.phaseProgress.clear();
      this.deps.learningEngine.recordWorkflowUsage("bug-hunt", context);
      await this.deps.saveWorkflowState();
      return await this.handleGuide({ action: "check" });
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
      return await this.handleGuide({ action: "check" });
    }

    if (action === "advance") {
      // Manual phase advancement - let users skip to next phase when needed
      if (this.deps.getCurrentPhase() < workflow.phases.length - 1) {
        const previousPhase = workflow.phases[this.deps.getCurrentPhase()];
        this.deps.setCurrentPhase(this.deps.getCurrentPhase() + 1);
        const newPhase = workflow.phases[this.deps.getCurrentPhase()];

        // Record manual advancement for learning
        this.deps.learningEngine.recordToolUsage("guide-advance", { from: previousPhase.name, to: newPhase.name });

        // Generate phase transition celebration
        const phaseAdvancementCelebration = `🔄 **Advanced from ${previousPhase.name} to ${newPhase.name}**\n\nSometimes you need to move forward manually - that's perfectly fine! Let's focus on the next phase.`;

        // Generate phase entry celebration for new phase
        const phaseEntryCelebration = this.deps.celebrationGenerator.generatePhaseEntryCelebration(this.deps.getCurrentWorkflow(), newPhase.name);

        let advancementMessage = phaseAdvancementCelebration;
        if (phaseEntryCelebration) {
          advancementMessage += `\n\n${phaseEntryCelebration}`;
        }

        const summary = `🔄 advance | ${workflow.name} | ${newPhase.name} (${this.deps.getCurrentPhase() + 1}/${workflow.phases.length})`;
        return {
          content: [
            {
              type: "text",
              text: `${summary}\n\n` + JSON.stringify({
                action: "advance",
                previousPhase: previousPhase.name,
                currentPhase: {
                  name: newPhase.name,
                  guidance: newPhase.guidance,
                  number: this.deps.getCurrentPhase() + 1,
                  total: workflow.phases.length
                },
                nextSteps: newPhase.suggestions.slice(0, 3),
                celebration: phaseEntryCelebration || advancementMessage
              }, null, 2)
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: "⚠️ advance | Already in final phase\n\n" + JSON.stringify({
                action: "advance",
                error: "Already in final phase",
                currentPhase: {
                  name: workflow.phases[this.deps.getCurrentPhase()].name,
                  number: this.deps.getCurrentPhase() + 1,
                  total: workflow.phases.length
                },
                suggestion: "Complete remaining steps or start new workflow with 'approach set <workflow>'"
              }, null, 2)
            }
          ]
        };
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
    let newMilestones: any[] = [];

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

    let response: any = {
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

    // Add success story context
    const successStory = this.deps.celebrationGenerator.generateSuccessStory(this.deps.getCurrentWorkflow());
    if (successStory && Math.random() < 0.3) { // Show occasionally for inspiration
      response.success_inspiration = successStory;
    }

    // Check for workflow completion
    if (isWorkflowComplete) {
      const totalStepsCompleted = this.deps.getTotalCompletedSteps(workflow);
      const completionMilestones = this.deps.progressTracker.recordWorkflowCompletion(
        this.deps.getCurrentWorkflow(),
        totalStepsCompleted,
        30 // Estimate 30 minutes - could be enhanced with actual timing
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
        30, // Duration in minutes
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
    const structuredData: any = {
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

    return {
      content: [
        {
          type: "text",
          text: `${summary}\n\n${JSON.stringify(structuredData, null, 2)}`
        }
      ]
    };
  }
}