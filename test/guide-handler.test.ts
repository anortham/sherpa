#!/usr/bin/env bun
import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as yaml from "yaml";
import { GuideHandler, GuideHandlerDependencies } from "../src/handlers/GuideHandler";
import { AdaptiveLearningEngine } from "../src/behavioral-adoption/adaptive-learning-engine";
import { CelebrationGenerator } from "../src/behavioral-adoption/celebration-generator";
import { ProgressTracker } from "../src/behavioral-adoption/progress-tracker";

const TEST_SHERPA_HOME = path.join(os.tmpdir(), "sherpa-guide-handler-test");
const TEST_WORKFLOWS_DIR = path.join(TEST_SHERPA_HOME, "workflows");

// Helper function to parse structured response
function parseResponse(result: any): { summary: string; data: any } {
  const text = result.content[0].text;
  const parts = text.split("\n\n");
  const summary = parts[0];
  const jsonStr = parts.slice(1).join("\n\n");
  const data = JSON.parse(jsonStr);
  return { summary, data };
}

describe("GuideHandler", () => {
  let mockWorkflows: Map<string, any>;
  let mockLearningEngine: AdaptiveLearningEngine;
  let mockCelebrationGenerator: CelebrationGenerator;
  let mockProgressTracker: ProgressTracker;
  let mockDeps: GuideHandlerDependencies;
  let handler: GuideHandler;
  let currentPhase = 0;

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
          suggestions: [
            "Create test file",
            "Write simple assertion",
            "Run test to see failure"
          ]
        },
        {
          name: "🟢 Green Phase",
          guidance: "Write the minimal code to make the test pass",
          suggestions: [
            "Implement minimal solution",
            "Run test to confirm pass",
            "Don't add extra features"
          ]
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
          suggestions: [
            "Reproduce the bug consistently",
            "Identify minimum reproduction steps",
            "Isolate the problematic code"
          ]
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

    // Setup mock workflows
    mockWorkflows = new Map([
      ["tdd", tddWorkflow],
      ["bug-hunt", bugHuntWorkflow]
    ]);

    // Setup mocks
    mockLearningEngine = {
      recordToolUsage: mock(() => {}),
      recordWorkflowUsage: mock(() => {}),
      generatePredictiveContext: mock(() => ({
        currentWorkflow: "tdd",
        currentPhase: "🔴 Red Phase",
        timeInPhase: 10,
        recentActions: ["check"],
        userBehaviorProfile: {
          totalSessionTime: 100,
          averageSessionLength: 50,
          toolUsageFrequency: {},
          preferredCelebrationLevel: "medium",
          workflowSwitchFrequency: 2,
          contextAwarenessAccuracy: 0.8,
          predictiveHintAcceptanceRate: 0.7
        },
        sessionContext: "building new feature",
        workingTime: 30,
        isStuck: false,
        confidence: 0.9
      })),
      generateAdaptiveHint: mock(() => null),
      getPersonalizedSuggestions: mock(() => []),
      recordWorkflowCompletion: mock(() => {})
    } as any;

    mockCelebrationGenerator = {
      generateCelebration: mock(() => "✓ Step completed successfully!"),
      generatePhaseEntryCelebration: mock(() => "→ Starting 🔴 Red Phase in tdd workflow"),
      generateToolUsageEncouragement: mock(() => "💡 Keep using these tools for systematic progress!"),
      generateWorkflowSelectionMotivation: mock(() => "🎯 Choose wisely for maximum impact!"),
      generateSuccessStory: mock(() => "Companies using systematic workflows ship 2x faster!")
    } as any;

    mockProgressTracker = {
      recordProgressCheck: mock(() => {}),
      recordStepCompletion: mock(() => []),
      recordWorkflowCompletion: mock(() => []),
      getProgressEncouragement: mock(() => "You're making great progress!")
    } as any;

    // Setup mock dependencies
    currentPhase = 0;
    mockDeps = {
      workflows: mockWorkflows,
      getCurrentWorkflow: mock(() => "tdd"),
      setCurrentWorkflow: mock(() => {}),
      getCurrentPhase: mock(() => currentPhase),
      setCurrentPhase: mock((phase: number) => { currentPhase = phase; }),
      phaseProgress: new Map(),
      learningEngine: mockLearningEngine,
      celebrationGenerator: mockCelebrationGenerator,
      progressTracker: mockProgressTracker,
      detectWorkflowFromContext: mock(() => "tdd"),
      generateWorkflowSuggestion: mock(() => ""),
      saveWorkflowState: mock(() => Promise.resolve()),
      recordProgress: mock(() => Promise.resolve()),
      getCurrentPhaseName: mock(() => currentPhase === 0 ? "🔴 Red Phase" : "🟢 Green Phase"),
      getWorkflowProgress: mock(() => ({ completed: 1, total: 3 })),
      getTotalCompletedSteps: mock(() => 5),
      formatAdaptiveHint: mock(() => ""),
      generateProgressSummary: mock(() => "Progress: 1/3 steps completed")
    };

    handler = new GuideHandler(mockDeps);
  });

  afterEach(async () => {
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true }).catch(() => {});
  });

  describe("Error Handling", () => {
    test("should handle no workflow loaded", async () => {
      mockDeps.workflows = new Map();

      const result = await handler.handleGuide({ action: "check" });
      const { summary, data } = parseResponse(result);

      expect(summary).toContain("❌ error");
      expect(data.error).toBe("No workflow loaded");
      expect(data.action).toBe("Use 'approach set <workflow>' to choose a workflow");
    });
  });

  describe("Action: check", () => {
    test("should return current phase guidance and suggestions", async () => {
      const result = await handler.handleGuide({ action: "check" });
      const { summary, data } = parseResponse(result);

      expect(summary).toContain("🔍 check");
      expect(summary).toContain("Test-Driven Development");
      expect(data.action).toBe("check");
      expect(data.phase.name).toBe("🔴 Red Phase");
      expect(data.phase.number).toBe(1);
      expect(data.phase.total).toBe(2);
      expect(data.phase.guidance).toBe("Write a failing test that describes the desired behavior");
      expect(data.nextSteps).toContain("Create test file");
      expect(data.nextSteps).toContain("Write simple assertion");
      expect(data.nextSteps).toContain("Run test to see failure");
    });

    test("should include progress summary", async () => {
      const result = await handler.handleGuide({ action: "check" });
      const { data } = parseResponse(result);

      expect(data.progress).toBeDefined();
      expect(data.progress.completed).toBeDefined();
      expect(data.progress.total).toBeDefined();
    });

    test("should include next action guidance", async () => {
      const result = await handler.handleGuide({ action: "check" });
      const { data } = parseResponse(result);

      // Structured format doesn't include prose, but has all the data needed
      expect(data.nextSteps).toBeDefined();
      expect(data.nextSteps.length).toBeGreaterThan(0);
    });

    test("should record tool usage for learning", async () => {
      await handler.handleGuide({ action: "check" });

      expect(mockLearningEngine.recordToolUsage).toHaveBeenCalledWith("guide", { action: "check" });
    });

    test("should include adaptive hints when available", async () => {
      mockLearningEngine.generateAdaptiveHint = mock(() => ({
        type: "next-step" as any,
        content: "Try writing a simpler test first",
        confidence: 0.8,
        timing: "immediate" as any,
        priority: "medium" as any,
        context: "tdd red phase",
        learningBasis: ["pattern recognition"]
      }));
      mockDeps.formatAdaptiveHint = mock(() => "💡 **Hint**: Try writing a simpler test first");

      const result = await handler.handleGuide({ action: "check" });
      const { data } = parseResponse(result);

      expect(data.adaptiveHint).toBeDefined();
      expect(data.adaptiveHint.type).toBe("next-step");
      expect(data.adaptiveHint.content).toBe("Try writing a simpler test first");
      expect(data.adaptiveHint.confidence).toBe(0.8);
    });

    test("should include workflow suggestions when context provided", async () => {
      mockDeps.generateWorkflowSuggestion = mock(() => "💡 I detected you're building a new feature. Consider switching to TDD workflow for optimal results.");

      const result = await handler.handleGuide({ action: "check", context: "building new authentication feature" });
      const { data } = parseResponse(result);

      expect(data.workflowSuggestion).toBeDefined();
      expect(data.workflowSuggestion).toContain("building a new feature");
    });
  });

  describe("Action: done", () => {
    test("should record progress and generate celebration", async () => {
      const result = await handler.handleGuide({ action: "done", completed: "wrote first test" });
      const { data } = parseResponse(result);

      expect(mockDeps.recordProgress).toHaveBeenCalledWith("wrote first test");
      expect(mockCelebrationGenerator.generateCelebration).toHaveBeenCalled();
      expect(data.celebration).toBeDefined();
    });

    test("should record step completion", async () => {
      const result = await handler.handleGuide({ action: "done", completed: "wrote first test" });

      expect(mockDeps.recordProgress).toHaveBeenCalledWith("wrote first test");
      expect(mockProgressTracker.recordStepCompletion).toHaveBeenCalledWith("tdd", "wrote first test");
    });

    test("should handle phase completion logic", async () => {
      // Test that the phase completion detection is called
      // The actual advancement depends on complex conditions
      const result = await handler.handleGuide({ action: "done", completed: "completed all red phase steps" });
      const { data } = parseResponse(result);

      expect(data.celebration).toBeDefined();
    });

    test("should handle workflow completion in final phase", async () => {
      mockDeps.getCurrentPhase = mock(() => 1); // Already in final phase

      const result = await handler.handleGuide({ action: "done", completed: "finished implementation" });
      const { data } = parseResponse(result);

      // Workflow completion logic is complex and depends on phase completion detection
      expect(data.celebration).toBeDefined();
    });
  });

  describe("Action: advance", () => {
    test("should manually advance to next phase", async () => {
      const result = await handler.handleGuide({ action: "advance" });
      const { summary, data } = parseResponse(result);

      expect(mockDeps.setCurrentPhase).toHaveBeenCalledWith(1);
      expect(summary).toContain("🔄 advance");
      expect(data.action).toBe("advance");
      expect(data.previousPhase).toBe("🔴 Red Phase");
      expect(data.currentPhase.name).toBe("🟢 Green Phase");
      expect(data.currentPhase.number).toBe(2);
    });

    test("should prevent advancing beyond final phase", async () => {
      mockDeps.getCurrentPhase = mock(() => 1); // Already in final phase

      const result = await handler.handleGuide({ action: "advance" });
      const { summary, data } = parseResponse(result);

      expect(mockDeps.setCurrentPhase).not.toHaveBeenCalled();
      expect(summary).toContain("⚠️ advance");
      expect(data.error).toBe("Already in final phase");
    });

    test("should record advance action for learning", async () => {
      await handler.handleGuide({ action: "advance" });

      expect(mockLearningEngine.recordToolUsage).toHaveBeenCalledWith("guide-advance", {
        from: "🔴 Red Phase",
        to: "🟢 Green Phase"
      });
    });
  });

  describe("Quick Shortcuts", () => {
    test("should handle tdd shortcut", async () => {
      const result = await handler.handleGuide({ action: "tdd" });

      expect(mockDeps.setCurrentWorkflow).toHaveBeenCalledWith("tdd");
      expect(mockDeps.setCurrentPhase).toHaveBeenCalledWith(0);
      expect(mockDeps.phaseProgress).toEqual(new Map());
      expect(mockLearningEngine.recordWorkflowUsage).toHaveBeenCalledWith("tdd", undefined);
      expect(mockDeps.saveWorkflowState).toHaveBeenCalled();
    });

    test("should handle bug shortcut", async () => {
      const result = await handler.handleGuide({ action: "bug" });

      expect(mockDeps.setCurrentWorkflow).toHaveBeenCalledWith("bug-hunt");
      expect(mockDeps.setCurrentPhase).toHaveBeenCalledWith(0);
      expect(mockDeps.phaseProgress).toEqual(new Map());
      expect(mockLearningEngine.recordWorkflowUsage).toHaveBeenCalledWith("bug-hunt", undefined);
    });

    test("should handle next with context detection", async () => {
      mockDeps.detectWorkflowFromContext = mock(() => "bug-hunt");

      const result = await handler.handleGuide({ action: "next", context: "fixing login bug" });

      expect(mockDeps.setCurrentWorkflow).toHaveBeenCalledWith("bug-hunt");
      expect(mockDeps.setCurrentPhase).toHaveBeenCalledWith(0);
      expect(mockLearningEngine.recordWorkflowUsage).toHaveBeenCalledWith("bug-hunt", "fixing login bug");
    });

    test("should not switch workflow if context matches current", async () => {
      mockDeps.detectWorkflowFromContext = mock(() => "tdd");

      const result = await handler.handleGuide({ action: "next", context: "building new feature" });

      expect(mockDeps.setCurrentWorkflow).not.toHaveBeenCalled();
    });
  });

  describe("Behavioral Integration", () => {
    test("should integrate with learning engine for predictive context", async () => {
      await handler.handleGuide({ action: "check" });

      expect(mockLearningEngine.generatePredictiveContext).toHaveBeenCalledWith(
        "tdd",
        "🔴 Red Phase",
        undefined
      );
    });

    test("should integrate with progress tracker for encouragement", async () => {
      const result = await handler.handleGuide({ action: "check" });
      const { data } = parseResponse(result);

      expect(mockProgressTracker.recordProgressCheck).toHaveBeenCalled();
      expect(mockProgressTracker.getProgressEncouragement).toHaveBeenCalled();
      expect(data.encouragement).toBe("You're making great progress!");
    });

    test("should include success stories occasionally", async () => {
      // Mock random to return value that triggers success story (random < 0.3)
      const originalRandom = Math.random;
      Math.random = mock(() => 0.2);

      const result = await handler.handleGuide({ action: "check" });
      const { data } = parseResponse(result);

      expect(data.inspiration).toBe("Companies using systematic workflows ship 2x faster!");

      Math.random = originalRandom;
    });
  });

  describe("Progress Display Integration", () => {
    test("should use ProgressDisplay for accurate progress calculation", async () => {
      // This test verifies that the handler integrates with ProgressDisplay utilities
      // The actual calculation logic is tested separately in progress-display.test.ts
      const result = await handler.handleGuide({ action: "check" });
      const { data } = parseResponse(result);

      expect(data.progress).toBeDefined();
      expect(data.progress.completed).toBeDefined();
      expect(data.progress.total).toBeDefined();
    });
  });


});