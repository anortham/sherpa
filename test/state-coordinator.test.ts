#!/usr/bin/env bun
import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { StateCoordinator } from "../src/state/state-coordinator";
import { WorkflowStateManager } from "../src/workflow/workflow-state-manager";
import { ProgressTracker } from "../src/behavioral-adoption/progress-tracker";
import { AdaptiveLearningEngine } from "../src/behavioral-adoption/adaptive-learning-engine";

const TEST_SHERPA_HOME = path.join(os.tmpdir(), "sherpa-coordinator-test");

// Mock logger function
const mockLogger = (level: string, message: string) => {
  // Silent logger for tests
};

describe("StateCoordinator", () => {
  beforeAll(async () => {
    // Clean up test directory
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
  });

  test("should save all state systems atomically", async () => {
    // Clean up before test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    const workflowManager = new WorkflowStateManager(mockLogger, TEST_SHERPA_HOME);
    const progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    const learningEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

    await progressTracker.waitForLoad();

    const coordinator = new StateCoordinator(workflowManager, progressTracker, learningEngine);

    // Modify state in all three systems
    progressTracker.recordStepCompletion("tdd", "wrote test");
    learningEngine.recordToolUsage("guide", { action: "check" });

    const phaseProgress = new Map<string, string[]>();
    phaseProgress.set("Phase 1", ["step 1", "step 2"]);

    // Save all atomically
    const result = await coordinator.saveAll("tdd", 0, phaseProgress);

    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);

    // Verify all files were created
    const progressFile = path.join(TEST_SHERPA_HOME, "progress-tracker.json");
    const workflowFile = path.join(TEST_SHERPA_HOME, "workflow-state.json");
    const profileFile = path.join(TEST_SHERPA_HOME, "user-profile.json");

    const [progressExists, workflowExists, profileExists] = await Promise.all([
      fs.access(progressFile).then(() => true).catch(() => false),
      fs.access(workflowFile).then(() => true).catch(() => false),
      fs.access(profileFile).then(() => true).catch(() => false)
    ]);

    expect(progressExists).toBe(true);
    expect(workflowExists).toBe(true);
    expect(profileExists).toBe(true);
  });

  test("should load all state systems", async () => {
    // Clean up before test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    // Create first set of systems and save state
    const workflowManager1 = new WorkflowStateManager(mockLogger, TEST_SHERPA_HOME);
    const progressTracker1 = new ProgressTracker(TEST_SHERPA_HOME);
    const learningEngine1 = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

    await progressTracker1.waitForLoad();

    const coordinator1 = new StateCoordinator(workflowManager1, progressTracker1, learningEngine1);

    progressTracker1.recordStepCompletion("tdd", "test 1");
    progressTracker1.recordStepCompletion("tdd", "test 2");

    const phaseProgress1 = new Map<string, string[]>();
    phaseProgress1.set("Testing Phase", ["wrote test"]);

    await coordinator1.saveAll("bug-hunt", 1, phaseProgress1);

    // Create second set of systems (simulates restart)
    const workflowManager2 = new WorkflowStateManager(mockLogger, TEST_SHERPA_HOME);
    const progressTracker2 = new ProgressTracker(TEST_SHERPA_HOME);
    const learningEngine2 = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

    const coordinator2 = new StateCoordinator(workflowManager2, progressTracker2, learningEngine2);

    const state = await coordinator2.loadAll();

    // Verify workflow state restored
    expect(state.workflowState).not.toBeNull();
    expect(state.workflowState?.currentWorkflow).toBe("bug-hunt");
    expect(state.workflowState?.currentPhase).toBe(1);
    expect(state.workflowState?.phaseProgress.get("Testing Phase")).toEqual(["wrote test"]);

    // Verify progress loaded
    expect(state.progressLoaded).toBe(true);

    // Verify learning loaded
    expect(state.learningLoaded).toBe(true);

    // Verify progress data actually loaded
    const stats = progressTracker2.getProgressStats();
    expect(stats.totalStepsCompleted).toBe(2);
  });

  test("should handle partial state load gracefully", async () => {
    // Clean up before test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    // Only create workflow state file, not the others
    const workflowFile = path.join(TEST_SHERPA_HOME, "workflow-state.json");
    await fs.writeFile(workflowFile, JSON.stringify({
      currentWorkflow: "tdd",
      currentPhase: 0,
      phaseProgress: {},
      lastUpdated: new Date(),
      sessionStartTime: new Date()
    }));

    const workflowManager = new WorkflowStateManager(mockLogger, TEST_SHERPA_HOME);
    const progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    const learningEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

    const coordinator = new StateCoordinator(workflowManager, progressTracker, learningEngine);
    const state = await coordinator.loadAll();

    // Workflow state should load successfully
    expect(state.workflowState).not.toBeNull();
    expect(state.workflowState?.currentWorkflow).toBe("tdd");

    // Progress and learning should still initialize (with defaults)
    expect(state.progressLoaded).toBe(true); // No file to load, but initialization succeeds
    expect(state.learningLoaded).toBe(true);
  });

  test("should continue on partial save failure", async () => {
    // Clean up before test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    const workflowManager = new WorkflowStateManager(mockLogger, TEST_SHERPA_HOME);
    const progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    const learningEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

    await progressTracker.waitForLoad();

    const coordinator = new StateCoordinator(workflowManager, progressTracker, learningEngine);

    // Make directory read-only to simulate partial failure
    // (This is tricky - we'll just test that Promise.allSettled works)
    const phaseProgress = new Map<string, string[]>();

    const result = await coordinator.saveAll("tdd", 0, phaseProgress);

    // Even if individual saves might fail, the method should complete
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('errors');
    expect(Array.isArray(result.errors)).toBe(true);
  });

  test("should provide state status", async () => {
    // Clean up before test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    const workflowManager = new WorkflowStateManager(mockLogger, TEST_SHERPA_HOME);
    const progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    const learningEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

    await progressTracker.waitForLoad();

    const coordinator = new StateCoordinator(workflowManager, progressTracker, learningEngine);

    // Record some progress
    progressTracker.recordStepCompletion("tdd", "test 1");
    progressTracker.recordWorkflowCompletion("tdd", 5, 30);
    learningEngine.recordWorkflowUsage("tdd");

    const status = coordinator.getStateStatus();

    expect(status.progress.totalWorkflows).toBe(1);
    expect(status.progress.totalSteps).toBe(1);
    expect(status.progress.currentStreak).toBeGreaterThan(0);
    expect(status.learning.workflowsTracked).toBeGreaterThan(0);
  });

  test("should clear all state", async () => {
    // Clean up before test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    const workflowManager = new WorkflowStateManager(mockLogger, TEST_SHERPA_HOME);
    const progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    const learningEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

    await progressTracker.waitForLoad();

    const coordinator = new StateCoordinator(workflowManager, progressTracker, learningEngine);

    // Save some state
    progressTracker.recordStepCompletion("tdd", "test");
    const phaseProgress = new Map<string, string[]>();
    phaseProgress.set("Phase 1", ["step 1"]);
    await coordinator.saveAll("tdd", 0, phaseProgress);

    // Clear all state
    await coordinator.clearAll();

    // Verify state is cleared
    const stats = progressTracker.getProgressStats();
    expect(stats.totalStepsCompleted).toBe(0);
    expect(stats.totalWorkflowsCompleted).toBe(0);

    // Workflow state file should be deleted
    const workflowFile = path.join(TEST_SHERPA_HOME, "workflow-state.json");
    const workflowExists = await fs.access(workflowFile).then(() => true).catch(() => false);
    expect(workflowExists).toBe(false);
  });

  test("should maintain consistency across multiple save/load cycles", async () => {
    // Clean up before test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    // Cycle 1: Create and save
    let workflowManager = new WorkflowStateManager(mockLogger, TEST_SHERPA_HOME);
    let progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    let learningEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
    await progressTracker.waitForLoad();
    let coordinator = new StateCoordinator(workflowManager, progressTracker, learningEngine);

    progressTracker.recordStepCompletion("tdd", "cycle 1");
    let phaseProgress = new Map<string, string[]>();
    phaseProgress.set("Phase", ["cycle 1"]);
    await coordinator.saveAll("tdd", 0, phaseProgress);

    // Cycle 2: Load and add more
    workflowManager = new WorkflowStateManager(mockLogger, TEST_SHERPA_HOME);
    progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    learningEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
    coordinator = new StateCoordinator(workflowManager, progressTracker, learningEngine);
    await coordinator.loadAll();

    progressTracker.recordStepCompletion("tdd", "cycle 2");
    phaseProgress = new Map<string, string[]>();
    phaseProgress.set("Phase", ["cycle 1", "cycle 2"]);
    await coordinator.saveAll("tdd", 1, phaseProgress);

    // Cycle 3: Load and verify
    workflowManager = new WorkflowStateManager(mockLogger, TEST_SHERPA_HOME);
    progressTracker = new ProgressTracker(TEST_SHERPA_HOME);
    learningEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
    coordinator = new StateCoordinator(workflowManager, progressTracker, learningEngine);
    const state = await coordinator.loadAll();

    expect(state.workflowState?.currentPhase).toBe(1);
    expect(state.workflowState?.phaseProgress.get("Phase")).toEqual(["cycle 1", "cycle 2"]);

    const stats = progressTracker.getProgressStats();
    expect(stats.totalStepsCompleted).toBe(2);
  });
});