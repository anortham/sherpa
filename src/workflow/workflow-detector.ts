import { Workflow } from "../types";

/**
 * Intelligent workflow detection based on context and patterns
 * Suggests optimal workflows for different development scenarios
 */
export class WorkflowDetector {
  /**
   * Detects the most appropriate workflow based on context keywords
   */
  static detectWorkflowFromContext(
    context: string | undefined,
    workflows: Map<string, Workflow>,
    currentWorkflow: string
  ): string {
    if (!context) return currentWorkflow;

    const lowerContext = context.toLowerCase();

    // Bug hunting patterns
    const bugPatterns = [
      'bug', 'error', 'issue', 'problem', 'broken', 'not working',
      'failing', 'crash', 'exception', 'debug', 'troubleshoot',
      'investigate', 'reproduce', 'fix'
    ];

    // TDD patterns
    const tddPatterns = [
      'new feature', 'implement', 'add function', 'create', 'build',
      'test', 'tdd', 'test-driven', 'spec', 'requirement'
    ];

    // Rapid prototyping patterns
    const rapidPatterns = [
      'prototype', 'quick', 'demo', 'poc', 'proof of concept',
      'experiment', 'try', 'spike', 'explore'
    ];

    // Refactoring patterns
    const refactorPatterns = [
      'refactor', 'clean up', 'improve', 'optimize', 'restructure',
      'organize', 'simplify', 'modernize', 'upgrade'
    ];

    // Check patterns in order of specificity
    if (bugPatterns.some(pattern => lowerContext.includes(pattern))) {
      return workflows.has('bug-hunt') ? 'bug-hunt' : currentWorkflow;
    }

    if (rapidPatterns.some(pattern => lowerContext.includes(pattern))) {
      return workflows.has('rapid') ? 'rapid' : currentWorkflow;
    }

    if (refactorPatterns.some(pattern => lowerContext.includes(pattern))) {
      return workflows.has('refactor') ? 'refactor' : currentWorkflow;
    }

    if (tddPatterns.some(pattern => lowerContext.includes(pattern))) {
      return workflows.has('tdd') ? 'tdd' : currentWorkflow;
    }

    // Default to current workflow if no patterns match
    return currentWorkflow;
  }

  /**
   * Generates a workflow suggestion message when a different workflow is detected
   */
  static generateWorkflowSuggestion(
    detectedWorkflow: string,
    currentWorkflow: string,
    workflows: Map<string, Workflow>,
    context?: string
  ): string {
    if (detectedWorkflow === currentWorkflow) {
      return "";
    }

    const workflow = workflows.get(detectedWorkflow);
    if (!workflow) return "";

    const reasonMap: { [key: string]: string } = {
      'bug-hunt': "I detected you're working on a bug or issue",
      'tdd': "I detected you're building a new feature",
      'rapid': "I detected you want to prototype quickly",
      'refactor': "I detected you're improving existing code"
    };

    const reason = reasonMap[detectedWorkflow] || "Based on your context";
    return `💡 ${reason}. Consider switching to **${workflow.name}** workflow for optimal results.`;
  }

  /**
   * Detects initial workflow based on available workflows
   */
  static detectInitialWorkflow(workflows: Map<string, Workflow>): string {
    // Default to 'general' if it exists
    if (workflows.has('general')) {
      return 'general';
    }
    // Return first available workflow
    const first = workflows.keys().next().value;
    return first || 'general';
  }
}