#!/usr/bin/env bun
import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { ProgressTracker } from "../src/behavioral-adoption/progress-tracker";
import { CelebrationGenerator } from "../src/behavioral-adoption/celebration-generator";
import { AdaptiveLearningEngine } from "../src/behavioral-adoption/adaptive-learning-engine";
import { StateCoordinator } from "../src/state/state-coordinator";
import { WorkflowStateManager } from "../src/workflow/workflow-state-manager";

const TEST_SHERPA_HOME = path.join(os.tmpdir(), "sherpa-integration-test");

// Mock logger
const mockLogger = (level: string, message: string) => {
  // Silent for tests
};

describe("Behavioral System Integration", () => {
  beforeAll(async () => {
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
  });

  test("should complete full workflow with persistence across restart", async () => {
    // Clean up before test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    // === SESSION 1: Start workflow and make progress ===
    let progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    let learningEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
    let workflowManager = new WorkflowStateManager(mockLogger, TEST_SHERPA_HOME);
    let celebrationGen = new CelebrationGenerator(progressTracker);
    let coordinator = new StateCoordinator(workflowManager, progressTracker, learningEngine);

    await progressTracker.waitForLoad();

    // Record workflow usage
    learningEngine.recordWorkflowUsage("tdd", "building authentication");

    // Complete some steps
    progressTracker.recordStepCompletion("tdd", "wrote first test");
    progressTracker.recordStepCompletion("tdd", "wrote second test");

    // Generate celebration
    const celebration1 = celebrationGen.generateCelebration({
      workflowType: "tdd",
      phaseName: "🧪 Write Tests",
      stepDescription: "wrote first test"
    });

    expect(celebration1).toContain("✓ Step complete");
    expect(celebration1).toContain("wrote first test");

    // Save all state
    const phaseProgress = new Map<string, string[]>();
    phaseProgress.set("Write Tests", ["wrote first test", "wrote second test"]);

    await coordinator.saveAll("tdd", 0, phaseProgress);

    // === SESSION 2: "Restart" - Load state and continue ===
    progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    learningEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
    workflowManager = new WorkflowStateManager(mockLogger, TEST_SHERPA_HOME);
    celebrationGen = new CelebrationGenerator(progressTracker);
    coordinator = new StateCoordinator(workflowManager, progressTracker, learningEngine);

    // Load all state
    const loadedState = await coordinator.loadAll();

    // Verify state restored
    expect(loadedState.workflowState).not.toBeNull();
    expect(loadedState.workflowState?.currentWorkflow).toBe("tdd");
    expect(loadedState.workflowState?.currentPhase).toBe(0);
    expect(loadedState.progressLoaded).toBe(true);
    expect(loadedState.learningLoaded).toBe(true);

    // Verify progress restored
    const stats = progressTracker.getProgressStats();
    expect(stats.totalStepsCompleted).toBe(2);
    expect(stats.workflowTypeUsage.tdd).toBeGreaterThan(0);

    // Complete more steps
    progressTracker.recordStepCompletion("tdd", "implemented feature");

    // Complete the workflow
    const milestones = progressTracker.recordWorkflowCompletion("tdd", 5, 30);

    // Should unlock "first workflow" milestone
    expect(milestones.length).toBeGreaterThan(0);
    expect(milestones[0].id).toBe("first_workflow_completion");

    // Generate workflow completion celebration
    const completionCelebration = celebrationGen.generateCelebration({
      workflowType: "tdd",
      phaseName: "Final Phase",
      isWorkflowComplete: true,
      newMilestones: milestones
    });

    expect(completionCelebration).toContain("MILESTONE UNLOCKED");
    expect(completionCelebration).toContain("✓ Workflow complete");
    expect(completionCelebration).toContain("tdd");
  });

  test("should track milestones across multiple workflows", async () => {
    // Clean up before test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    const progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    const celebrationGen = new CelebrationGenerator(progressTracker);
    await progressTracker.waitForLoad();

    // Complete first workflow
    progressTracker.recordWorkflowCompletion("tdd", 5, 30);

    // Complete second workflow
    progressTracker.recordWorkflowCompletion("bug-hunt", 4, 25);

    // Complete third workflow
    progressTracker.recordWorkflowCompletion("general", 6, 35);

    // Complete fourth workflow
    progressTracker.recordWorkflowCompletion("rapid", 3, 20);

    // Complete fifth workflow - should unlock "Workflow Veteran"
    const milestones = progressTracker.recordWorkflowCompletion("refactor", 5, 28);

    // Should have unlocked "5 workflows" milestone
    const veteranMilestone = milestones.find(m => m.id === "five_workflows_completed");
    expect(veteranMilestone).toBeDefined();
    expect(veteranMilestone?.name).toBe("Workflow Veteran");

    // Verify all milestones persist
    await progressTracker.saveState();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create new tracker (simulate restart)
    const newTracker = new ProgressTracker(TEST_SHERPA_HOME);
    await newTracker.waitForLoad();

    const achievedMilestones = newTracker.getAchievedMilestones();
    expect(achievedMilestones.length).toBeGreaterThanOrEqual(2);
    expect(achievedMilestones.some(m => m.id === "first_workflow_completion")).toBe(true);
    expect(achievedMilestones.some(m => m.id === "five_workflows_completed")).toBe(true);
  });

  test("should provide deterministic celebrations for same context", async () => {
    const progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    const celebrationGen = new CelebrationGenerator(progressTracker);

    const context = {
      workflowType: "tdd",
      phaseName: "Implementation",
      stepDescription: "implemented auth"
    };

    // Generate 5 times
    const celebrations = Array.from({ length: 5 }, () =>
      celebrationGen.generateCelebration(context)
    );

    // All should be identical
    const uniqueCelebrations = new Set(celebrations);
    expect(uniqueCelebrations.size).toBe(1);
  });

  test("should integrate learning engine with progress tracking", async () => {
    // Clean up before test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    const learningEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

    // Record usage patterns
    learningEngine.recordWorkflowUsage("tdd", "fixing authentication bug");
    learningEngine.recordWorkflowUsage("tdd", "adding new feature with tests");
    learningEngine.recordWorkflowUsage("bug-hunt", "debugging login issue");

    // Record completion
    learningEngine.recordWorkflowCompletion("tdd", 25, true);

    // Get personalized suggestions
    const suggestions = learningEngine.getPersonalizedSuggestions();

    // Should have learning-based suggestions
    expect(suggestions.length).toBeGreaterThan(0);

    // Save and reload
    await learningEngine.saveUserProfile();
    await new Promise(resolve => setTimeout(resolve, 100));

    const newEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
    await newEngine.loadUserProfile();

    const profile = newEngine.getUserProfile();
    expect(profile.workflowPatterns.length).toBeGreaterThan(0);
    expect(profile.workflowPatterns.some(wp => wp.workflowType === "tdd")).toBe(true);
  });

  test("should maintain state consistency during concurrent operations", async () => {
    // Clean up before test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    const progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    const learningEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
    const workflowManager = new WorkflowStateManager(mockLogger, TEST_SHERPA_HOME);
    const coordinator = new StateCoordinator(workflowManager, progressTracker, learningEngine);

    await progressTracker.waitForLoad();

    // Perform multiple operations
    progressTracker.recordStepCompletion("tdd", "step 1");
    progressTracker.recordStepCompletion("tdd", "step 2");
    learningEngine.recordWorkflowUsage("tdd");

    const phaseProgress = new Map<string, string[]>();
    phaseProgress.set("Phase 1", ["step 1", "step 2"]);

    // Save all
    const result = await coordinator.saveAll("tdd", 0, phaseProgress);
    expect(result.success).toBe(true);

    // Load all
    const state = await coordinator.loadAll();
    expect(state.workflowState).not.toBeNull();
    expect(state.progressLoaded).toBe(true);
    expect(state.learningLoaded).toBe(true);

    // Verify consistency
    const stats = progressTracker.getProgressStats();
    expect(stats.totalStepsCompleted).toBe(2);
  });

  test("should handle streak tracking across sessions", async () => {
    // Clean up before test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    // Day 1
    let progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    await progressTracker.waitForLoad();
    progressTracker.recordStepCompletion("tdd", "day 1 work");
    await progressTracker.saveState();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Day 2 (simulate same day for testing)
    progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    await progressTracker.waitForLoad();
    progressTracker.recordStepCompletion("tdd", "day 2 work");

    const stats = progressTracker.getProgressStats();
    expect(stats.currentStreak).toBeGreaterThan(0);
    expect(stats.totalStepsCompleted).toBe(2);
  });

  test("should generate appropriate transitions between phases", async () => {
    const progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    const celebrationGen = new CelebrationGenerator(progressTracker);

    // Phase entry
    const entryMessage = celebrationGen.generatePhaseEntryCelebration("tdd", "🧪 Write Tests");
    expect(entryMessage).toContain("→ Starting");
    expect(entryMessage).toContain("🧪 Write Tests");

    // Phase completion
    const phaseComplete = celebrationGen.generateCelebration({
      workflowType: "tdd",
      phaseName: "🧪 Write Tests",
      isPhaseComplete: true
    });
    expect(phaseComplete).toContain("✓ Phase complete");
    expect(phaseComplete).toContain("→ Moving to next phase");
    expect(phaseComplete).toContain("guide check");
  });

  test("should provide evidence-based success stories", async () => {
    const progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    const celebrationGen = new CelebrationGenerator(progressTracker);

    const workflows = ["tdd", "bug-hunt", "general", "rapid", "refactor", "planning"];

    workflows.forEach(workflow => {
      const story = celebrationGen.generateSuccessStory(workflow);
      expect(story.length).toBeGreaterThan(0);
      // Should contain evidence (percentage or multiplier)
      expect(/\d+%|\d+\.?\d*x/.test(story)).toBe(true);
    });
  });

  test("should handle state recovery from corruption", async () => {
    // Clean up before test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    // Create valid state
    let progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    await progressTracker.waitForLoad();
    progressTracker.recordStepCompletion("tdd", "step 1");
    await progressTracker.saveState();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Corrupt the progress file
    const progressFile = path.join(TEST_SHERPA_HOME, "progress-tracker.json");
    await fs.writeFile(progressFile, "{ corrupt json");

    // Should recover gracefully with defaults
    progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    await progressTracker.waitForLoad();

    const stats = progressTracker.getProgressStats();
    // Should have default stats (not throw error)
    expect(stats.totalStepsCompleted).toBeDefined();
    expect(typeof stats.totalStepsCompleted).toBe("number");
  });
});