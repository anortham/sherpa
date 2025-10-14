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
import { GuideHandler, GuideHandlerDependencies } from "./src/handlers/GuideHandler";
import { ApproachHandler, ApproachHandlerDependencies } from "./src/handlers/ApproachHandler";

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
   private guideHandler: GuideHandler;
   private approachHandler: ApproachHandler;

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

    // Initialize tool handlers
    const guideDeps: GuideHandlerDependencies = {
      workflows: this.workflows,
      getCurrentWorkflow: () => this.currentWorkflow,
      setCurrentWorkflow: (workflow: string) => { this.currentWorkflow = workflow; },
      getCurrentPhase: () => this.currentPhase,
      setCurrentPhase: (phase: number) => { this.currentPhase = phase; },
      phaseProgress: this.phaseProgress,
      learningEngine: this.learningEngine,
      celebrationGenerator: this.celebrationGenerator,
      progressTracker: this.progressTracker,
      detectWorkflowFromContext: this.detectWorkflowFromContext.bind(this),
      generateWorkflowSuggestion: this.generateWorkflowSuggestion.bind(this),
      saveWorkflowState: this.saveWorkflowState.bind(this),
      recordProgress: this.recordProgress.bind(this),
      getCurrentPhaseName: this.getCurrentPhaseName.bind(this),
      getWorkflowProgress: this.getWorkflowProgress.bind(this),
      getTotalCompletedSteps: this.getTotalCompletedSteps.bind(this),
      formatAdaptiveHint: this.formatAdaptiveHint.bind(this),
      generateProgressSummary: this.generateProgressSummary.bind(this)
    };
    this.guideHandler = new GuideHandler(guideDeps);

    const approachDeps: ApproachHandlerDependencies = {
      workflows: this.workflows,
      getCurrentWorkflow: () => this.currentWorkflow,
      setCurrentWorkflow: (workflow: string) => { this.currentWorkflow = workflow; },
      getCurrentPhase: () => this.currentPhase,
      setCurrentPhase: (phase: number) => { this.currentPhase = phase; },
      phaseProgress: this.phaseProgress,
      learningEngine: this.learningEngine,
      celebrationGenerator: this.celebrationGenerator,
      progressTracker: this.progressTracker,
      saveWorkflowState: this.saveWorkflowState.bind(this)
    };
    this.approachHandler = new ApproachHandler(approachDeps);

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
        return await this.guideHandler.handleGuide(request.params.arguments);
      } else if (request.params.name === "approach") {
        return await this.approachHandler.handleApproach(request.params.arguments);
      } else if (request.params.name === "next") {
        // Backward compatibility
        return await this.guideHandler.handleGuide(request.params.arguments);
      } else if (request.params.name === "workflow") {
        // Backward compatibility
        return await this.approachHandler.handleApproach(request.params.arguments);
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

    await this.validateStartup();
    await this.loadWorkflows();
    await this.initializeWorkflowState();

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
