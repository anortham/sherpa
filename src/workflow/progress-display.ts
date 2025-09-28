/**
 * Progress display and summary generation for workflow tracking
 * Handles contextual progress messages and formatting
 */

export class ProgressDisplay {
  /**
   * Generates a contextual progress summary with encouragement
   */
  static generateProgressSummary(
    progress: {
      completed: number;
      total: number;
      remaining: number;
      phase_name: string;
      phase_number: number;
      total_phases: number;
    },
    justCompletedPhase: boolean,
    justMarkedDone: boolean
  ): string {
    const { completed, total, remaining, phase_name, phase_number, total_phases } = progress;

    // Base progress information
    let summary = `**Progress**: ${completed}/${total} steps completed in ${phase_name}`;

    // Add phase context
    if (total_phases > 1) {
      summary += ` (Phase ${phase_number}/${total_phases})`;
    }

    // Add contextual information based on progress state
    if (justCompletedPhase) {
      summary += ` ✨ **Phase Complete!**`;
    } else if (justMarkedDone && completed > 0) {
      if (completed === 1) {
        summary += ` 🎯 Great start!`;
      } else if (completed >= total * 0.8) {
        summary += ` 🔥 Almost done!`;
      } else if (completed >= total * 0.5) {
        summary += ` 💪 Good momentum!`;
      } else {
        summary += ` 📈 Making progress!`;
      }
    } else if (completed === 0) {
      summary += ` 🚀 Ready to begin!`;
    }

    return summary;
  }

  /**
   * Calculates accurate progress accounting for recent completions and phase transitions
   */
  static calculateActualProgress(
    currentProgress: string[],
    action: string,
    completed: string | undefined,
    isPhaseComplete: boolean,
    currentPhase: number
  ): number {
    let actualProgress = currentProgress.length;

    // If we just completed work and it advanced phase, show completion of previous phase
    // If we're showing a new phase due to advancement, show that we've made progress
    if (action === "done" && completed && isPhaseComplete && currentPhase > 0) {
      // Just advanced to new phase - show new phase with fresh start
      actualProgress = 0; // New phase starts fresh
    }

    return actualProgress;
  }

  /**
   * Creates enhanced progress object with all contextual information
   */
  static createProgressObject(
    actualProgress: number,
    currentPhase: any,
    currentPhaseIndex: number,
    totalPhases: number
  ) {
    return {
      completed: actualProgress,
      total: currentPhase.suggestions.length,
      remaining: Math.max(0, currentPhase.suggestions.length - actualProgress),
      phase_name: currentPhase.name,
      phase_number: currentPhaseIndex + 1,
      total_phases: totalPhases
    };
  }
}