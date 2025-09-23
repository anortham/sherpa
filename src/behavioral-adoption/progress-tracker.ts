export interface ProgressStats {
  totalWorkflowsCompleted: number;
  totalStepsCompleted: number;
  currentStreak: number;
  lastActivity: Date;
  workflowTypeUsage: Record<string, number>;
  averageStepsPerWorkflow: number;
  timeSpentInWorkflows: number; // minutes
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  achieved: boolean;
  achievedAt?: Date;
  icon: string;
}

export class ProgressTracker {
  private stats: ProgressStats;
  private milestones: Milestone[];

  constructor() {
    this.stats = this.initializeStats();
    this.milestones = this.initializeMilestones();
  }

  private initializeStats(): ProgressStats {
    return {
      totalWorkflowsCompleted: 0,
      totalStepsCompleted: 0,
      currentStreak: 0,
      lastActivity: new Date(),
      workflowTypeUsage: {},
      averageStepsPerWorkflow: 0,
      timeSpentInWorkflows: 0
    };
  }

  private initializeMilestones(): Milestone[] {
    return [
      {
        id: "first_workflow_completion",
        name: "First Workflow Mastery",
        description: "Complete your first full workflow",
        achieved: false,
        icon: "🎉"
      },
      {
        id: "five_workflows_completed",
        name: "Workflow Veteran",
        description: "Complete 5 workflows",
        achieved: false,
        icon: "🏆"
      },
      {
        id: "consistent_usage",
        name: "Workflow Discipline",
        description: "Use workflows consistently for a week",
        achieved: false,
        icon: "⭐"
      },
      {
        id: "workflow_diversity",
        name: "Multi-Workflow Mastery",
        description: "Successfully complete all 5 workflow types",
        achieved: false,
        icon: "🌟"
      },
      {
        id: "rapid_adoption",
        name: "Quick Learner",
        description: "Complete 3 workflows in your first day",
        achieved: false,
        icon: "🚀"
      },
      {
        id: "efficiency_master",
        name: "Efficiency Master",
        description: "Complete workflows 50% faster than average",
        achieved: false,
        icon: "⚡"
      }
    ];
  }

  /**
   * Record completion of a workflow step
   */
  recordStepCompletion(workflowType: string, stepDescription: string): Milestone[] {
    const activityTime = new Date();
    this.stats.totalStepsCompleted++;
    this.updateStreak(activityTime);
    this.stats.lastActivity = activityTime;
    this.trackWorkflowUsage(workflowType);
    return this.checkMilestones();
  }

  /**
   * Record completion of an entire workflow
   */
  recordWorkflowCompletion(workflowType: string, stepsCompleted: number, timeSpent: number): Milestone[] {
    const activityTime = new Date();
    this.stats.totalWorkflowsCompleted++;
    this.stats.timeSpentInWorkflows += timeSpent;
    this.updateAverageSteps(stepsCompleted);
    this.trackWorkflowUsage(workflowType);
    this.updateStreak(activityTime);
    this.stats.lastActivity = activityTime;
    return this.checkMilestones();
  }

  /**
   * Record when a user checks their workflow progress
   */
  recordProgressCheck(): void {
    this.stats.lastActivity = new Date();
  }

  /**
   * Get current progress statistics
   */
  getProgressStats(): ProgressStats {
    return { ...this.stats };
  }

  /**
   * Get achieved milestones
   */
  getAchievedMilestones(): Milestone[] {
    return this.milestones.filter(m => m.achieved);
  }

  /**
   * Get next milestone to achieve
   */
  getNextMilestone(): Milestone | null {
    return this.milestones.find(m => !m.achieved) || null;
  }

  /**
   * Check if any new milestones have been achieved
   */
  private checkMilestones(): Milestone[] {
    const newlyAchieved: Milestone[] = [];

    for (const milestone of this.milestones) {
      if (!milestone.achieved && this.isMilestoneAchieved(milestone)) {
        milestone.achieved = true;
        milestone.achievedAt = new Date();
        newlyAchieved.push(milestone);
      }
    }

    return newlyAchieved;
  }

