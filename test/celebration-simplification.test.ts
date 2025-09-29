#!/usr/bin/env bun
import { test, expect, describe } from "bun:test";
import { CelebrationGenerator, CelebrationContext } from "../src/behavioral-adoption/celebration-generator";
import { ProgressTracker } from "../src/behavioral-adoption/progress-tracker";
import * as os from "os";
import * as path from "path";

describe("Simplified CelebrationGenerator", () => {
  const testHome = path.join(os.tmpdir(), "celebration-test");

  test("should generate deterministic step completion messages", () => {
    const tracker = new ProgressTracker(testHome);
    const generator = new CelebrationGenerator(tracker);

    const context: CelebrationContext = {
      workflowType: "tdd",
      phaseName: "Test Phase",
      stepDescription: "wrote first test"
    };

    const message1 = generator.generateCelebration(context);
    const message2 = generator.generateCelebration(context);

    // Should be identical (no randomization)
    expect(message1).toBe(message2);

    // Should contain key components
    expect(message1).toContain("✓ Step complete");
    expect(message1).toContain("wrote first test");
    expect(message1).toContain("→ Continue with remaining steps");
  });

  test("should generate phase completion with transition cue", () => {
    const tracker = new ProgressTracker(testHome);
    const generator = new CelebrationGenerator(tracker);

    const context: CelebrationContext = {
      workflowType: "bug-hunt",
      phaseName: "🔍 Investigate",
      isPhaseComplete: true
    };

    const message = generator.generateCelebration(context);

    expect(message).toContain("✓ Phase complete");
    expect(message).toContain("🔍 Investigate");
    expect(message).toContain("You followed the systematic process");
    expect(message).toContain("→ Moving to next phase");
    expect(message).toContain("guide check");
  });

  test("should generate workflow completion with next action", () => {
    const tracker = new ProgressTracker(testHome);
    const generator = new CelebrationGenerator(tracker);

    const context: CelebrationContext = {
      workflowType: "tdd",
      phaseName: "Final Phase",
      isWorkflowComplete: true
    };

    const message = generator.generateCelebration(context);

    expect(message).toContain("✓ Workflow complete: tdd");
    expect(message).toContain("Systematic development produces code that works the first time");
    expect(message).toContain("→ Start new task");
    expect(message).toContain("guide next");
    expect(message).toContain("approach set");
  });

  test("should include milestone celebrations", () => {
    const tracker = new ProgressTracker(testHome);
    const generator = new CelebrationGenerator(tracker);

    const context: CelebrationContext = {
      workflowType: "general",
      phaseName: "Implementation",
      newMilestones: [
        {
          id: "first_workflow",
          name: "First Workflow Complete",
          description: "You've experienced systematic development",
          achieved: true,
          icon: "🎉"
        }
      ]
    };

    const message = generator.generateCelebration(context);

    expect(message).toContain("🎉 MILESTONE UNLOCKED");
    expect(message).toContain("First Workflow Complete");
    expect(message).toContain("You've experienced systematic development");
  });

  test("should provide concise phase entry markers", () => {
    const tracker = new ProgressTracker(testHome);
    const generator = new CelebrationGenerator(tracker);

    const message = generator.generatePhaseEntryCelebration("tdd", "🧪 Write Tests");

    expect(message).toContain("→ Starting");
    expect(message).toContain("🧪 Write Tests");
    expect(message).toContain("tdd workflow");
    expect(message.length).toBeLessThan(100); // Concise
  });

  test("should return empty strings for no-op methods", () => {
    const tracker = new ProgressTracker(testHome);
    const generator = new CelebrationGenerator(tracker);

    expect(generator.generateToolUsageEncouragement("guide")).toBe("");
    expect(generator.generateReminder("checkpoint")).toBe("");
  });

  test("should provide concise workflow selection motivation", () => {
    const tracker = new ProgressTracker(testHome);
    const generator = new CelebrationGenerator(tracker);

    const message = generator.generateWorkflowSelectionMotivation(["tdd", "bug-hunt"]);

    expect(message).toContain("Choose the workflow");
    expect(message).toContain("prevents specific failure modes");
    expect(message.length).toBeLessThan(150); // Concise
  });

  test("should provide evidence-based success stories", () => {
    const tracker = new ProgressTracker(testHome);
    const generator = new CelebrationGenerator(tracker);

    const stories = [
      generator.generateSuccessStory("tdd"),
      generator.generateSuccessStory("bug-hunt"),
      generator.generateSuccessStory("general"),
      generator.generateSuccessStory("rapid"),
      generator.generateSuccessStory("refactor"),
      generator.generateSuccessStory("planning")
    ];

    stories.forEach(story => {
      expect(story.length).toBeGreaterThan(0);
      expect(story.length).toBeLessThan(100); // Concise
      // Should contain evidence (numbers or specific outcomes)
      expect(/\d+%|\d+\.?\d*x/.test(story)).toBe(true);
    });
  });

  test("should include progress context in step completion", async () => {
    const tracker = new ProgressTracker(testHome);
    await tracker.waitForLoad();

    // Record some progress
    tracker.recordStepCompletion("tdd", "test 1");
    tracker.recordStepCompletion("tdd", "test 2");

    const generator = new CelebrationGenerator(tracker);

    const context: CelebrationContext = {
      workflowType: "tdd",
      phaseName: "Testing",
      stepDescription: "test 3"
    };

    const message = generator.generateCelebration(context);

    expect(message).toContain("Progress:");
    expect(message).toContain("steps");
    expect(message).toContain("workflows completed");
  });

  test("should not include randomization", () => {
    const tracker = new ProgressTracker(testHome);
    const generator = new CelebrationGenerator(tracker);

    const context: CelebrationContext = {
      workflowType: "general",
      phaseName: "Planning",
      stepDescription: "analyzed requirements"
    };

    // Generate message 10 times
    const messages = Array.from({ length: 10 }, () =>
      generator.generateCelebration(context)
    );

    // All messages should be identical
    const uniqueMessages = new Set(messages);
    expect(uniqueMessages.size).toBe(1);
  });
});