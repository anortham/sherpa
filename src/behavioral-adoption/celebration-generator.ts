import { ProgressTracker, Milestone } from "./progress-tracker";

export interface CelebrationContext {
  workflowType: string;
  phaseName: string;
  stepDescription?: string;
  isPhaseComplete?: boolean;
  isWorkflowComplete?: boolean;
  newMilestones?: Milestone[];
}

export class CelebrationGenerator {
  private progressTracker: ProgressTracker;
  private encouragements: any;

  constructor(progressTracker: ProgressTracker, encouragements: any) {
    this.progressTracker = progressTracker;
    this.encouragements = encouragements;
  }

  /**
   * Generate appropriate celebration message for the context
   */
  generateCelebration(context: CelebrationContext): string {
    const messages: string[] = [];

    // Add milestone celebrations first (highest priority)
    if (context.newMilestones && context.newMilestones.length > 0) {
      messages.push(...this.generateMilestoneCelebrations(context.newMilestones));
    }

    // Add workflow completion celebration
    if (context.isWorkflowComplete) {
      messages.push(this.generateWorkflowCompletionCelebration(context.workflowType));
    }

    // Add phase completion celebration
    if (context.isPhaseComplete) {
      messages.push(this.generatePhaseCompletionCelebration(context));
    }

    // Add step completion encouragement
    if (context.stepDescription) {
      messages.push(this.generateStepCompletionEncouragement(context));
    }

    // Add progress encouragement
    messages.push(this.generateProgressEncouragement());

    return messages.join("\n\n");
  }

  /**
   * Generate celebration for entering a new phase
   */
  generatePhaseEntryCelebration(workflowType: string, phaseName: string): string {
    const phaseKey = this.getPhaseKey(phaseName);
    const workflowEntries = this.encouragements.phaseEntry?.[workflowType];

    if (workflowEntries && workflowEntries[phaseKey]) {
      return workflowEntries[phaseKey];
    }

    // Fallback generic message
    return `🎯 Starting ${phaseName} - You're making excellent progress through the ${workflowType} workflow!`;
  }

  /**
   * Generate tool usage encouragement
   */
  generateToolUsageEncouragement(toolName: string): string {
    const toolEncouragements = this.encouragements.toolUsageEncouragement?.[toolName];

    if (toolEncouragements && toolEncouragements.length > 0) {
      return this.getRandomMessage(toolEncouragements);
    }

    // Fallback messages
    const fallbacks = {
      next: "🎯 Excellent workflow awareness! Checking progress keeps you oriented.",
      workflow: "🔄 Smart workflow selection! Choosing the right approach for each task."
    };

    return fallbacks[toolName as keyof typeof fallbacks] || "Great tool usage!";
  }

  /**
   * Generate contextual reminders
   */
  generateReminder(reminderType: string): string {
    const reminders = this.encouragements.reminderMessages?.[reminderType];

    if (reminders && reminders.length > 0) {
      return this.getRandomMessage(reminders);
    }

    return "";
  }

  /**
   * Generate motivation for workflow selection
   */
  generateWorkflowSelectionMotivation(availableWorkflows: string[]): string {
    const motivations = [
      "🎯 Choose your development adventure! Each workflow is optimized for different types of work.",
      "🏔️ Which summit will you climb today? Each workflow leads to development excellence.",
      "⚡ Select your approach! The right workflow makes all the difference in outcomes.",
      "🚀 Time to choose your development style! Each workflow offers unique advantages."
    ];

    const workflowDescriptions = {
      tdd: "🧪 TDD: Build bulletproof code with test-first confidence",
      "bug-hunt": "🐛 Bug Hunt: Systematically capture and eliminate issues",
      general: "📋 General: Balanced research → plan → implement approach",
      rapid: "🚀 Rapid: Fast exploration and learning iteration",
      refactor: "♻️ Refactor: Safe improvement with comprehensive test coverage"
    };

    const motivation = this.getRandomMessage(motivations);
    const descriptions = availableWorkflows
      .map(w => workflowDescriptions[w as keyof typeof workflowDescriptions])
      .filter(d => d)
      .join("\n");

    return `${motivation}\n\n${descriptions}`;
  }

  private generateMilestoneCelebrations(milestones: Milestone[]): string[] {
    return milestones.map(milestone => {
      const milestoneMessages = this.encouragements.milestones;
      if (milestoneMessages && milestoneMessages[milestone.id]) {
        return milestoneMessages[milestone.id];
      }
      return `${milestone.icon} MILESTONE: ${milestone.name}! ${milestone.description}`;
    });
  }