  private isMilestoneAchieved(milestone: Milestone): boolean {
    switch (milestone.id) {
      case "first_workflow_completion":
        return this.stats.totalWorkflowsCompleted >= 1;

      case "five_workflows_completed":
        return this.stats.totalWorkflowsCompleted >= 5;

      case "consistent_usage":
        // Check if they've used workflows for several days in a row
        return this.stats.currentStreak >= 7;

      case "workflow_diversity":
        // Check if they've used all 5 main workflow types
        const workflowTypes = Object.keys(this.stats.workflowTypeUsage);
        const requiredTypes = ["tdd", "bug-hunt", "general", "rapid", "refactor"];
        return requiredTypes.every(type => workflowTypes.includes(type));

      case "rapid_adoption":
        // This would need session tracking - simplified for now
        return this.stats.totalWorkflowsCompleted >= 3;

      case "efficiency_master":
        // Check if average time per workflow is better than baseline
        return this.stats.averageStepsPerWorkflow > 0 &&
               this.stats.timeSpentInWorkflows / this.stats.totalWorkflowsCompleted < 30; // 30 min average

      default:
        return false;
    }
  }

  private updateStreak(activityTime: Date): void {
    const previousActivity = this.stats.lastActivity;
    const daysSinceLastActivity = Math.floor(
      (activityTime.getTime() - previousActivity.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (this.stats.currentStreak === 0) {
      this.stats.currentStreak = 1;
      return;
    }

    if (daysSinceLastActivity === 0) {
      this.stats.currentStreak = Math.max(1, this.stats.currentStreak);
    } else if (daysSinceLastActivity === 1) {
      this.stats.currentStreak = Math.max(1, this.stats.currentStreak) + 1;
    } else {
      this.stats.currentStreak = 1;
    }
  }

  private trackWorkflowUsage(workflowType: string): void {
    this.stats.workflowTypeUsage[workflowType] =
      (this.stats.workflowTypeUsage[workflowType] || 0) + 1;
  }

  private updateAverageSteps(stepsCompleted: number): void {
    const totalSteps = this.stats.averageStepsPerWorkflow * (this.stats.totalWorkflowsCompleted - 1) + stepsCompleted;
    this.stats.averageStepsPerWorkflow = totalSteps / this.stats.totalWorkflowsCompleted;
  }

  /**
   * Get encouragement message based on current progress
   */
  getProgressEncouragement(): string {
    const stats = this.stats;

    if (stats.totalWorkflowsCompleted === 0) {
      return "🎯 Ready to start your first workflow? Each step builds momentum!";
    }

    if (stats.currentStreak > 3) {
      return `🔥 Amazing ${stats.currentStreak}-day streak! You're building excellent workflow habits.`;
    }

    if (stats.totalStepsCompleted > 50) {
      return `💪 Incredible! ${stats.totalStepsCompleted} steps completed shows real workflow mastery.`;
    }

    return `📈 Great progress! ${stats.totalWorkflowsCompleted} workflows completed, ${stats.totalStepsCompleted} steps taken.`;
  }

  /**
   * Get personalized tips based on usage patterns
   */
  getPersonalizedTips(): string[] {
    const tips: string[] = [];

    // Analyze workflow type diversity
    const usedTypes = Object.keys(this.stats.workflowTypeUsage);
    if (usedTypes.length === 1) {
      tips.push("💡 Try exploring different workflows! Each type excels at different development tasks.");
    }

    // Check for consistency
    if (this.stats.currentStreak < 3) {
      tips.push("🎯 Try using workflows consistently for better habit formation!");
    }

    // Check for efficiency
    if (this.stats.averageStepsPerWorkflow > 0 && this.stats.averageStepsPerWorkflow < 3) {
      tips.push("⚡ Consider completing more steps per workflow for maximum benefit!");
    }

    return tips;
  }

  /**
   * Reset statistics (for testing or user preference)
   */
  resetStats(): void {
    this.stats = this.initializeStats();
    this.milestones.forEach(m => {
      m.achieved = false;
      delete m.achievedAt;
    });
  }
}
