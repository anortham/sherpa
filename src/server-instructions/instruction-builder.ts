import * as fs from "fs";
import * as path from "path";
import { Workflow } from "../types";
import { ProgressTracker } from "../behavioral-adoption/progress-tracker";
import { CelebrationGenerator } from "../behavioral-adoption/celebration-generator";

interface InstructionContext {
  currentWorkflow?: string;
  currentPhase?: number;
  phaseProgress?: string[];
  totalWorkflows?: number;
  workflowProgress?: {
    completed: number;
    total: number;
  };
}

interface WorkflowInstructionData {
  name: string;
  description: string;
  currentPhase?: {
    name: string;
    guidance: string;
  };
  progress?: {
    completed: number;
    total: number;
  };
  nextSuggestions?: string[];
}

export class InstructionBuilder {
  private templatesDir: string;
  private encouragements: any;
  private progressTracker: ProgressTracker;
  private celebrationGenerator: CelebrationGenerator;

  constructor(progressTracker: ProgressTracker, celebrationGenerator: CelebrationGenerator) {
    this.templatesDir = path.join(__dirname, "templates");
    this.progressTracker = progressTracker;
    this.celebrationGenerator = celebrationGenerator;
    this.loadEncouragements();
  }

  private loadEncouragements(): void {
    try {
      const encouragementsPath = path.join(this.templatesDir, "encouragements.json");
      const content = fs.readFileSync(encouragementsPath, "utf-8");
      this.encouragements = JSON.parse(content);
    } catch (error) {
      console.error("Failed to load encouragements:", error);
      this.encouragements = {}; // Fallback to empty object
    }
  }

  /**
   * Build complete server instructions with dynamic content
   */
  async buildInstructions(
    workflows: Map<string, Workflow>,
    context: InstructionContext
  ): Promise<string> {
    try {
      // Load base instructions template
      const baseTemplate = await this.loadTemplate("base-instructions.md");

      // Prepare dynamic content
      const dynamicContent = await this.buildDynamicContent(workflows, context);

      // Apply template substitutions
      const instructions = this.applyTemplateSubstitutions(baseTemplate, dynamicContent);

      // Add contextual encouragements
      const finalInstructions = this.addContextualEncouragements(instructions, context);

      return finalInstructions;
    } catch (error) {
      console.error("Failed to build instructions:", error);
      return this.getFallbackInstructions();
    }
  }

  /**
   * Get workflow-specific additional instructions
   */
  async getWorkflowSpecificInstructions(workflowName: string): Promise<string> {
    try {
      const templateName = `workflow-specific/${workflowName}-instructions.md`;
      return await this.loadTemplate(templateName);
    } catch (error) {
      console.error(`Failed to load workflow-specific instructions for ${workflowName}:`, error);

      // Provide fallback instructions for common workflows
      return this.getWorkflowFallbackInstructions(workflowName);
    }
  }

  private getWorkflowFallbackInstructions(workflowName: string): string {
    const fallbacks: Record<string, string> = {
      'tdd': `
## TDD Workflow Instructions

Follow these steps for test-driven development:
1. Write a failing test
2. Implement minimal code to pass
3. Refactor while keeping tests green
4. Repeat the cycle

This systematic approach helps build reliable, well-tested code.`,

      'bug-hunt': `
## Bug Hunt Workflow Instructions

Systematic debugging approach:
1. Reproduce the issue consistently
2. Isolate the problem area
3. Form hypotheses about the cause
4. Test hypotheses systematically
5. Fix the root cause
6. Add tests to prevent regression

Take time to understand before fixing.`,

      'general': `
## General Development Workflow Instructions

Balanced development approach:
1. Plan your approach
2. Break down the task
3. Implement incrementally
4. Test as you go
5. Refactor for clarity
6. Document key decisions

Stay organized and methodical.`,

      'rapid': `
## Rapid Prototyping Instructions

Fast iteration for quick results:
1. Focus on core functionality
2. Use simple, direct solutions
3. Prioritize working over perfect
4. Get feedback quickly
5. Iterate based on learnings

Perfect is the enemy of good enough.`,

      'refactor': `
## Refactoring Workflow Instructions

Safe code improvement:
1. Ensure good test coverage first
2. Make small, incremental changes
3. Run tests after each change
4. Focus on one improvement at a time
5. Preserve existing behavior
6. Clean up as you go

Refactor with confidence through testing.`
    };

    return fallbacks[workflowName] || `
## ${workflowName.charAt(0).toUpperCase() + workflowName.slice(1)} Workflow

Follow systematic development practices:
1. Plan your approach
2. Work incrementally
3. Test your changes
4. Refactor for clarity

Use established patterns and best practices.`;
  }

  private async loadTemplate(templateName: string): Promise<string> {
    const templatePath = path.join(this.templatesDir, templateName);

    try {
      // Use fs/promises for async file reading
      const { readFile } = await import("fs/promises");
      return await readFile(templatePath, "utf-8");
    } catch (error: any) {
      // Try sync version as fallback
      try {
        return fs.readFileSync(templatePath, "utf-8");
      } catch (syncError) {
        throw error; // Throw original async error
      }
    }
  }

