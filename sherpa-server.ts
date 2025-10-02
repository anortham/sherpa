#!/usr/bin/env bun
/**
 * Sherpa - Workflow Guide MCP Server
 * 
 * A lightweight Model Context Protocol server that guides AI agents through
 * customizable development workflows, with emphasis on test-driven development.
 * 
 * Workflows are defined in .sherpa/*.yaml files in your project root.
 * 
 * Installation:
 * 1. Install dependencies: bun add @modelcontextprotocol/sdk@^1.18.1 yaml
 * 2. Create .sherpa folder in your project root
 * 3. Add workflow .yaml files to .sherpa/
 * 4. Run server: bun run sherpa-server.ts
 * 
 * Add to Claude Desktop config:
 * {
 *   "mcpServers": {
 *     "sherpa": {
 *       "command": "bun",
 *       "args": ["run", "/path/to/sherpa-server.ts"],
 *       "cwd": "/path/to/your/project"
 *     }
 *   }
 * }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "fs";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";
import * as yaml from "yaml";
import { AdaptiveLearningEngine } from "./src/behavioral-adoption/adaptive-learning-engine";
import { CelebrationGenerator } from "./src/behavioral-adoption/celebration-generator";
import { Milestone, ProgressTracker } from "./src/behavioral-adoption/progress-tracker";
import { AdaptiveHint, Workflow, WorkflowState } from "./src/types";
import { PhaseCompletionDetector } from "./src/workflow/phase-completion";
import { ProgressDisplay } from "./src/workflow/progress-display";
import { WorkflowStateManager } from "./src/workflow/workflow-state-manager";
import { WorkflowDetector } from "./src/workflow/workflow-detector";
import { StateCoordinator } from "./src/state/state-coordinator";
import { getBaseInstructions } from "./src/instruction-builder/base-instructions";
import { getToolDescription } from "./src/instruction-builder/tool-descriptions";

// Types moved to src/types.ts

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));

// Old static instructions replaced by enhanced base instructions from instruction-builder
// const STATIC_INSTRUCTIONS = `# Sherpa - Systematic Development Guide

// ... old content removed, now using getBaseInstructions() from instruction-builder
// */

export class SherpaServer {
  private server: Server;
  private workflows: Map<string, Workflow> = new Map();
  private currentWorkflow: string = "general";
  private currentPhase: number = 0;
  private phaseProgress: Map<string, string[]> = new Map();
  private sherpaHome: string;
  private logsDir: string;
  private progressTracker: ProgressTracker;
  private celebrationGenerator: CelebrationGenerator;
  private learningEngine: AdaptiveLearningEngine;
  private workflowStateManager: WorkflowStateManager;
  private stateCoordinator: StateCoordinator;

  constructor() {
    this.sherpaHome = path.join(os.homedir(), ".sherpa");
    this.logsDir = path.join(this.sherpaHome, "logs");

    // Initialize behavioral adoption system
    this.progressTracker = new ProgressTracker();
    this.celebrationGenerator = new CelebrationGenerator(this.progressTracker);

    // Initialize adaptive learning engine
    this.learningEngine = new AdaptiveLearningEngine();

    // Initialize workflow state manager
    this.workflowStateManager = new WorkflowStateManager((level, message) => this.log(level, message));

    // Initialize state coordinator to manage all state systems
    this.stateCoordinator = new StateCoordinator(
      this.workflowStateManager,
      this.progressTracker,
      this.learningEngine
    );

    this.server = new Server(
      {
        name: "sherpa",
        version: "1.0.0",
        description: "Experience the deep satisfaction of systematic development - where every step builds confidence, tests pass on first try, and coding becomes a craft you're proud to practice"
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
        instructions: getBaseInstructions() // Enhanced behavioral adoption instructions
      }
    );

    this.setupHandlers();
    this.validateStartup();
    this.loadWorkflows();
    this.initializeWorkflowState();
  }

