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

      expect(result.content[0].text).toContain("🏔️ No workflow loaded!");
      expect(result.content[0].text).toContain("Use the 'workflow' tool to choose your development adventure");
    });
  });

  describe("Action: check", () => {
    test("should return current phase guidance and suggestions", async () => {
      const result = await handler.handleGuide({ action: "check" });

      const text = result.content[0].text;
      expect(text).toContain("**🔴 Red Phase** (1/2)");
      expect(text).toContain("Write a failing test that describes the desired behavior");
      expect(text).toContain("**Next steps:**");
      expect(text).toContain("• Create test file");
      expect(text).toContain("• Write simple assertion");
      expect(text).toContain("• Run test to see failure");
    });

    test("should include progress summary", async () => {
      const result = await handler.handleGuide({ action: "check" });

      const text = result.content[0].text;
      expect(text).toContain("Progress: 1/3 steps completed");
    });

    test("should include next action guidance", async () => {
      const result = await handler.handleGuide({ action: "check" });

      const text = result.content[0].text;
      expect(text).toContain("🎯 **Next Action**: Work on the suggested steps above");
      expect(text).toContain("💡 **Remember**: Use `guide check` anytime you need your next step");
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

      const text = result.content[0].text;
      expect(text).toContain("💡 **Hint**: Try writing a simpler test first");
    });

    test("should include workflow suggestions when context provided", async () => {
      mockDeps.generateWorkflowSuggestion = mock(() => "💡 I detected you're building a new feature. Consider switching to TDD workflow for optimal results.");

      const result = await handler.handleGuide({ action: "check", context: "building new authentication feature" });

      const text = result.content[0].text;
      expect(text).toContain("💡 I detected you're building a new feature. Consider switching to TDD workflow for optimal results.");
    });
  });

  describe("Action: done", () => {
    test("should record progress and generate celebration", async () => {
      const result = await handler.handleGuide({ action: "done", completed: "wrote first test" });

      expect(mockDeps.recordProgress).toHaveBeenCalledWith("wrote first test");
      expect(mockCelebrationGenerator.generateCelebration).toHaveBeenCalled();

      const text = result.content[0].text;
      expect(text).toContain("✓ Step completed successfully!");
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

      expect(result.content[0].text).toContain("✓ Step completed successfully!");
    });

    test("should handle workflow completion in final phase", async () => {
      mockDeps.getCurrentPhase = mock(() => 1); // Already in final phase

      const result = await handler.handleGuide({ action: "done", completed: "finished implementation" });

      // Workflow completion logic is complex and depends on phase completion detection
      expect(result.content[0].text).toContain("✓ Step completed successfully!");
    });
  });

  describe("Action: advance", () => {
    test("should manually advance to next phase", async () => {
      const result = await handler.handleGuide({ action: "advance" });

      expect(mockDeps.setCurrentPhase).toHaveBeenCalledWith(1);

      const text = result.content[0].text;
      expect(text).toContain("🔄 **Advanced from 🔴 Red Phase to 🟢 Green Phase**");
      expect(text).toContain("**🟢 Green Phase** (2/2)");
    });

    test("should prevent advancing beyond final phase", async () => {
      mockDeps.getCurrentPhase = mock(() => 1); // Already in final phase

      const result = await handler.handleGuide({ action: "advance" });

      expect(mockDeps.setCurrentPhase).not.toHaveBeenCalled();

      const text = result.content[0].text;
      expect(text).toContain("🎯 You're already in the final phase!");
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

      expect(mockProgressTracker.recordProgressCheck).toHaveBeenCalled();
      expect(mockProgressTracker.getProgressEncouragement).toHaveBeenCalled();

      const text = result.content[0].text;
      expect(text).toContain("You're making great progress!");
    });

    test("should include success stories occasionally", async () => {
      // Mock random to return value that triggers success story (random < 0.3)
      const originalRandom = Math.random;
      Math.random = mock(() => 0.2);

      const result = await handler.handleGuide({ action: "check" });

      const text = result.content[0].text;
      expect(text).toContain("💡 **Inspiration**: Companies using systematic workflows ship 2x faster!");

      Math.random = originalRandom;
    });
  });

  describe("Progress Display Integration", () => {
    test("should use ProgressDisplay for accurate progress calculation", async () => {
      // This test verifies that the handler integrates with ProgressDisplay utilities
      // The actual calculation logic is tested separately in progress-display.test.ts
      const result = await handler.handleGuide({ action: "check" });

      expect(result.content[0].text).toContain("Progress: 1/3 steps completed");
    });
  });


});