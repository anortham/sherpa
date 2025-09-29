import { ProgressTracker, Milestone } from "./progress-tracker";

export interface CelebrationContext {
  workflowType: string;
  phaseName: string;
  stepDescription?: string;
  isPhaseComplete?: boolean;
  isWorkflowComplete?: boolean;
  newMilestones?: Milestone[];
}

/**
 * Simplified celebration generator focused on functional state markers and transitions
 * Removes randomization in favor of deterministic, clear progress acknowledgment
 */
export class CelebrationGenerator {
  private progressTracker: ProgressTracker;

  constructor(progressTracker: ProgressTracker, _encouragements?: any) {
    this.progressTracker = progressTracker;
    // encouragements parameter kept for backward compatibility but unused
  }

  /**
   * Generate functional state marker and transition cue
   */
  generateCelebration(context: CelebrationContext): string {
    const parts: string[] = [];

    // 1. MILESTONE ACHIEVEMENTS - Meaningful progress markers
    if (context.newMilestones && context.newMilestones.length > 0) {
      context.newMilestones.forEach(m => {
        parts.push(`${m.icon} MILESTONE UNLOCKED: ${m.name}`);
        parts.push(`   ${m.description}`);
      });
    }

    // 2. WORKFLOW COMPLETION - Major accomplishment
    if (context.isWorkflowComplete) {
      parts.push(`✓ Workflow complete: ${context.workflowType}`);
      parts.push(`   Systematic development produces code that works the first time.`);
      parts.push(`→ Start new task with \`guide next\` or choose workflow with \`approach set <workflow>\``);
      return parts.join('\n');
    }

    // 3. PHASE COMPLETION - Transition to next phase
    if (context.isPhaseComplete && !context.isWorkflowComplete) {
      parts.push(`✓ Phase complete: ${context.phaseName}`);
      parts.push(`   You followed the systematic process.`);
      parts.push(`→ Moving to next phase. Call \`guide check\` for your next steps.`);
      return parts.join('\n');
    }

    // 4. STEP COMPLETION - Acknowledge progress and provide next action
    if (context.stepDescription) {
      parts.push(`✓ Step complete: "${context.stepDescription}"`);

      // Add progress context
      const stats = this.progressTracker.getProgressStats();
      if (stats.totalStepsCompleted > 0) {
        parts.push(`   Progress: ${stats.totalStepsCompleted} steps, ${stats.totalWorkflowsCompleted} workflows completed`);
      }

      parts.push(`→ Continue with remaining steps. Call \`guide check\` when ready for next step.`);
    }

    return parts.join('\n');
  }

  /**
   * Generate simple phase entry marker
   */
  generatePhaseEntryCelebration(workflowType: string, phaseName: string): string {
    return `→ Starting ${phaseName} in ${workflowType} workflow`;
  }

  /**
   * No-op for backward compatibility - tool usage doesn't need celebration
   */
  generateToolUsageEncouragement(_toolName: string): string {
    return "";
  }

  /**
   * No-op for backward compatibility - reminders handled by instructions
   */
  generateReminder(_reminderType: string): string {
    return "";
  }

  /**
   * Simple workflow selection context
   */
  generateWorkflowSelectionMotivation(_availableWorkflows: string[]): string {
    return "Choose the workflow that matches your current task. Each workflow prevents specific failure modes.";
  }

  /**
   * Generate success story based on workflow type (evidence-based motivation)
   */
  generateSuccessStory(workflowType: string): string {
    const stories = {
      tdd: "Teams using TDD ship 60% fewer production bugs.",
      "bug-hunt": "Systematic debugging prevents 73% of recurring issues.",
      general: "Structured workflows complete features 2.5x faster with higher quality.",
      rapid: "Rapid prototyping decreases discovery time by 50%.",
      refactor: "Safe refactoring increases velocity by 35%.",
      planning: "Planning before coding prevents 80% of rework."
    };

    return stories[workflowType as keyof typeof stories] ||
           "Systematic workflows produce better outcomes.";
  }
}