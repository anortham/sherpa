import { Workflow } from "../types";
import { AdaptiveLearningEngine } from "../behavioral-adoption/adaptive-learning-engine";
import { CelebrationGenerator } from "../behavioral-adoption/celebration-generator";
import { ProgressTracker } from "../behavioral-adoption/progress-tracker";
import { WorkflowDetector } from "../workflow/workflow-detector";

export interface ApproachHandlerDependencies {
  workflows: Map<string, Workflow>;
  getCurrentWorkflow: () => string;
  setCurrentWorkflow: (workflow: string) => void;
  getCurrentPhase: () => number;
  setCurrentPhase: (phase: number) => void;
  phaseProgress: Map<string, string[]>;
  learningEngine: AdaptiveLearningEngine;
  celebrationGenerator: CelebrationGenerator;
  progressTracker: ProgressTracker;
  saveWorkflowState: () => Promise<void>;
}

export class ApproachHandler {
  constructor(private deps: ApproachHandlerDependencies) {}

  async handleApproach(args: any) {
    const safeArgs = args ?? {};
    const set = safeArgs.set ?? "list";

    // Record tool usage for learning
    this.deps.learningEngine.recordToolUsage("approach", safeArgs);

    if (set === "list") {
      const workflowList = Array.from(this.deps.workflows.entries()).map(([key, wf]) => ({
        key,
        name: wf.name,
        description: wf.description,
        phases: wf.phases.length,
        trigger_hints: wf.trigger_hints || []
      }));

      // Generate motivational selection message
      const selectionMotivation = this.deps.celebrationGenerator.generateWorkflowSelectionMotivation(
        Array.from(this.deps.workflows.keys())
      );

      // Add tool usage encouragement
      const toolEncouragement = this.deps.celebrationGenerator.generateToolUsageEncouragement("workflow");

      // Get progress stats for context
      const progressStats = this.deps.progressTracker.getProgressStats();
      const personalizedTips = this.deps.progressTracker.getPersonalizedTips();

      // Build concise summary
      const summary = `📋 list | ${workflowList.length} workflows available | current: ${this.deps.getCurrentWorkflow()}`;

      // Build structured data
      const structuredData: any = {
        action: "list",
        currentWorkflow: this.deps.getCurrentWorkflow(),
        workflows: workflowList.map(wf => ({
          key: wf.key,
          name: wf.name,
          description: wf.description,
          phases: wf.phases,
          triggerHints: wf.trigger_hints
        })),
        stats: {
          workflowsCompleted: progressStats.totalWorkflowsCompleted,
          stepsCompleted: progressStats.totalStepsCompleted
        }
      };

      // Add optional fields
      if (selectionMotivation) {
        structuredData.motivation = selectionMotivation;
      }
      if (personalizedTips && personalizedTips.length > 0) {
        structuredData.tips = personalizedTips;
      }

      const learningInsights = this.deps.learningEngine.getPersonalizedSuggestions();
      if (learningInsights.length > 0) {
        structuredData.insights = learningInsights;
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

    if (!this.deps.workflows.has(set)) {
      const availableWorkflows = Array.from(this.deps.workflows.keys());
      const summary = `❌ set | Workflow not found: ${set}`;

      return {
        content: [
          {
            type: "text",
            text: `${summary}\n\n` + JSON.stringify({
              action: "set",
              error: "Workflow not found",
              requested: set,
              available: availableWorkflows
            }, null, 2)
          }
        ]
      };
    }

    // Switch workflow with celebration
    const previousWorkflow = this.deps.getCurrentWorkflow();
    this.deps.setCurrentWorkflow(set);
    this.deps.setCurrentPhase(0);
    this.deps.phaseProgress.clear();

    // Save state after workflow change
    await this.deps.saveWorkflowState();

    // Record workflow usage for learning
    this.deps.learningEngine.recordWorkflowUsage(set);

    const workflow = this.deps.workflows.get(set)!;

    // Generate contextual content
    const phaseEntryCelebration = this.deps.celebrationGenerator.generatePhaseEntryCelebration(
      this.deps.getCurrentWorkflow(),
      workflow.phases[0].name
    );
    const successStory = this.deps.celebrationGenerator.generateSuccessStory(this.deps.getCurrentWorkflow());

    // Build concise summary
    const isSwitch = previousWorkflow !== set;
    const summary = isSwitch
      ? `🔄 set | ${previousWorkflow} → ${set} | Starting ${workflow.phases[0].name}`
      : `🎯 set | ${set} | Restarting ${workflow.phases[0].name}`;

    // Build structured data
    const structuredData: any = {
      action: "set",
      previousWorkflow,
      currentWorkflow: {
        key: set,
        name: workflow.name,
        description: workflow.description,
        totalPhases: workflow.phases.length
      },
      firstPhase: {
        name: workflow.phases[0].name,
        guidance: workflow.phases[0].guidance,
        firstSteps: workflow.phases[0].suggestions.slice(0, 3)
      }
    };

    // Add optional fields
    if (phaseEntryCelebration) {
      structuredData.celebration = phaseEntryCelebration;
    }
    if (successStory) {
      structuredData.inspiration = successStory;
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