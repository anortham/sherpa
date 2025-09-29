#!/usr/bin/env bun
import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { ProgressTracker } from "../src/behavioral-adoption/progress-tracker";

const TEST_SHERPA_HOME = path.join(os.tmpdir(), "sherpa-persistence-test");
const TEST_PROGRESS_FILE = path.join(TEST_SHERPA_HOME, "progress-tracker.json");

describe("ProgressTracker State Persistence", () => {
  beforeAll(async () => {
    // Clean up test directory before all tests
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
  });

  afterAll(async () => {
    // Clean up test directory after all tests
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
  });

  test("should save progress after step completion", async () => {
    // Clean up before this test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    const tracker = new ProgressTracker(TEST_SHERPA_HOME);
    await tracker.waitForLoad();

    // Record a step
    tracker.recordStepCompletion("tdd", "wrote first test");

    // Wait for async save
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify file was created
    const fileExists = await fs.access(TEST_PROGRESS_FILE).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    // Verify content
    const content = await fs.readFile(TEST_PROGRESS_FILE, 'utf-8');
    const state = JSON.parse(content);
    expect(state.stats.totalStepsCompleted).toBe(1);
    expect(state.stats.workflowTypeUsage.tdd).toBe(1);
  });

  test("should restore progress after restart", async () => {
    // Clean up before this test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    // Create first tracker and record progress
    const tracker1 = new ProgressTracker(TEST_SHERPA_HOME);
    await tracker1.waitForLoad();

    tracker1.recordStepCompletion("tdd", "wrote test 1");
    tracker1.recordStepCompletion("tdd", "wrote test 2");
    tracker1.recordWorkflowCompletion("tdd", 5, 30);

    // Wait for async save
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create second tracker (simulates restart)
    const tracker2 = new ProgressTracker(TEST_SHERPA_HOME);
    await tracker2.waitForLoad();

    // Verify state was restored
    const stats = tracker2.getProgressStats();
    expect(stats.totalStepsCompleted).toBe(2);
    expect(stats.totalWorkflowsCompleted).toBe(1);
    expect(stats.workflowTypeUsage.tdd).toBe(3); // 2 steps + 1 completion
  });

  test("should persist milestone achievements", async () => {
    // Clean up before this test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    // Create tracker and complete a workflow to unlock milestone
    const tracker1 = new ProgressTracker(TEST_SHERPA_HOME);
    await tracker1.waitForLoad();

    const milestones = tracker1.recordWorkflowCompletion("tdd", 5, 30);

    // Wait for async save
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify milestone was achieved
    expect(milestones.length).toBeGreaterThan(0);
    expect(milestones[0].id).toBe("first_workflow_completion");

    // Create new tracker (simulates restart)
    const tracker2 = new ProgressTracker(TEST_SHERPA_HOME);
    await tracker2.waitForLoad();

    // Verify milestone persisted
    const achievedMilestones = tracker2.getAchievedMilestones();
    expect(achievedMilestones.length).toBeGreaterThan(0);
    expect(achievedMilestones[0].id).toBe("first_workflow_completion");
    expect(achievedMilestones[0].achieved).toBe(true);
  });

  test("should maintain streak across restarts", async () => {
    // Clean up before this test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    // Create tracker and build a streak
    const tracker1 = new ProgressTracker(TEST_SHERPA_HOME);
    await tracker1.waitForLoad();

    // Simulate activity on consecutive days by manipulating lastActivity
    tracker1.recordStepCompletion("tdd", "day 1 step 1");
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create new tracker
    const tracker2 = new ProgressTracker(TEST_SHERPA_HOME);
    await tracker2.waitForLoad();

    const stats = tracker2.getProgressStats();
    expect(stats.currentStreak).toBeGreaterThan(0);
  });

  test("should handle missing state file gracefully", async () => {
    // Clean up before this test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    // Create tracker - should not throw
    const tracker = new ProgressTracker(TEST_SHERPA_HOME);
    await tracker.waitForLoad();

    // Should have default stats
    const stats = tracker.getProgressStats();
    expect(stats.totalStepsCompleted).toBe(0);
    expect(stats.totalWorkflowsCompleted).toBe(0);
  });

  test("should handle corrupted state file gracefully", async () => {
    // Clean up before this test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    // Write corrupted JSON
    await fs.writeFile(TEST_PROGRESS_FILE, "{ invalid json content");

    // Create tracker - should not throw
    const tracker = new ProgressTracker(TEST_SHERPA_HOME);
    await tracker.waitForLoad();

    // Should have default stats
    const stats = tracker.getProgressStats();
    expect(stats.totalStepsCompleted).toBe(0);
  });

  test("should preserve new milestones when loading old state", async () => {
    // Clean up before this test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    // Simulate old state with fewer milestones
    const oldState = {
      stats: {
        totalWorkflowsCompleted: 5,
        totalStepsCompleted: 20,
        currentStreak: 3,
        lastActivity: new Date(),
        workflowTypeUsage: { tdd: 5 },
        averageStepsPerWorkflow: 4,
        timeSpentInWorkflows: 150
      },
      milestones: [
        {
          id: "first_workflow_completion",
          name: "First Workflow Mastery",
          description: "Complete your first full workflow",
          achieved: true,
          achievedAt: new Date(),
          icon: "🎉"
        }
      ],
      savedAt: new Date()
    };

    await fs.writeFile(TEST_PROGRESS_FILE, JSON.stringify(oldState, null, 2));

    // Create new tracker - should merge old state with new milestone definitions
    const tracker = new ProgressTracker(TEST_SHERPA_HOME);
    await tracker.waitForLoad();

    // Should have restored achieved milestone
    const achievedMilestones = tracker.getAchievedMilestones();
    expect(achievedMilestones.length).toBeGreaterThan(0);

    // Should also have new milestones that weren't in old state
    const nextMilestone = tracker.getNextMilestone();
    expect(nextMilestone).not.toBeNull();
  });

  test("should save state when resetting", async () => {
    // Clean up before this test
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });

    // Create tracker with some progress
    const tracker = new ProgressTracker(TEST_SHERPA_HOME);
    await tracker.waitForLoad();

    tracker.recordStepCompletion("tdd", "test");
    await new Promise(resolve => setTimeout(resolve, 100));

    // Reset stats
    tracker.resetStats();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify reset was saved
    const content = await fs.readFile(TEST_PROGRESS_FILE, 'utf-8');
    const state = JSON.parse(content);
    expect(state.stats.totalStepsCompleted).toBe(0);
    expect(state.milestones.every((m: any) => !m.achieved)).toBe(true);
  });
});