  private generateWorkflowCompletionCelebration(workflowType: string): string {
    const completionMessages = this.encouragements.workflowCompletion?.[workflowType];

    if (completionMessages && completionMessages.length > 0) {
      return this.getRandomMessage(completionMessages);
    }

    // Fallback celebration
    const fallbacks = {
      tdd: "🏆 TDD Mastery! You've built bulletproof code with comprehensive tests.",
      "bug-hunt": "🐛➡️✅ Bug Hunt Victory! Issue systematically resolved and protected.",
      general: "📋 General Development Excellence! Systematic and thoroughly professional.",
      rapid: "🚀 Rapid Innovation Complete! Fast learning with systematic documentation.",
      refactor: "♻️ Refactoring Excellence! Code improved without breaking functionality."
    };

    return fallbacks[workflowType as keyof typeof fallbacks] ||
           `🎉 ${workflowType} workflow completed excellently!`;
  }

  private generatePhaseCompletionCelebration(context: CelebrationContext): string {
    const phaseMessages = this.encouragements.progressMessages?.phaseComplete;

    if (phaseMessages && phaseMessages.length > 0) {
      return this.getRandomMessage(phaseMessages);
    }

    return `✅ ${context.phaseName} completed! Excellent systematic development.`;
  }

  private generateStepCompletionEncouragement(context: CelebrationContext): string {
    const stats = this.progressTracker.getProgressStats();
    const progressMessages = this.encouragements.progressMessages;

    if (!progressMessages) {
      return `✅ Step completed: "${context.stepDescription}"`;
    }

    // Choose message based on overall progress
    let messageType = "firstStep";
    if (stats.totalStepsCompleted > 10) {
      messageType = "midProgress";
    }
    if (stats.totalStepsCompleted > 50) {
      messageType = "nearCompletion";
    }

    const messages = progressMessages[messageType];
    if (messages && messages.length > 0) {
      const baseMessage = this.getRandomMessage(messages);
      return `✅ "${context.stepDescription}" - ${baseMessage}`;
    }

    return `✅ Step completed: "${context.stepDescription}"`;
  }

  private generateProgressEncouragement(): string {
    return this.progressTracker.getProgressEncouragement();
  }

  private getPhaseKey(phaseName: string): string {
    // Convert phase names to lowercase keys used in encouragements.json
    return phaseName
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove special characters
      .replace(/\s+/g, "-")    // Replace spaces with hyphens
      .replace(/^(📋|🧪|💻|♻️|🔍|🎯|🔧|📚|📝|✅|🚀|📐)/, ""); // Remove emoji prefixes
  }

  private getRandomMessage(messages: string[]): string {
    if (!messages || messages.length === 0) return "";
    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Generate success story based on workflow type
   */
  generateSuccessStory(workflowType: string): string {
    const stories = {
      tdd: "A team using TDD reduced production bugs by 67% and increased developer confidence dramatically.",
      "bug-hunt": "Systematic bug hunting helped Netflix reduce critical incidents by 73% through proper reproduction and testing.",
      general: "Teams using structured development workflows complete features 2.5x faster with higher quality.",
      rapid: "Shopify's rapid prototyping approach decreased feature development time by 50% through fast learning cycles.",
      refactor: "Strategic refactoring at GitHub increased development velocity by 35% and reduced onboarding time by 42%."
    };

    return stories[workflowType as keyof typeof stories] ||
           "Systematic workflow usage consistently leads to better outcomes and higher developer satisfaction.";
  }

  /**
   * Get celebration for specific achievement levels
   */
  getCelebrationForAchievement(achievementType: string, value: number): string {
    const celebrations = {
      steps_completed: [
        { threshold: 10, message: "🎯 10 steps completed! You're building excellent workflow habits." },
        { threshold: 25, message: "⚡ 25 steps! You're demonstrating real workflow discipline." },
        { threshold: 50, message: "🏆 50 steps! This is workflow mastery in action." },
        { threshold: 100, message: "🌟 100 steps! You're a workflow champion!" }
      ],
      workflows_completed: [
        { threshold: 1, message: "🎉 First workflow complete! You've experienced systematic development." },
        { threshold: 5, message: "🏆 5 workflows! You're becoming a workflow veteran." },
        { threshold: 10, message: "⭐ 10 workflows! True workflow mastery achieved." },
        { threshold: 25, message: "🌟 25 workflows! You're a systematic development expert!" }
      ]
    };

    const achievementCelebrations = celebrations[achievementType as keyof typeof celebrations];
    if (!achievementCelebrations) return "";

    // Find the highest threshold that the value meets
    const celebration = achievementCelebrations
      .reverse()
      .find(c => value >= c.threshold);

    return celebration?.message || "";
  }
}