  private async buildDynamicContent(
    workflows: Map<string, Workflow>,
    context: InstructionContext
  ): Promise<any> {
    const currentWorkflow = context.currentWorkflow ? workflows.get(context.currentWorkflow) : null;

    let workflowData: WorkflowInstructionData | null = null;

    if (currentWorkflow && context.currentPhase !== undefined) {
      const phase = currentWorkflow.phases[context.currentPhase];
      workflowData = {
        name: currentWorkflow.name,
        description: currentWorkflow.description,
        currentPhase: phase ? {
          name: phase.name,
          guidance: phase.guidance
        } : undefined,
        progress: context.workflowProgress,
        nextSuggestions: this.getNextSuggestions(currentWorkflow, context)
      };
    }

    return {
      currentWorkflow: workflowData,
      availableWorkflows: Array.from(workflows.entries()).map(([key, workflow]) => ({
        key,
        name: workflow.name,
        description: workflow.description,
        phases: workflow.phases.length
      })),
      encouragement: this.getContextualEncouragement(context),
      celebration: this.getCelebrationMessage(context),
      progressStats: this.getProgressStats(context)
    };
  }

  private getNextSuggestions(workflow: Workflow, context: InstructionContext): string[] {
    if (context.currentPhase === undefined) return [];

    const phase = workflow.phases[context.currentPhase];
    if (!phase) return [];

    // Filter suggestions based on completed progress
    const completed = context.phaseProgress || [];
    return phase.suggestions.filter(suggestion =>
      !completed.some(done => done.toLowerCase().includes(suggestion.toLowerCase().substring(0, 20)))
    );
  }

  private getContextualEncouragement(context: InstructionContext): string {
    const { contextualEncouragement } = this.encouragements;

    if (!contextualEncouragement) return "";

    // Determine the right type of encouragement
    if (!context.currentWorkflow) {
      return this.getRandomMessage(contextualEncouragement.starting_session);
    }

    if (context.workflowProgress && context.workflowProgress.completed > 0) {
      return this.getRandomMessage(contextualEncouragement.returning_to_workflow);
    }

    return this.getRandomMessage(contextualEncouragement.starting_session);
  }

  private getCelebrationMessage(context: InstructionContext): string {
    if (!context.workflowProgress) return "";

    const { progressMessages } = this.encouragements;
    if (!progressMessages) return "";

    const { completed, total } = context.workflowProgress;
    const progressRatio = completed / total;

    if (completed === 0) {
      return this.getRandomMessage(progressMessages.firstStep);
    } else if (progressRatio >= 0.8) {
      return this.getRandomMessage(progressMessages.nearCompletion);
    } else if (progressRatio >= 0.4) {
      return this.getRandomMessage(progressMessages.midProgress);
    }

    return this.getRandomMessage(progressMessages.firstStep);
  }

  private getProgressStats(context: InstructionContext): any {
    return {
      totalWorkflows: context.totalWorkflows || 0,
      currentProgress: context.workflowProgress,
      milestones: this.progressTracker.getAchievedMilestones()
    };
  }

  private applyTemplateSubstitutions(template: string, data: any): string {
    let result = template;

    // Simple Handlebars-style substitution for the main placeholders
    result = result.replace(/\{\{#if currentWorkflow\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, ifContent, elseContent) => {
        return data.currentWorkflow ? ifContent : elseContent;
      });

    // Replace workflow data
    if (data.currentWorkflow) {
      result = result.replace(/\{\{currentWorkflow\.name\}\}/g, data.currentWorkflow.name);
      result = result.replace(/\{\{currentWorkflow\.description\}\}/g, data.currentWorkflow.description);

      if (data.currentWorkflow.currentPhase) {
        result = result.replace(/\{\{currentWorkflow\.currentPhase\.name\}\}/g,
          data.currentWorkflow.currentPhase.name);
        result = result.replace(/\{\{currentWorkflow\.currentPhase\.guidance\}\}/g,
          data.currentWorkflow.currentPhase.guidance);
      }

      if (data.currentWorkflow.progress) {
        result = result.replace(/\{\{currentWorkflow\.progress\.completed\}\}/g,
          data.currentWorkflow.progress.completed.toString());
        result = result.replace(/\{\{currentWorkflow\.progress\.total\}\}/g,
          data.currentWorkflow.progress.total.toString());
      }

      // Handle suggestions list
      if (data.currentWorkflow.nextSuggestions) {
        const suggestionsHtml = data.currentWorkflow.nextSuggestions
          .map((s: string) => `- ${s}`)
          .join('\n');
        result = result.replace(/\{\{#each currentWorkflow\.nextSuggestions\}\}\s*- \{\{this\}\}\s*\{\{\/each\}\}/g,
          suggestionsHtml);
      }
    }

    return result;
  }

  private addContextualEncouragements(instructions: string, context: InstructionContext): string {
    let result = instructions;

    // Add encouragement at the beginning if we have one
    const encouragement = this.getContextualEncouragement(context);
    if (encouragement) {
      result = `> ${encouragement}\n\n${result}`;
    }

    // Add celebration message if there's progress
    const celebration = this.getCelebrationMessage(context);
    if (celebration) {
      result = `> ${celebration}\n\n${result}`;
    }

    return result;
  }

  private getRandomMessage(messages: string[]): string {
    if (!messages || messages.length === 0) return "";
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private getFallbackInstructions(): string {
    return `# 🏔️ Sherpa - Development Workflow Guide

You have access to two powerful workflow tools:

**\`next\` tool**: Check your current workflow step and track progress
- Use \`next check\` to see what to do next
- Use \`next done: "description"\` to mark steps complete

**\`workflow\` tool**: Choose and switch between development workflows
- Use \`workflow list\` to see available workflows
- Use \`workflow set <name>\` to choose a workflow

## Available Workflows
- **TDD**: Test-driven development for bulletproof code
- **Bug Hunt**: Systematic debugging and issue resolution
- **General**: Balanced development with research → plan → implement
- **Rapid**: Quick prototyping and experimentation
- **Refactor**: Safe code improvement with test coverage

Use these tools regularly to maintain systematic, high-quality development practices!`;
  }
}