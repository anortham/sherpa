/**
 * Phase completion detection logic for workflows
 * Contains semantic analysis to determine when workflow phases are complete
 */

export class PhaseCompletionDetector {
  /**
   * Determines if a phase is semantically complete based on workflow type and progress
   */
  static isPhaseSemanticallComplete(
    workflowType: string,
    phase: any,
    progress: string[],
    completed?: string
  ): boolean {
    if (!completed || progress.length === 0) {
      return false;
    }

    // Get phase-specific completion patterns based on workflow type and phase name
    const phaseName = phase.name.toLowerCase();
    const allProgress = [...progress, completed].join(' ').toLowerCase();

    // Bug Hunt workflow semantic completion patterns
    if (workflowType === 'bug-hunt') {
      if (phaseName.includes('reproduce') || phaseName.includes('isolate')) {
        return /reproduced|isolated|found.*bug|identified.*issue|can.*reproduce|minimal.*case/i.test(allProgress);
      }
      if (phaseName.includes('test') || phaseName.includes('capture')) {
        return /test.*written|test.*fails|failing.*test|captured.*bug.*test|test.*reproduces/i.test(allProgress);
      }
      if (phaseName.includes('fix')) {
        return /fixed|working|test.*passes|bug.*resolved|issue.*solved|all.*tests.*pass/i.test(allProgress);
      }
    }

    // TDD workflow semantic completion patterns
    if (workflowType === 'tdd') {
      if (phaseName.includes('red') || phaseName.includes('test')) {
        return /test.*written|test.*fails|failing.*test|red.*test/i.test(allProgress);
      }
      if (phaseName.includes('green') || phaseName.includes('implement')) {
        return /test.*passes|green|implemented|working|passing/i.test(allProgress);
      }
      if (phaseName.includes('refactor')) {
        return /refactored|cleaned.*up|improved|optimized|tests.*still.*pass/i.test(allProgress);
      }
    }

    // General workflow patterns - look for phase-specific completion indicators
    if (phaseName.includes('plan') || phaseName.includes('research')) {
      return /researched|planned|understood|analyzed|identified.*approach|clear.*plan/i.test(allProgress);
    }
    if (phaseName.includes('implement') || phaseName.includes('build') || phaseName.includes('create')) {
      return /implemented|built|created|working|complete.*implementation|functionality.*ready/i.test(allProgress);
    }
    if (phaseName.includes('test') || phaseName.includes('verify')) {
      return /tested|verified|tests.*pass|validated|confirmed.*working/i.test(allProgress);
    }

    // Generic completion patterns - if substantial progress and strong completion indicators
    if (progress.length >= 2) {
      return /fully.*done|completely.*working|everything.*implemented|all.*working|finished.*implementation/i.test(allProgress);
    }

    return false;
  }

  /**
   * Checks if a phase is complete using multiple completion criteria
   */
  static isPhaseComplete(
    workflowType: string,
    phase: any,
    progress: string[],
    completed?: string
  ): boolean {
    // Multiple ways to complete a phase:
    // 1. Traditional: enough steps completed relative to phase size
    const traditionalPhaseComplete = progress.length >= phase.suggestions.length;

    // 2. Smart completion: sufficient meaningful progress for phase goals
    const hasSubstantialProgress = progress.length >= Math.max(2, Math.ceil(phase.suggestions.length * 0.6));

    // 3. Explicit completion: user indicates they've finished the phase
    const explicitCompletion = Boolean(completed && (
      /completed.*phase/i.test(completed) ||
      /finished.*phase/i.test(completed) ||
      /done.*with.*phase/i.test(completed) ||
      /phase.*complete/i.test(completed) ||
      /ready.*next.*phase/i.test(completed) ||
      /moving.*to.*next/i.test(completed)
    ));

    // 4. Semantic completion: check if recent work matches phase goals
    const semanticCompletion = PhaseCompletionDetector.isPhaseSemanticallComplete(workflowType, phase, progress, completed);

    // 5. Natural completion indicators in the work description
    const naturalCompletion = Boolean(completed && (
      /all.*done|everything.*working|fully.*implemented|complete.*working/i.test(completed) ||
      (hasSubstantialProgress && /done|working|implemented|fixed|tested|ready/i.test(completed))
    ));

    return traditionalPhaseComplete || explicitCompletion || semanticCompletion || naturalCompletion;
  }
}