  private async validateStartup(): Promise<void> {
    try {
      // Validate critical paths exist
      const validationChecks = [
        {
          name: "Sherpa home directory",
          path: this.sherpaHome,
          required: true
        },
        {
          name: "Workflows directory",
          path: path.join(this.sherpaHome, "workflows"),
          required: true
        },
        {
          name: "Logs directory",
          path: this.logsDir,
          required: false // Can be created if missing
        }
      ];

      for (const check of validationChecks) {
        try {
          await fs.access(check.path);
          this.log("INFO", `✅ ${check.name} exists: ${check.path}`);
        } catch (error) {
          if (check.required) {
            this.log("ERROR", `❌ ${check.name} missing: ${check.path}`);
            this.log("ERROR", "Run 'bun run setup' to initialize Sherpa properly");
          } else {
            this.log("WARN", `⚠️  ${check.name} missing, will create: ${check.path}`);
            try {
              await fs.mkdir(check.path, { recursive: true });
              this.log("INFO", `✅ Created ${check.name}: ${check.path}`);
            } catch (createError) {
              this.log("WARN", `Failed to create ${check.name}: ${createError}`);
            }
          }
        }
      }

      // Initialize adaptive learning engine with error handling
      try {
        await this.learningEngine.loadUserProfile();
        this.log("INFO", "✅ Adaptive learning engine initialized");
      } catch (error) {
        this.log("WARN", `⚠️  Adaptive learning engine failed to initialize: ${error}`);
        this.log("INFO", "Continuing with default behavioral settings");
      }

      this.log("INFO", "🏔️  Sherpa server startup validation complete");

    } catch (error) {
      this.log("ERROR", `Startup validation failed: ${error}`);
    }
  }

  private async loadWorkflows() {
    const workflowsDir = path.join(this.sherpaHome, "workflows");

    try {
      // Check if ~/.sherpa directory exists
      try {
        await fs.access(this.sherpaHome);
      } catch {
        this.log("ERROR", `Sherpa directory not found at ${this.sherpaHome}`);
        this.log("ERROR", "Please run 'bun run setup' or 'npm run setup' to initialize Sherpa");
        return;
      }

      const files = await fs.readdir(workflowsDir);
      const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      if (yamlFiles.length === 0) {
        this.log("WARN", "No workflow files found in workflows directory");
        return;
      }

      for (const file of yamlFiles) {
        try {
          const content = await fs.readFile(path.join(workflowsDir, file), 'utf-8');
          const workflow = yaml.parse(content) as Workflow;
          const key = path.basename(file, path.extname(file));
          this.workflows.set(key, workflow);
          this.log("INFO", `Loaded workflow: ${key} - ${workflow.name}`);
        } catch (error) {
          this.log("WARN", `Skipping invalid workflow file ${file}: ${error}`);
        }
      }

      // Auto-detect initial workflow based on context
      this.currentWorkflow = this.detectWorkflow();
      this.log("INFO", `Initial workflow: ${this.currentWorkflow}`);
    } catch (error) {
      this.log("ERROR", `Error loading workflows: ${error}`);
    }
  }

  private detectWorkflow(): string {
    // This is a simple detection - could be enhanced to look at actual files/context
    // For now, default to 'general' if it exists
    if (this.workflows.has('general')) {
      return 'general';
    }
    // Return first available workflow
    const first = this.workflows.keys().next().value;
    return first || 'general';
  }

  private detectWorkflowFromContext(context?: string): string {
    return WorkflowDetector.detectWorkflowFromContext(context, this.workflows, this.currentWorkflow);
  }

  private generateWorkflowSuggestion(detectedWorkflow: string, context?: string): string {
    return WorkflowDetector.generateWorkflowSuggestion(detectedWorkflow, this.currentWorkflow, this.workflows, context);
  }

  private async saveWorkflowState(): Promise<void> {
    const result = await this.stateCoordinator.saveAll(
      this.currentWorkflow,
      this.currentPhase,
      this.phaseProgress
    );

    // Log any errors but don't fail
    if (!result.success) {
      this.log("WARN", `State save had errors: ${result.errors.join(', ')}`);
    }
  }

