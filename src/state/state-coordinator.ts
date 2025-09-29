import { WorkflowStateManager } from '../workflow/workflow-state-manager';
import { ProgressTracker } from '../behavioral-adoption/progress-tracker';
import { AdaptiveLearningEngine } from '../behavioral-adoption/adaptive-learning-engine';

/**
 * Coordinates state persistence across all Sherpa systems
 * Ensures atomic saves and consistent state across restarts
 */
export class StateCoordinator {
  constructor(
    private workflowStateManager: WorkflowStateManager,
    private progressTracker: ProgressTracker,
    private learningEngine: AdaptiveLearningEngine
  ) {}

  /**
   * Save all state systems atomically
   * Uses Promise.allSettled to ensure all saves attempt even if one fails
   */
  async saveAll(
    currentWorkflow: string,
    currentPhase: number,
    phaseProgress: Map<string, string[]>
  ): Promise<{ success: boolean; errors: string[] }> {
    const results = await Promise.allSettled([
      this.workflowStateManager.saveWorkflowState(currentWorkflow, currentPhase, phaseProgress),
      this.progressTracker.saveState(),
      this.learningEngine.saveUserProfile()
    ]);

    const errors: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const systemNames = ['WorkflowStateManager', 'ProgressTracker', 'AdaptiveLearningEngine'];
        errors.push(`${systemNames[index]}: ${result.reason}`);
      }
    });

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Load all state systems
   * Returns null for systems that fail to load (will use defaults)
   */
  async loadAll(): Promise<{
    workflowState: {
      currentWorkflow: string;
      currentPhase: number;
      phaseProgress: Map<string, string[]>;
    } | null;
    progressLoaded: boolean;
    learningLoaded: boolean;
  }> {
    const [workflowResult, progressResult, learningResult] = await Promise.allSettled([
      this.workflowStateManager.loadWorkflowState(),
      this.progressTracker.waitForLoad(),
      this.learningEngine.loadUserProfile()
    ]);

    return {
      workflowState: workflowResult.status === 'fulfilled' ? workflowResult.value : null,
      progressLoaded: progressResult.status === 'fulfilled',
      learningLoaded: learningResult.status === 'fulfilled'
    };
  }

  /**
   * Clear all persisted state (useful for testing or user reset)
   */
  async clearAll(): Promise<void> {
    await Promise.allSettled([
      this.workflowStateManager.clearWorkflowState(),
      this.progressTracker.resetStats(),
      // Note: AdaptiveLearningEngine doesn't have a clear method
      // Users would need to manually delete ~/.sherpa/user-profile.json
    ]);
  }

  /**
   * Get status of all state systems
   * Useful for debugging and status checks
   */
  getStateStatus(): {
    workflow: { currentWorkflow: string; currentPhase: number };
    progress: { totalWorkflows: number; totalSteps: number; currentStreak: number };
    learning: { totalSessions: number; workflowsTracked: number };
  } {
    const progressStats = this.progressTracker.getProgressStats();
    const userProfile = this.learningEngine.getUserProfile();

    return {
      workflow: {
        currentWorkflow: 'unknown', // Will be filled by server
        currentPhase: 0
      },
      progress: {
        totalWorkflows: progressStats.totalWorkflowsCompleted,
        totalSteps: progressStats.totalStepsCompleted,
        currentStreak: progressStats.currentStreak
      },
      learning: {
        totalSessions: 0, // AdaptiveLearningEngine doesn't expose this directly
        workflowsTracked: userProfile.workflowPatterns.length
      }
    };
  }
}