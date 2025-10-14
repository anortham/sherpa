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

      // Convert to natural language format
      let approachResponse = "";

      // Add motivation
      if (selectionMotivation) {
        approachResponse += `${selectionMotivation}\n\n`;
      }

      // Add current workflow
      approachResponse += `**Current approach**: ${this.deps.getCurrentWorkflow()}\n\n`;

      // Add available workflows
      approachResponse += "**Available approaches:**\n";
      workflowList.forEach(workflow => {
        const hints = workflow.trigger_hints.length > 0 ? ` (${workflow.trigger_hints.join(", ")})` : "";
        approachResponse += `• **${workflow.key}**: ${workflow.description}${hints}\n`;
      });
      approachResponse += "\n";

      // Add progress stats
      if (progressStats.totalWorkflowsCompleted > 0) {
        approachResponse += `**Your progress**: ${progressStats.totalWorkflowsCompleted} workflows completed, ${progressStats.totalStepsCompleted} steps total\n\n`;
      }

      // Add personalized tips if available
      if (personalizedTips && personalizedTips.length > 0) {
        approachResponse += "**Personalized suggestions:**\n";
        personalizedTips.forEach((tip: string) => {
          approachResponse += `• ${tip}\n`;
        });
        approachResponse += "\n";
      }

      // Add adaptive learning insights
      const learningInsights = this.deps.learningEngine.getPersonalizedSuggestions();
      if (learningInsights.length > 0) {
        approachResponse += "**Smart insights from your patterns:**\n";
        learningInsights.forEach(insight => {
          approachResponse += `• ${insight}\n`;
        });
        approachResponse += "\n";
      }

      // Add explicit next action guidance
      approachResponse += `🎯 **Next Action**: Choose a workflow with \`approach set <name>\` (e.g., \`approach set tdd\`), then call \`guide check\` to get your first step.\n\n`;
      approachResponse += `💡 **Remember**: Each workflow is optimized for specific goals - pick the one that matches your current task!`;

      return {
        content: [
          {
            type: "text",
            text: approachResponse.trim()
          }
        ]
      };
    }

    if (!this.deps.workflows.has(set)) {
      // Enhanced error with helpful guidance
      const availableWorkflows = Array.from(this.deps.workflows.keys());
      const suggestion = availableWorkflows.length > 0 ?
        `Try one of these proven workflows: ${availableWorkflows.join(", ")}` :
        "No workflows available. Please check your ~/.sherpa/workflows/ directory.";

      return {
        content: [
          {
            type: "text",
            text: `🎯 Workflow "${set}" not found! ${suggestion}\n\nEach workflow offers unique advantages for different development scenarios. Choose wisely for maximum impact!`
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

    // Generate workflow switch celebration
    const switchCelebration = previousWorkflow !== set ?
      `🔄 Excellent choice! Switching from ${previousWorkflow} to ${workflow.name} workflow.` :
      `🎯 Continuing with ${workflow.name} workflow - great systematic approach!`;

    // Generate phase entry celebration
    const phaseEntryCelebration = this.deps.celebrationGenerator.generatePhaseEntryCelebration(
      this.deps.getCurrentWorkflow(),
      workflow.phases[0].name
    );

    // Get workflow-specific success story
    const successStory = this.deps.celebrationGenerator.generateSuccessStory(this.deps.getCurrentWorkflow());

    // Add tool usage encouragement
    const toolEncouragement = this.deps.celebrationGenerator.generateToolUsageEncouragement("workflow");

    // Convert to natural language format
    let switchResponse = "";

    // Add switch celebration
    switchResponse += `${switchCelebration}\n\n`;

    // Add phase entry celebration
    if (phaseEntryCelebration) {
      switchResponse += `${phaseEntryCelebration}\n\n`;
    }

    // Add workflow details
    switchResponse += `**${workflow.name}**\n`;
    switchResponse += `${workflow.description}\n\n`;

    // Add first phase info
    switchResponse += `**Starting with**: ${workflow.phases[0].name}\n`;
    switchResponse += `${workflow.phases[0].guidance}\n\n`;

    // Add first few suggestions
    if (workflow.phases[0].suggestions.length > 0) {
      switchResponse += "**First steps:**\n";
      workflow.phases[0].suggestions.slice(0, 3).forEach((suggestion: string) => {
        switchResponse += `• ${suggestion}\n`;
      });
      switchResponse += "\n";
    }

    // Add success inspiration if available
    if (successStory) {
      switchResponse += `💡 **Inspiration**: ${successStory}\n\n`;
    }

    // Add explicit next action guidance
    switchResponse += `🎯 **Next Action**: Call \`guide check\` to get your specific next step and start building momentum!\n\n`;
    switchResponse += `💡 **Remember**: Work through the steps, then use \`guide done "description"\` after each completion to track progress and get encouragement.`;

    return {
      content: [
        {
          type: "text",
          text: switchResponse.trim()
        }
      ]
    };
  }
}