  private async initializeWorkflowState(): Promise<void> {
    const state = await this.stateCoordinator.loadAll();

    if (state.workflowState) {
      this.currentWorkflow = state.workflowState.currentWorkflow;
      this.currentPhase = state.workflowState.currentPhase;
      this.phaseProgress = state.workflowState.phaseProgress;
      this.log("INFO", `Restored workflow state: ${this.currentWorkflow} phase ${this.currentPhase}`);
    } else {
      // Initialize defaults
      this.currentWorkflow = WorkflowDetector.detectInitialWorkflow(this.workflows);
      this.currentPhase = 0;
      this.phaseProgress.clear();
      this.log("INFO", `Starting fresh with ${this.currentWorkflow} workflow`);
    }

    // Log state loading results
    if (state.progressLoaded) {
      this.log("INFO", "✅ Progress tracker state loaded");
    }
    if (state.learningLoaded) {
      this.log("INFO", "✅ Learning engine state loaded");
    }
  }

  private getCurrentPhaseName(): string {
    const workflow = this.workflows.get(this.currentWorkflow);
    if (!workflow || this.currentPhase >= workflow.phases.length) {
      return "unknown";
    }
    return workflow.phases[this.currentPhase].name;
  }

  private getWorkflowProgress(): { completed: number; total: number } {
    const workflow = this.workflows.get(this.currentWorkflow);
    if (!workflow) {
      return { completed: 0, total: 0 };
    }

    const currentPhase = workflow.phases[this.currentPhase];
    if (!currentPhase) {
      return { completed: 0, total: 0 };
    }

    const completedSteps = this.phaseProgress.get(currentPhase.name) || [];
    return {
      completed: completedSteps.length,
      total: currentPhase.suggestions.length
    };
  }

