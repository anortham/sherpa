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
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as yaml from "yaml";
import { InstructionBuilder } from "./src/server-instructions/instruction-builder";
import { ProgressTracker } from "./src/behavioral-adoption/progress-tracker";
import { CelebrationGenerator } from "./src/behavioral-adoption/celebration-generator";
import { Workflow, WorkflowPhase } from "./src/types";

// Types moved to src/types.ts

class SherpaServer {
  private server: Server;
  private workflows: Map<string, Workflow> = new Map();
  private currentWorkflow: string = "general";
  private currentPhase: number = 0;
  private phaseProgress: Map<string, string[]> = new Map();
  private sherpaHome: string;
  private logsDir: string;
  private progressTracker: ProgressTracker;
  private celebrationGenerator: CelebrationGenerator;
  private instructionBuilder: InstructionBuilder;
  private encouragements: any;

  constructor() {
    this.sherpaHome = path.join(os.homedir(), ".sherpa");
    this.logsDir = path.join(this.sherpaHome, "logs");

    // Initialize behavioral adoption system
    this.progressTracker = new ProgressTracker();
    this.loadEncouragements();
    this.celebrationGenerator = new CelebrationGenerator(this.progressTracker, this.encouragements);
    this.instructionBuilder = new InstructionBuilder(this.progressTracker, this.celebrationGenerator);

    this.server = new Server(
      {
        name: "sherpa",
        version: "1.0.0",
        description: "Workflow guidance for better AI-assisted development with systematic behavioral adoption"
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.loadWorkflows();
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
        const content = await fs.readFile(path.join(workflowsDir, file), 'utf-8');
        const workflow = yaml.parse(content) as Workflow;
        const key = path.basename(file, path.extname(file));
        this.workflows.set(key, workflow);
        this.log("INFO", `Loaded workflow: ${key} - ${workflow.name}`);
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

  private async loadEncouragements(): Promise<void> {
    try {
      const encouragementsPath = path.join(__dirname, "src", "server-instructions", "templates", "encouragements.json");
      const content = await fs.readFile(encouragementsPath, "utf-8");
      this.encouragements = JSON.parse(content);
    } catch (error) {
      this.log("ERROR", `Failed to load encouragements: ${error}`);
      this.encouragements = {}; // Fallback to empty object
    }
  }

  private async getServerInstructions(): Promise<string> {
    try {
      const context = {
        currentWorkflow: this.currentWorkflow,
        currentPhase: this.currentPhase,
        phaseProgress: this.phaseProgress.get(this.getCurrentPhaseName()) || [],
        totalWorkflows: this.workflows.size,
        workflowProgress: this.getWorkflowProgress()
      };

      return await this.instructionBuilder.buildInstructions(this.workflows, context);
    } catch (error) {
      this.log("ERROR", `Failed to build server instructions: ${error}`);
      return this.getFallbackInstructions();
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

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "next",
          description: "🎯 CHECK YOUR PROGRESS! Get your next workflow step and experience the satisfaction of systematic development. Call 'check' to see exactly what to do next, or 'done: [achievement]' to celebrate completing a step. Each step brings you closer to shipping quality code with confidence!",
          inputSchema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["check", "done"],
                description: "check = get next step, done = mark completion"
              },
              completed: {
                type: "string", 
                description: "Brief description of what you completed (only with 'done')"
              }
            },
            required: ["action"]
          }
        },
        {
          name: "workflow",
          description: "🔄 SWITCH YOUR DEVELOPMENT STYLE! Choose the perfect workflow for your task and experience the joy of systematic development. TDD for bulletproof features, Bug Hunt for surgical fixes, Rapid for exciting prototypes, General for balanced development, Refactor for fearless improvements. Each workflow is crafted to maximize your success and satisfaction. Options: " +
            Array.from(this.workflows.keys()).join(", ") + ", list",
          inputSchema: {
            type: "object",
            properties: {
              set: {
                type: "string",
                description: "Workflow name to switch to, or 'list' to see all options"
              }
            },
            required: ["set"]
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "next") {
        return this.handleNext(request.params.arguments);
      } else if (request.params.name === "workflow") {
        return this.handleWorkflow(request.params.arguments);
      }
      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  private handleNext(args: any) {
    const { action, completed } = args;

    // Record progress tracking
    this.progressTracker.recordProgressCheck();

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

    const phase = workflow.phases[this.currentPhase];
    const progress = this.phaseProgress.get(phase.name) || [];
    const remainingSuggestions = phase.suggestions.filter(s => !progress.includes(s));

    // Handle step completion with enhanced celebration
    let celebrationMessage = "";
    let newMilestones: any[] = [];

    if (action === "done" && completed) {
      this.recordProgress(completed);
      this.progressTracker.recordStepCompletion(this.currentWorkflow, completed);

      // Generate celebration for completed step
      const celebrationContext = {
        workflowType: this.currentWorkflow,
        phaseName: phase.name,
        stepDescription: completed,
        isPhaseComplete: remainingSuggestions.length <= 1, // Will be complete after this step
        isWorkflowComplete: false
      };

      celebrationMessage = this.celebrationGenerator.generateCelebration(celebrationContext);
    }

    // Check if should advance to next phase
    const isPhaseComplete = remainingSuggestions.length === 0;
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

      // Add phase entry celebration for new phase
      if (this.currentPhase < workflow.phases.length) {
        const newPhase = workflow.phases[this.currentPhase];
        const phaseEntryCelebration = this.celebrationGenerator.generatePhaseEntryCelebration(this.currentWorkflow, newPhase.name);
        celebrationMessage = `${celebrationMessage}\n\n${phaseEntryCelebration}`;
      }

      return this.handleNext({ action: "check" });
    }

    // Build enhanced response
    const currentPhase = workflow.phases[this.currentPhase];
    const currentProgress = this.phaseProgress.get(currentPhase.name) || [];
    const currentRemaining = currentPhase.suggestions.filter(s => !currentProgress.includes(s));

    let response: any = {
      workflow: workflow.name,
      phase: currentPhase.name,
      guidance: currentPhase.guidance,
      suggestions: currentRemaining,
      phase_number: `${this.currentPhase + 1}/${workflow.phases.length}`,
      progress: {
        completed: currentProgress.length,
        total: currentPhase.suggestions.length,
        remaining: currentRemaining.length
      }
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
      const workflowCompletionContext = {
        workflowType: this.currentWorkflow,
        phaseName: currentPhase.name,
        isPhaseComplete: true,
        isWorkflowComplete: true
      };

      const completionCelebration = this.celebrationGenerator.generateCelebration(workflowCompletionContext);
      response.workflow_completion = completionCelebration;

      // Record workflow completion
      this.progressTracker.recordWorkflowCompletion(
        this.currentWorkflow,
        currentProgress.length,
        30 // Estimate 30 minutes - could be enhanced with actual timing
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  private handleWorkflow(args: any) {
    const { set } = args;

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

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              motivation: selectionMotivation,
              available_workflows: workflowList,
              current: this.currentWorkflow,
              tool_encouragement: toolEncouragement,
              progress_stats: {
                total_workflows_completed: progressStats.totalWorkflowsCompleted,
                total_steps_completed: progressStats.totalStepsCompleted,
                current_streak: progressStats.currentStreak
              },
              personalized_tips: personalizedTips,
              success_reminder: "🎯 Each workflow is scientifically designed to optimize your development outcomes!"
            }, null, 2)
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

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            celebration: switchCelebration,
            phase_entry: phaseEntryCelebration,
            workflow_details: {
              name: workflow.name,
              description: workflow.description,
              first_phase: workflow.phases[0].name,
              total_phases: workflow.phases.length,
              guidance: workflow.phases[0].guidance,
              next_suggestions: workflow.phases[0].suggestions.slice(0, 3) // Show first few suggestions
            },
            tool_encouragement: toolEncouragement,
            success_inspiration: successStory,
            next_step_reminder: "💡 Use the 'next' tool to get your first step and start building momentum!"
          }, null, 2)
        }
      ]
    };
  }

  private recordProgress(completed: string) {
    const workflow = this.workflows.get(this.currentWorkflow);
    if (!workflow) return;
    
    const phase = workflow.phases[this.currentPhase];
    const progress = this.phaseProgress.get(phase.name) || [];
    progress.push(completed);
    this.phaseProgress.set(phase.name, progress);
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
  }
}

// Start the server
const sherpa = new SherpaServer();
sherpa.start();