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
    test("should list all available workflows with descriptions and hints", async () => {
      const result = await handler.handleApproach({ set: "list" });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const text = result.content[0].text;
      expect(text).toContain("**Available approaches:**");
      expect(text).toContain("**tdd**: Build reliable software through testing first");
      expect(text).toContain("**bug-hunt**: Systematic debugging and issue resolution");
      expect(text).toContain("**general**: Balanced approach for general software development");
      expect(text).toContain("(test, tdd, testing)");
      expect(text).toContain("(bug, error, issue, broken)");
    });

    test("should show current workflow", async () => {
      const result = await handler.handleApproach({ set: "list" });

      const text = result.content[0].text;
      expect(text).toContain("**Current approach**: general");
    });

    test("should include progress stats when workflows completed", async () => {
      const result = await handler.handleApproach({ set: "list" });

      const text = result.content[0].text;
      expect(text).toContain("**Your progress**: 5 workflows completed, 25 steps total");
    });

    test("should include personalized tips", async () => {
      const result = await handler.handleApproach({ set: "list" });

      const text = result.content[0].text;
      expect(text).toContain("**Personalized suggestions:**");
      expect(text).toContain("Try the TDD workflow for new features");
      expect(text).toContain("Use bug-hunt for debugging");
    });

    test("should include workflow selection motivation", async () => {
      const result = await handler.handleApproach({ set: "list" });

      const text = result.content[0].text;
      expect(text).toContain("🎯 Choose wisely for maximum impact!");
    });

    test("should include next action guidance", async () => {
      const result = await handler.handleApproach({ set: "list" });

      const text = result.content[0].text;
      expect(text).toContain("🎯 **Next Action**: Choose a workflow with `approach set <name>`");
      expect(text).toContain("💡 **Remember**: Each workflow is optimized for specific goals");
    });

    test("should record tool usage for learning", async () => {
      await handler.handleApproach({ set: "list" });

      expect(mockLearningEngine.recordToolUsage).toHaveBeenCalledWith("approach", { set: "list" });
    });
  });

  describe("Workflow Switching", () => {
    test("should switch to valid workflow successfully", async () => {
      const result = await handler.handleApproach({ set: "tdd" });

      expect(mockDeps.setCurrentWorkflow).toHaveBeenCalledWith("tdd");
      expect(mockDeps.setCurrentPhase).toHaveBeenCalledWith(0);
      expect(mockDeps.saveWorkflowState).toHaveBeenCalled();

      const text = result.content[0].text;
      expect(text).toContain("Excellent choice! Switching from general to Test-Driven Development workflow");
      expect(text).toContain("**Test-Driven Development**");
      expect(text).toContain("Build reliable software through testing first");
      expect(text).toContain("**Starting with**: 🔴 Red Phase");
    });

    test("should handle switching to same workflow", async () => {
      const result = await handler.handleApproach({ set: "general" });

      const text = result.content[0].text;
      expect(text).toContain("🎯 Continuing with General Development workflow");
      expect(text).toContain("**General Development**");
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
      const result = await handler.handleApproach({ set: "tdd" });

      const text = result.content[0].text;
      expect(text).toContain("**First steps:**");
      expect(text).toContain("• Create test file");
      expect(text).toContain("• Write simple assertion");
      expect(text).toContain("• Run test to see failure");
    });

    test("should include success story inspiration", async () => {
      const result = await handler.handleApproach({ set: "tdd" });

      const text = result.content[0].text;
      expect(text).toContain("💡 **Inspiration**: Companies using systematic workflows ship 2x faster!");
    });

    test("should include next action guidance for new workflow", async () => {
      const result = await handler.handleApproach({ set: "tdd" });

      const text = result.content[0].text;
      expect(text).toContain("🎯 **Next Action**: Call `guide check` to get your specific next step");
      expect(text).toContain("💡 **Remember**: Work through the steps, then use `guide done \"description\"`");
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid workflow name", async () => {
      const result = await handler.handleApproach({ set: "nonexistent" });

      const text = result.content[0].text;
      expect(text).toContain("🎯 Workflow \"nonexistent\" not found!");
      expect(text).toContain("Try one of these proven workflows: tdd, bug-hunt, general");
    });

    test("should handle empty args gracefully", async () => {
      const result = await handler.handleApproach({});

      // Should default to "list"
      const text = result.content[0].text;
      expect(text).toContain("**Available approaches:**");
    });

    test("should handle null args gracefully", async () => {
      const result = await handler.handleApproach(null);

      const text = result.content[0].text;
      expect(text).toContain("**Available approaches:**");
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

      const result = await handler.handleApproach({ set: "list" });

      const text = result.content[0].text;
      expect(text).toContain("**Smart insights from your patterns:**");
      expect(text).toContain("Based on your patterns, try TDD for new features");
      expect(text).toContain("You work well with structured approaches");
    });

    test("should handle missing personalized suggestions gracefully", async () => {
      mockLearningEngine.getPersonalizedSuggestions = mock(() => []);

      const result = await handler.handleApproach({ set: "list" });

      const text = result.content[0].text;
      expect(text).not.toContain("**Smart insights from your patterns:**");
    });
  });

  describe("Workflow Details Display", () => {
    test("should show workflow description", async () => {
      const result = await handler.handleApproach({ set: "bug-hunt" });

      const text = result.content[0].text;
      expect(text).toContain("Systematic debugging and issue resolution");
    });



    test("should show trigger hints in listing", async () => {
      const result = await handler.handleApproach({ set: "list" });

      const text = result.content[0].text;
      expect(text).toContain("(test, tdd, testing)");
      expect(text).toContain("(bug, error, issue, broken)");
      expect(text).toContain("(general, development)");
    });
  });
});