  private getTotalCompletedSteps(workflow: Workflow): number {
    return workflow.phases.reduce((total, workflowPhase) => {
      const completed = this.phaseProgress.get(workflowPhase.name) || [];
      return total + completed.length;
    }, 0);
  }


  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "guide",
          description: getToolDescription('guide'),
          inputSchema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["check", "done", "tdd", "bug", "next", "advance"],
                description: "check = get next step, done = mark completion, tdd = start TDD workflow, bug = start bug hunt, next = what should I do right now, advance = manually move to next phase"
              },
              completed: {
                type: "string",
                description: "Brief description of what you completed (only with 'done')"
              },
              context: {
                type: "string",
                description: "Optional: describe what you're working on for smart workflow suggestions (e.g., 'fixing login bug', 'building new parser', 'quick demo prototype')"
              }
            },
            required: ["action"]
          }
        },
        {
          name: "approach",
          description: getToolDescription('approach'),
          inputSchema: {
            type: "object",
            properties: {
              set: {
                type: "string",
                description: "Workflow name to switch to, or 'list' to see all options. Available: " +
                  Array.from(this.workflows.keys()).join(", ")
              }
            },
            required: ["set"]
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "guide") {
        return await this.handleGuide(request.params.arguments);
      } else if (request.params.name === "approach") {
        return await this.handleApproach(request.params.arguments);
      } else if (request.params.name === "next") {
        // Backward compatibility
        return await this.handleGuide(request.params.arguments);
      } else if (request.params.name === "workflow") {
        // Backward compatibility
        return await this.handleApproach(request.params.arguments);
      }
      throw new Error(`Unknown tool: ${request.params.name}`);
    });

    // Handle resource listing
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "sherpa://guide",
          name: "Development Guide",
          description: "Your journey to systematic development excellence starts here",
          mimeType: "text/markdown"
        }
      ]
    }));

    // Handle resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      if (uri === "sherpa://guide") {
        return {
          contents: [
            {
              uri: uri,
              mimeType: "text/markdown",
              text: getBaseInstructions() // Enhanced behavioral adoption instructions
            }
          ]
        };
      }
      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  private async handleGuide(args: any): Promise<{ content: { type: string; text: string }[] }> {
    const safeArgs = args ?? {};
    const action = safeArgs.action ?? "check";
    const completed = safeArgs.completed;
    const context = safeArgs.context;

    // Record tool usage for learning
    this.learningEngine.recordToolUsage("guide", safeArgs);

    // Get workflow early so advance action can use it
    const workflow = this.workflows.get(this.currentWorkflow);
    if (!workflow) {
      return {
        content: [
          {
            type: "text",
            text: "🏔️ No workflow loaded! Use the 'workflow' tool to choose your development adventure and unlock systematic excellence."
          }
        ]
      };
    }

    // Handle quick shortcuts
    if (action === "tdd") {
      this.currentWorkflow = "tdd";
      this.currentPhase = 0;
      this.phaseProgress.clear();
      this.learningEngine.recordWorkflowUsage("tdd", context);
      await this.saveWorkflowState();
      return await this.handleGuide({ action: "check" });
    }

    if (action === "bug") {
      this.currentWorkflow = "bug-hunt";
      this.currentPhase = 0;
      this.phaseProgress.clear();
      this.learningEngine.recordWorkflowUsage("bug-hunt", context);
      await this.saveWorkflowState();
      return await this.handleGuide({ action: "check" });
    }

    if (action === "next") {
      // Context-aware workflow detection
      if (context) {
        const suggestedWorkflow = this.detectWorkflowFromContext(context);
        if (suggestedWorkflow !== this.currentWorkflow) {
          this.currentWorkflow = suggestedWorkflow;
          this.currentPhase = 0;
          this.phaseProgress.clear();
          this.learningEngine.recordWorkflowUsage(suggestedWorkflow, context);
          await this.saveWorkflowState();
        }
      }
      return await this.handleGuide({ action: "check" });
    }

    if (action === "advance") {
      // Manual phase advancement - let users skip to next phase when needed
      if (this.currentPhase < workflow.phases.length - 1) {
        const previousPhase = workflow.phases[this.currentPhase];
        this.currentPhase++;
        const newPhase = workflow.phases[this.currentPhase];

        // Record manual advancement for learning
        this.learningEngine.recordToolUsage("guide-advance", { from: previousPhase.name, to: newPhase.name });

        // Generate phase transition celebration
        const phaseAdvancementCelebration = `🔄 **Advanced from ${previousPhase.name} to ${newPhase.name}**\n\nSometimes you need to move forward manually - that's perfectly fine! Let's focus on the next phase.`;

        // Generate phase entry celebration for new phase
        const phaseEntryCelebration = this.celebrationGenerator.generatePhaseEntryCelebration(this.currentWorkflow, newPhase.name);

        let advancementMessage = phaseAdvancementCelebration;
        if (phaseEntryCelebration) {
          advancementMessage += `\n\n${phaseEntryCelebration}`;
        }

        return {
          content: [
            {
              type: "text",
              text: `${advancementMessage}\n\n` +
                    `**${newPhase.name}** (${this.currentPhase + 1}/${workflow.phases.length})\n` +
                    `${newPhase.guidance}\n\n` +
                    `**Next steps:**\n` +
                    newPhase.suggestions.slice(0, 3).map((s: string) => `• ${s}`).join('\n') +
                    `\n\n🎯 **Next Action**: Work on these steps, then use \`guide done "description"\` to track progress.`
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: "🎯 You're already in the final phase! Complete the remaining steps or start a new workflow with `approach set <workflow>`."
            }
          ]
        };
      }
    }

    // Smart workflow detection for any context provided
    let workflowSuggestion = "";
    if (context && action === "check") {
      const detectedWorkflow = this.detectWorkflowFromContext(context);
      workflowSuggestion = this.generateWorkflowSuggestion(detectedWorkflow, context);
    }

    // Generate predictive hints based on learning
    let adaptiveHint: AdaptiveHint | null = null;
    if (action === "check") {
      const workflow = this.workflows.get(this.currentWorkflow);
      if (workflow) {
        const predictiveContext = this.learningEngine.generatePredictiveContext(
          this.currentWorkflow,
          workflow.phases[this.currentPhase]?.name || "unknown",
          context
        );
        adaptiveHint = this.learningEngine.generateAdaptiveHint(predictiveContext);
      }
    }

    // Record progress tracking
    this.progressTracker.recordProgressCheck();

    const phase = workflow.phases[this.currentPhase];
    let progress = this.phaseProgress.get(phase.name) || [];

    // Handle step completion with enhanced celebration
    let celebrationMessage = "";
    let newMilestones: Milestone[] = [];

    if (action === "done" && completed) {
      await this.recordProgress(completed);
      progress = this.phaseProgress.get(phase.name) || []; // Refresh progress after recording
      const stepMilestones = this.progressTracker.recordStepCompletion(this.currentWorkflow, completed);
      if (stepMilestones.length > 0) {
        newMilestones = [...newMilestones, ...stepMilestones];
      }

      // Generate celebration for completed step
      const celebrationContext = {
        workflowType: this.currentWorkflow,
        phaseName: phase.name,
        stepDescription: completed,
        isPhaseComplete: progress.length >= phase.suggestions.length, // Check with updated progress
        isWorkflowComplete: false,
        newMilestones
      };

      celebrationMessage = this.celebrationGenerator.generateCelebration(celebrationContext);
    }

    // Calculate remaining suggestions - use intelligent completion detection
    // Instead of requiring exact matches, track completion by counting user entries
    const remainingSuggestions = Math.max(0, phase.suggestions.length - progress.length);

    // Check if should advance to next phase
    // Enhanced phase completion logic with smarter semantic understanding

    // Check if phase is complete using comprehensive detection logic
    const isPhaseComplete = PhaseCompletionDetector.isPhaseComplete(this.currentWorkflow, phase, progress, completed);

    const isWorkflowComplete = isPhaseComplete && this.currentPhase >= workflow.phases.length - 1;

    if (isPhaseComplete && this.currentPhase < workflow.phases.length - 1) {
      // Generate phase completion celebration
      const phaseCompletionContext = {
        workflowType: this.currentWorkflow,
        phaseName: phase.name,
        isPhaseComplete: true,
        isWorkflowComplete: false
      };

      const phaseCompletionCelebration = this.celebrationGenerator.generateCelebration(phaseCompletionContext);
      celebrationMessage = celebrationMessage ? `${celebrationMessage}\n\n${phaseCompletionCelebration}` : phaseCompletionCelebration;

      this.currentPhase++;
      await this.saveWorkflowState();

      // Add phase entry celebration for new phase
      if (this.currentPhase < workflow.phases.length) {
        const newPhase = workflow.phases[this.currentPhase];
        const phaseEntryCelebration = this.celebrationGenerator.generatePhaseEntryCelebration(this.currentWorkflow, newPhase.name);
        celebrationMessage = `${celebrationMessage}\n\n${phaseEntryCelebration}`;
      }

      // Don't recurse - continue with the flow to show the new phase
      // The rest of the method will handle building the response for the new phase
    }

    // Build enhanced response
    const currentPhase = workflow.phases[this.currentPhase];
    const currentProgress = this.phaseProgress.get(currentPhase.name) || [];

    // Calculate accurate progress using ProgressDisplay utilities
    const actualProgress = ProgressDisplay.calculateActualProgress(
      currentProgress,
      action,
      completed,
      isPhaseComplete,
      this.currentPhase
    );

    // Show all suggestions - users can track progress by count rather than exact matches
    const currentRemaining = currentPhase.suggestions;

    let response: any = {
      workflow: workflow.name,
      phase: currentPhase.name,
      guidance: currentPhase.guidance,
      suggestions: currentRemaining,
      phase_number: `${this.currentPhase + 1}/${workflow.phases.length}`,
      progress: ProgressDisplay.createProgressObject(
        actualProgress,
        currentPhase,
        this.currentPhase,
        workflow.phases.length
      )
    };

    // Add celebration message if we have one
    if (celebrationMessage) {
      response.celebration = celebrationMessage;
    }

    // Add tool usage encouragement
    const toolEncouragement = this.celebrationGenerator.generateToolUsageEncouragement("next");
    if (toolEncouragement) {
      response.tool_encouragement = toolEncouragement;
    }

    // Add progress encouragement
    const progressEncouragement = this.progressTracker.getProgressEncouragement();
    if (progressEncouragement) {
      response.progress_encouragement = progressEncouragement;
    }

    // Add success story context
    const successStory = this.celebrationGenerator.generateSuccessStory(this.currentWorkflow);
    if (successStory && Math.random() < 0.3) { // Show occasionally for inspiration
      response.success_inspiration = successStory;
    }

    // Check for workflow completion
    if (isWorkflowComplete) {
      const totalStepsCompleted = this.getTotalCompletedSteps(workflow);
      const completionMilestones = this.progressTracker.recordWorkflowCompletion(
        this.currentWorkflow,
        totalStepsCompleted,
        30 // Estimate 30 minutes - could be enhanced with actual timing
      );
      if (completionMilestones.length > 0) {
        newMilestones = [...newMilestones, ...completionMilestones];
      }

      const workflowCompletionContext = {
        workflowType: this.currentWorkflow,
        phaseName: currentPhase.name,
        isPhaseComplete: true,
        isWorkflowComplete: true,
        newMilestones
      };

      const completionCelebration = this.celebrationGenerator.generateCelebration(workflowCompletionContext);
      response.workflow_completion = completionCelebration;

      // Record completion with learning engine for adaptive insights
      this.learningEngine.recordWorkflowCompletion(
        this.currentWorkflow,
        30, // Duration in minutes
        true // Success
      );

      this.phaseProgress.clear();
      this.currentPhase = 0;
    }

    // Convert to natural language format
    let naturalResponse = "";

    // Add workflow suggestion if present
    if (workflowSuggestion) {
      naturalResponse += `${workflowSuggestion}\n\n`;
    }

    // Add adaptive hint if present
    if (adaptiveHint) {
      const hintContent = this.formatAdaptiveHint(adaptiveHint);
      if (hintContent) {
        naturalResponse += `${hintContent}\n\n`;
      }
    }

    // Add celebration if present
    if (response.celebration) {
      naturalResponse += `${response.celebration}\n\n`;
    }

    // Add main guidance
    naturalResponse += `**${response.phase}** (${response.phase_number})\n`;
    naturalResponse += `${response.guidance}\n\n`;

    // Add next steps
    if (response.suggestions && response.suggestions.length > 0) {
      naturalResponse += "**Next steps:**\n";
      response.suggestions.forEach((suggestion: string) => {
        naturalResponse += `• ${suggestion}\n`;
      });
      naturalResponse += "\n";
    }

    // Add progress encouragement if present
    if (response.progress_encouragement) {
      naturalResponse += `${response.progress_encouragement}\n\n`;
    }

    // Add workflow completion if present
    if (response.workflow_completion) {
      naturalResponse += `${response.workflow_completion}\n\n`;
    }

    // Add success story occasionally
    if (response.success_inspiration) {
      naturalResponse += `💡 **Inspiration**: ${response.success_inspiration}\n\n`;
    }

    // Add progress summary with better context
    const progressSummary = this.generateProgressSummary(response.progress, isPhaseComplete, action === "done");
    naturalResponse += `${progressSummary}\n\n`;

    // Add explicit next action hint
    if (response.suggestions && response.suggestions.length > 0) {
      naturalResponse += `🎯 **Next Action**: Work on the suggested steps above, then call \`guide done "brief description of what you completed"\` to mark progress and get your next step.\n\n`;
    }

    // Add tool usage reminder
    naturalResponse += `💡 **Remember**: Use \`guide check\` anytime you need your next step, or \`guide next\` when switching contexts.`;

    return {
      content: [
        {
          type: "text",
          text: naturalResponse.trim()
        }
      ]
    };
  }

  private async handleApproach(args: any) {
    const safeArgs = args ?? {};
    const set = safeArgs.set ?? "list";

    // Record tool usage for learning
    this.learningEngine.recordToolUsage("approach", safeArgs);

    if (set === "list") {
      const workflowList = Array.from(this.workflows.entries()).map(([key, wf]) => ({
        key,
        name: wf.name,
        description: wf.description,
        phases: wf.phases.length,
        trigger_hints: wf.trigger_hints || []
      }));

      // Generate motivational selection message
      const selectionMotivation = this.celebrationGenerator.generateWorkflowSelectionMotivation(
        Array.from(this.workflows.keys())
      );

      // Add tool usage encouragement
      const toolEncouragement = this.celebrationGenerator.generateToolUsageEncouragement("workflow");

      // Get progress stats for context
      const progressStats = this.progressTracker.getProgressStats();
      const personalizedTips = this.progressTracker.getPersonalizedTips();

      // Convert to natural language format
      let approachResponse = "";

      // Add motivation
      if (selectionMotivation) {
        approachResponse += `${selectionMotivation}\n\n`;
      }

      // Add current workflow
      approachResponse += `**Current approach**: ${this.currentWorkflow}\n\n`;

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
      const learningInsights = this.learningEngine.getPersonalizedSuggestions();
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

    if (!this.workflows.has(set)) {
      // Enhanced error with helpful guidance
      const availableWorkflows = Array.from(this.workflows.keys());
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
    const previousWorkflow = this.currentWorkflow;
    this.currentWorkflow = set;
    this.currentPhase = 0;
    this.phaseProgress.clear();

    // Save state after workflow change
    await this.saveWorkflowState();

    // Record workflow usage for learning
    this.learningEngine.recordWorkflowUsage(set);

    const workflow = this.workflows.get(set)!;

    // Generate workflow switch celebration
    const switchCelebration = previousWorkflow !== set ?
      `🔄 Excellent choice! Switching from ${previousWorkflow} to ${workflow.name} workflow.` :
      `🎯 Continuing with ${workflow.name} workflow - great systematic approach!`;

    // Generate phase entry celebration
    const phaseEntryCelebration = this.celebrationGenerator.generatePhaseEntryCelebration(
      this.currentWorkflow,
      workflow.phases[0].name
    );

    // Get workflow-specific success story
    const successStory = this.celebrationGenerator.generateSuccessStory(this.currentWorkflow);

    // Add tool usage encouragement
    const toolEncouragement = this.celebrationGenerator.generateToolUsageEncouragement("workflow");

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



  private formatAdaptiveHint(hint: AdaptiveHint): string {
    if (!hint) return "";

    // Simple, friendly hint formatting
    const icons = {
      'next-step': '➡️',
      'workflow-suggestion': '🔄',
      'optimization': '⚡',
      'prevention': '⚠️',
      'encouragement': '💪'
    };
    const icon = icons[hint.type] || '💡';
    return `${icon} **Smart suggestion**: ${hint.content}`;
  }


  private isPhaseSemanticallComplete(phase: any, progress: string[], completed?: string): boolean {
    return PhaseCompletionDetector.isPhaseSemanticallComplete(this.currentWorkflow, phase, progress, completed);
  }

  private generateProgressSummary(progress: any, justCompletedPhase: boolean, justMarkedDone: boolean): string {
    return ProgressDisplay.generateProgressSummary(progress, justCompletedPhase, justMarkedDone);
  }

  private async recordProgress(completed: string) {
    const workflow = this.workflows.get(this.currentWorkflow);
    if (!workflow) return;

    const phase = workflow.phases[this.currentPhase];
    const progress = this.phaseProgress.get(phase.name) || [];
    progress.push(completed);
    this.phaseProgress.set(phase.name, progress);

    // Save state after recording progress
    await this.saveWorkflowState();
  }

  private async ensureLogsDir() {
    try {
      await fs.mkdir(this.logsDir, { recursive: true });
    } catch (error) {
      // Silently fail - we'll try again on next log attempt
    }
  }

  private async log(level: string, message: string) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}\n`;

    try {
      await this.ensureLogsDir();
      const logFile = path.join(this.logsDir, `sherpa-${new Date().toISOString().split('T')[0]}.log`);
      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      // Silently fail - don't interfere with MCP stdio
    }
  }

  private async rotateOldLogs() {
    try {
      const files = await fs.readdir(this.logsDir);
      const logFiles = files.filter(f => f.startsWith('sherpa-') && f.endsWith('.log'));
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep 7 days

      for (const file of logFiles) {
        const filePath = path.join(this.logsDir, file);
        const stats = await fs.stat(filePath);
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          // Log cleanup happens silently
        }
      }
    } catch (error) {
      // Silently fail - don't interfere with MCP stdio
    }
  }

  async start() {
    await this.ensureLogsDir();
    await this.rotateOldLogs();
    this.log("INFO", "Sherpa MCP Server starting up");

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    this.log("INFO", "Sherpa MCP Server running - guiding your development journey! 🏔️");
    this.log("INFO", "Server started successfully");

    // Setup graceful shutdown to save learning data
    process.on('SIGINT', async () => {
      this.log("INFO", "Shutting down Sherpa MCP Server...");
      await this.learningEngine.endSession();
      this.log("INFO", "Learning session saved. Goodbye! 🌊");
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      this.log("INFO", "Terminating Sherpa MCP Server...");
      await this.learningEngine.endSession();
      this.log("INFO", "Learning session saved. Goodbye! 🌊");
      process.exit(0);
    });
  }
}

// Start the server
const sherpa = new SherpaServer();
sherpa.start();
