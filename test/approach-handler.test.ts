#!/usr/bin/env bun
import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as yaml from "yaml";
import { ApproachHandler, ApproachHandlerDependencies } from "../src/handlers/ApproachHandler";
import { AdaptiveLearningEngine } from "../src/behavioral-adoption/adaptive-learning-engine";
import { CelebrationGenerator } from "../src/behavioral-adoption/celebration-generator";
import { ProgressTracker } from "../src/behavioral-adoption/progress-tracker";

const TEST_SHERPA_HOME = path.join(os.tmpdir(), "sherpa-approach-handler-test");
const TEST_WORKFLOWS_DIR = path.join(TEST_SHERPA_HOME, "workflows");

// Helper function to parse structured response (for JSON output format)
function parseResponse(result: any): { summary: string; data: any } {
  const text = result.content[0].text;
  const parts = text.split("\n\n");
  const summary = parts[0];
  const jsonStr = parts.slice(1).join("\n\n");
  const data = JSON.parse(jsonStr);
  return { summary, data };
}

// Helper function to get raw text response (for text output format)
function getTextResponse(result: any): string {
  return result.content[0].text;
}

describe("ApproachHandler", () => {
  let mockWorkflows: Map<string, any>;
  let mockLearningEngine: AdaptiveLearningEngine;
  let mockCelebrationGenerator: CelebrationGenerator;
  let mockProgressTracker: ProgressTracker;
  let mockDeps: ApproachHandlerDependencies;
  let handler: ApproachHandler;

  beforeEach(async () => {
    // Create test environment
    await fs.mkdir(TEST_WORKFLOWS_DIR, { recursive: true });

    // Create test workflows
    const tddWorkflow = {
      name: "Test-Driven Development",
      description: "Build reliable software through testing first",
      trigger_hints: ["test", "tdd", "testing"],
      phases: [
        {
          name: "🔴 Red Phase",
          guidance: "Write a failing test that describes the desired behavior",
          suggestions: ["Create test file", "Write simple assertion", "Run test to see failure"]
        }
      ]
    };

    const bugHuntWorkflow = {
      name: "Bug Hunt",
      description: "Systematic debugging and issue resolution",
      trigger_hints: ["bug", "error", "issue", "broken"],
      phases: [
        {
          name: "🔍 Reproduce & Isolate",
          guidance: "Understand the bug completely before fixing",
          suggestions: ["Reproduce the bug consistently", "Identify minimum reproduction steps"]
        }
      ]
    };

    const generalWorkflow = {
      name: "General Development",
      description: "Balanced approach for general software development",
      trigger_hints: ["general", "development"],
      phases: [
        {
          name: "📋 Plan & Research",
          guidance: "Understand requirements and plan your approach",
          suggestions: ["Analyze requirements", "Research solutions", "Create plan"]
        }
      ]
    };

    await fs.writeFile(
      path.join(TEST_WORKFLOWS_DIR, "tdd.yaml"),
      yaml.stringify(tddWorkflow)
    );

    await fs.writeFile(
      path.join(TEST_WORKFLOWS_DIR, "bug-hunt.yaml"),
      yaml.stringify(bugHuntWorkflow)
    );

    await fs.writeFile(
      path.join(TEST_WORKFLOWS_DIR, "general.yaml"),
      yaml.stringify(generalWorkflow)
    );

    // Setup mock workflows
    mockWorkflows = new Map([
      ["tdd", tddWorkflow],
      ["bug-hunt", bugHuntWorkflow],
      ["general", generalWorkflow]
    ]);

    // Setup mocks
    mockLearningEngine = {
      recordToolUsage: mock(() => {}),
      recordWorkflowUsage: mock(() => {}),
      getPersonalizedSuggestions: mock(() => [])
    } as any;

    mockCelebrationGenerator = {
      generateWorkflowSelectionMotivation: mock(() => "🎯 Choose wisely for maximum impact!"),
      generateToolUsageEncouragement: mock(() => "💡 Keep using these tools for systematic progress!"),
      generateSuccessStory: mock(() => "Companies using systematic workflows ship 2x faster!"),
      generatePhaseEntryCelebration: mock(() => "→ Starting 🔴 Red Phase in tdd workflow")
    } as any;

    mockProgressTracker = {
      getProgressStats: mock(() => ({
        totalWorkflowsCompleted: 5,
        totalStepsCompleted: 25,
        currentStreak: 3,
        longestStreak: 7,
        workflowDiversity: 3
      })),
      getPersonalizedTips: mock(() => ["Try the TDD workflow for new features", "Use bug-hunt for debugging"])
    } as any;

    // Setup mock dependencies
    mockDeps = {
      workflows: mockWorkflows,
      getCurrentWorkflow: mock(() => "general"),
      setCurrentWorkflow: mock(() => {}),
      getCurrentPhase: mock(() => 0),
      setCurrentPhase: mock(() => {}),
      phaseProgress: new Map(),
      learningEngine: mockLearningEngine,
      celebrationGenerator: mockCelebrationGenerator,
      progressTracker: mockProgressTracker,
      saveWorkflowState: mock(() => Promise.resolve())
    };

    handler = new ApproachHandler(mockDeps);
  });

  afterEach(async () => {
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true }).catch(() => {});
  });

  describe("Workflow Listing (set='list')", () => {
    test("should return lean text output by default", async () => {
      const result = await handler.handleApproach({ set: "list" });
      const text = getTextResponse(result);

      expect(text).toContain("Workflows (current: general):");
      expect(text).toContain("tdd - Test-Driven Development");
      expect(text).toContain("bug-hunt - Bug Hunt");
    });

    test("should list all available workflows with descriptions and hints in JSON format", async () => {
      const result = await handler.handleApproach({ set: "list", output_format: "json" });
      const { summary, data } = parseResponse(result);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      expect(summary).toContain("📋 list");
      expect(data.action).toBe("list");
      expect(data.workflows).toHaveLength(3);

      const tdd = data.workflows.find((w: any) => w.key === "tdd");
      expect(tdd.name).toBe("Test-Driven Development");
      expect(tdd.description).toBe("Build reliable software through testing first");
      expect(tdd.triggerHints).toContain("test");
    });

    test("should show current workflow", async () => {
      const result = await handler.handleApproach({ set: "list", output_format: "json" });
      const { summary, data } = parseResponse(result);

      expect(summary).toContain("current: general");
      expect(data.currentWorkflow).toBe("general");
    });

    test("should include progress stats when workflows completed", async () => {
      const result = await handler.handleApproach({ set: "list", output_format: "json" });
      const { data } = parseResponse(result);

      expect(data.stats.workflowsCompleted).toBe(5);
      expect(data.stats.stepsCompleted).toBe(25);
    });

    test("should include personalized tips", async () => {
      const result = await handler.handleApproach({ set: "list", output_format: "json" });
      const { data } = parseResponse(result);

      expect(data.tips).toContain("Try the TDD workflow for new features");
      expect(data.tips).toContain("Use bug-hunt for debugging");
    });

    test("should include workflow selection motivation", async () => {
      const result = await handler.handleApproach({ set: "list", output_format: "json" });
      const { data } = parseResponse(result);

      expect(data.motivation).toBe("🎯 Choose wisely for maximum impact!");
    });

    test("should include next action guidance", async () => {
      const result = await handler.handleApproach({ set: "list", output_format: "json" });
      const { data } = parseResponse(result);

      // Structured format includes all data needed, no specific prose required
      expect(data.workflows).toBeDefined();
      expect(data.workflows.length).toBeGreaterThan(0);
    });

    test("should record tool usage for learning", async () => {
      await handler.handleApproach({ set: "list" });

      expect(mockLearningEngine.recordToolUsage).toHaveBeenCalledWith("approach", { set: "list" });
    });
  });

  describe("Workflow Switching", () => {
    test("should return lean text output by default when switching", async () => {
      const result = await handler.handleApproach({ set: "tdd" });
      const text = getTextResponse(result);

      expect(text).toContain("→ general → tdd");
      expect(text).toContain("Test-Driven Development");
      expect(text).toContain("Phase 1:");
      expect(text).toContain("Start with:");
    });

    test("should switch to valid workflow successfully in JSON format", async () => {
      const result = await handler.handleApproach({ set: "tdd", output_format: "json" });
      const { summary, data } = parseResponse(result);

      expect(mockDeps.setCurrentWorkflow).toHaveBeenCalledWith("tdd");
      expect(mockDeps.setCurrentPhase).toHaveBeenCalledWith(0);
      expect(mockDeps.saveWorkflowState).toHaveBeenCalled();

      expect(summary).toContain("🔄 set");
      expect(summary).toContain("general → tdd");
      expect(data.action).toBe("set");
      expect(data.previousWorkflow).toBe("general");
      expect(data.currentWorkflow.key).toBe("tdd");
      expect(data.currentWorkflow.name).toBe("Test-Driven Development");
      expect(data.firstPhase.name).toBe("🔴 Red Phase");
    });

    test("should handle switching to same workflow", async () => {
      const result = await handler.handleApproach({ set: "general", output_format: "json" });
      const { summary, data } = parseResponse(result);

      expect(summary).toContain("🎯 set");
      expect(data.previousWorkflow).toBe("general");
      expect(data.currentWorkflow.key).toBe("general");
    });

    test("should clear phase progress when switching workflows", async () => {
      mockDeps.phaseProgress.set("some-phase", ["step1", "step2"]);

      await handler.handleApproach({ set: "tdd" });

      expect(mockDeps.phaseProgress.size).toBe(0);
    });

    test("should record workflow usage for learning", async () => {
      await handler.handleApproach({ set: "bug-hunt" });

      expect(mockLearningEngine.recordWorkflowUsage).toHaveBeenCalledWith("bug-hunt");
    });

    test("should include first phase suggestions", async () => {
      const result = await handler.handleApproach({ set: "tdd", output_format: "json" });
      const { data } = parseResponse(result);

      expect(data.firstPhase.firstSteps).toContain("Create test file");
      expect(data.firstPhase.firstSteps).toContain("Write simple assertion");
      expect(data.firstPhase.firstSteps).toContain("Run test to see failure");
    });

    test("should include success story inspiration", async () => {
      const result = await handler.handleApproach({ set: "tdd", output_format: "json" });
      const { data } = parseResponse(result);

      expect(data.inspiration).toBe("Companies using systematic workflows ship 2x faster!");
    });

    test("should include next action guidance for new workflow", async () => {
      const result = await handler.handleApproach({ set: "tdd", output_format: "json" });
      const { data } = parseResponse(result);

      // Structured format includes all workflow data
      expect(data.firstPhase).toBeDefined();
      expect(data.firstPhase.firstSteps.length).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    test("should return lean text error by default", async () => {
      const result = await handler.handleApproach({ set: "nonexistent" });
      const text = getTextResponse(result);

      expect(text).toContain("error: Workflow not found");
      expect(text).toContain("requested: nonexistent");
      expect(text).toContain("Available:");
    });

    test("should handle invalid workflow name in JSON format", async () => {
      const result = await handler.handleApproach({ set: "nonexistent", output_format: "json" });
      const { summary, data } = parseResponse(result);

      expect(summary).toContain("❌ set");
      expect(data.error).toBe("Workflow not found");
      expect(data.requested).toBe("nonexistent");
      expect(data.available).toContain("tdd");
      expect(data.available).toContain("bug-hunt");
      expect(data.available).toContain("general");
    });

    test("should handle empty args gracefully", async () => {
      const result = await handler.handleApproach({ output_format: "json" });
      const { data } = parseResponse(result);

      // Should default to "list"
      expect(data.action).toBe("list");
      expect(data.workflows).toBeDefined();
    });

    test("should handle null args gracefully", async () => {
      const result = await handler.handleApproach(null);
      const text = getTextResponse(result);

      // Should default to "list" with text output
      expect(text).toContain("Workflows");
    });
  });

  describe("Behavioral Integration", () => {
    test("should integrate with celebration generator for motivation", async () => {
      await handler.handleApproach({ set: "list" });

      expect(mockCelebrationGenerator.generateWorkflowSelectionMotivation).toHaveBeenCalledWith(["tdd", "bug-hunt", "general"]);
      expect(mockCelebrationGenerator.generateToolUsageEncouragement).toHaveBeenCalledWith("workflow");
    });

    test("should integrate with progress tracker for stats", async () => {
      await handler.handleApproach({ set: "list" });

      expect(mockProgressTracker.getProgressStats).toHaveBeenCalled();
      expect(mockProgressTracker.getPersonalizedTips).toHaveBeenCalled();
    });

    test("should integrate with learning engine for personalized insights", async () => {
      mockLearningEngine.getPersonalizedSuggestions = mock(() => [
        "Based on your patterns, try TDD for new features",
        "You work well with structured approaches"
      ]);

      const result = await handler.handleApproach({ set: "list", output_format: "json" });
      const { data } = parseResponse(result);

      expect(data.insights).toContain("Based on your patterns, try TDD for new features");
      expect(data.insights).toContain("You work well with structured approaches");
    });

    test("should handle missing personalized suggestions gracefully", async () => {
      mockLearningEngine.getPersonalizedSuggestions = mock(() => []);

      const result = await handler.handleApproach({ set: "list", output_format: "json" });
      const { data } = parseResponse(result);

      expect(data.insights).toBeUndefined();
    });
  });

  describe("Workflow Details Display", () => {
    test("should show workflow description", async () => {
      const result = await handler.handleApproach({ set: "bug-hunt", output_format: "json" });
      const { data } = parseResponse(result);

      expect(data.currentWorkflow.description).toBe("Systematic debugging and issue resolution");
    });



    test("should show trigger hints in listing", async () => {
      const result = await handler.handleApproach({ set: "list", output_format: "json" });
      const { data } = parseResponse(result);

      const tdd = data.workflows.find((w: any) => w.key === "tdd");
      const bugHunt = data.workflows.find((w: any) => w.key === "bug-hunt");
      const general = data.workflows.find((w: any) => w.key === "general");

      expect(tdd.triggerHints).toContain("test");
      expect(bugHunt.triggerHints).toContain("bug");
      expect(general.triggerHints).toContain("general");
    });
  });
});