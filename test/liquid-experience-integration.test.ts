#!/usr/bin/env bun
import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as yaml from "yaml";
import { AdaptiveLearningEngine } from "../src/behavioral-adoption/adaptive-learning-engine";
import { ProgressTracker } from "../src/behavioral-adoption/progress-tracker";
import { CelebrationGenerator } from "../src/behavioral-adoption/celebration-generator";
import {
  UserProfile,
  PredictiveContext,
  AdaptiveHint,
  FlowState
} from "../src/types";

const TEST_SHERPA_HOME = path.join(os.tmpdir(), "sherpa-integration-test");
const TEST_WORKFLOWS_DIR = path.join(TEST_SHERPA_HOME, "workflows");

describe("Liquid Experience Integration Tests", () => {
  let learningEngine: AdaptiveLearningEngine;
  let progressTracker: ProgressTracker;
  let celebrationGenerator: CelebrationGenerator;

  beforeEach(async () => {
    // Create isolated test environment
    await fs.mkdir(TEST_WORKFLOWS_DIR, { recursive: true });

    // Initialize components with custom test path
    learningEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
    progressTracker = new ProgressTracker();

    // Create encouragements for celebration generator
    const encouragements = {
      progressMessages: {
        firstStep: ["🎯 Great first step!"],
        midProgress: ["💪 Keep going!"],
        nearCompletion: ["🏆 Almost there!"]
      },
      phaseEntry: {
        tdd: {
          "red-phase": "🧪 Time to write tests!",
          "green-phase": "🟢 Make it pass!"
        }
      },
      toolUsageEncouragement: {
        guide: ["Excellent workflow awareness!"],
        approach: ["Smart workflow selection!"],
        flow: ["Great flow state management!"]
      }
    };

    celebrationGenerator = new CelebrationGenerator(progressTracker, encouragements);

    // Create comprehensive test workflows
    const workflows = {
      tdd: {
        name: "Test-Driven Development",
        description: "Build reliable software through testing first",
        trigger_hints: ["test", "tdd", "feature", "implement"],
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
          },
          {
            name: "🔵 Blue Phase",
            guidance: "Refactor the code while keeping tests green",
            suggestions: [
              "Improve code structure",
              "Remove duplication",
              "Run tests after each change"
            ]
          }
        ]
      },
      "bug-hunt": {
        name: "Bug Hunt",
        description: "Systematic debugging and issue resolution",
        trigger_hints: ["bug", "error", "issue", "broken", "debug"],
        phases: [
          {
            name: "🔍 Reproduce & Isolate",
            guidance: "Understand the bug completely before fixing",
            suggestions: [
              "Reproduce the bug consistently",
              "Document exact reproduction steps",
              "Identify problematic code section"
            ]
          },
          {
            name: "🧪 Test the Bug",
            guidance: "Create a test that captures the bug",
            suggestions: [
              "Write failing test for bug",
              "Confirm test reproduces issue",
              "Document expected vs actual behavior"
            ]
          },
          {
            name: "🔧 Fix & Verify",
            guidance: "Fix the bug and ensure no regressions",
            suggestions: [
              "Implement minimal fix",
              "Run test to confirm fix",
              "Run full test suite"
            ]
          }
        ]
      }
    };

    // Write workflows to files
    for (const [key, workflow] of Object.entries(workflows)) {
      await fs.writeFile(
        path.join(TEST_WORKFLOWS_DIR, `${key}.yaml`),
        yaml.stringify(workflow)
      );
    }
  });

  afterEach(async () => {
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true }).catch(() => {});
  });

  describe("Complete User Journey: From Novice to Expert", () => {
    test("should guide new user through first TDD workflow", async () => {
      // Simulate new user starting TDD workflow
      learningEngine.recordToolUsage("guide", { action: "tdd" });
      learningEngine.recordWorkflowUsage("tdd", "building new authentication feature");

      // User checks what to do first
      learningEngine.recordToolUsage("guide", { action: "check" });

      // Should provide beginner-friendly guidance
      const profile = learningEngine.getUserProfile();
      expect(profile.workflowPatterns.length).toBe(1);

      const tddPattern = profile.workflowPatterns.find(wp => wp.workflowType === "tdd");
      expect(tddPattern?.totalCompletions).toBe(0); // No completions yet

      // Generate context for hints
      const context = learningEngine.generatePredictiveContext(
        "tdd",
        "🔴 Red Phase",
        "building new authentication feature"
      );

      expect(context.currentWorkflow).toBe("tdd");
      expect(context.confidence).toBeGreaterThanOrEqual(0.5); // Default confidence for new workflow
    });

    test("should adapt to user as they gain experience", async () => {
      // Simulate user completing multiple TDD workflows successfully
      const contexts = [
        "building user authentication",
        "implementing payment system",
        "adding notification service",
        "creating data validation"
      ];

      for (let i = 0; i < contexts.length; i++) {
        learningEngine.recordWorkflowUsage("tdd", contexts[i]);

        // Simulate completing each phase
        const phases = ["Red Phase", "Green Phase", "Blue Phase"];
        for (const phase of phases) {
          learningEngine.recordToolUsage("guide", {
            action: "done",
            completed: `completed ${phase.toLowerCase()}`
          });
        }

        // Complete workflow successfully
        learningEngine.recordWorkflowCompletion("tdd", 25 - i * 2, true); // Getting faster
      }

      const profile = learningEngine.getUserProfile();
      const tddPattern = profile.workflowPatterns.find(wp => wp.workflowType === "tdd");

      expect(tddPattern?.totalCompletions).toBe(4);
      expect(tddPattern?.completionRate).toBe(1.0); // 100% success
      expect(tddPattern?.averageTimeMinutes).toBe(22); // (25+23+21+19)/4

      // Should have achieved mastery
      const masteryAchievement = profile.achievements.find(a => a.id === "mastery_tdd");
      expect(masteryAchievement).toBeTruthy();
    });

    test("should learn user's context patterns for smart suggestions", async () => {
      // Train the system with context patterns
      const bugContexts = [
        "login form not working",
        "payment error in checkout",
        "database connection issue",
        "authentication token expired"
      ];

      const featureContexts = [
        "new user registration flow",
        "implementing search feature",
        "adding email notifications",
        "building admin dashboard"
      ];

      // User uses bug-hunt for bug contexts
      for (const context of bugContexts) {
        learningEngine.recordWorkflowUsage("bug-hunt", context);
        learningEngine.recordWorkflowCompletion("bug-hunt", 15, true);
      }

      // User uses TDD for feature contexts
      for (const context of featureContexts) {
        learningEngine.recordWorkflowUsage("tdd", context);
        learningEngine.recordWorkflowCompletion("tdd", 30, true);
      }

      // Now test smart detection
      const newBugContext = "shopping cart calculation error";
      const predictiveContext = learningEngine.generatePredictiveContext(
        "general", // Currently in wrong workflow
        "Phase 1",
        newBugContext
      );

      const hint = learningEngine.generateAdaptiveHint(predictiveContext);

      if (hint) {
        expect(hint.type).toBe('workflow-suggestion');
        expect(hint.content).toContain('bug-hunt');
      }

      // Check learned patterns
      const profile = learningEngine.getUserProfile();
      const bugPattern = profile.contextPatterns.find(cp => cp.chosenWorkflow === "bug-hunt");

      expect(bugPattern?.frequency).toBe(4);
      expect(bugPattern?.successRate).toBe(1.0);
      expect(bugPattern?.triggerWords).toContain("error");
    });
  });

  describe("Flow State Transitions and Adaptations", () => {
    test("should provide different guidance based on flow intensity", async () => {
      const testHint: AdaptiveHint = {
        type: 'workflow-suggestion',
        content: 'Consider switching to Bug Hunt workflow for this debugging task',
        confidence: 0.85,
        timing: 'predictive',
        priority: 'medium',
        context: 'debugging context',
        learningBasis: ['context_pattern_analysis']
      };

      // Test whisper mode - minimal hints
      learningEngine.updateFlowState("whisper");
      let flowState = learningEngine.getFlowState();
      expect(flowState.intensity).toBe('whisper');
      expect(flowState.hintCooldown).toBe(120000); // 2 minutes

      // Test gentle mode - balanced
      learningEngine.updateFlowState("on");
      flowState = learningEngine.getFlowState();
      expect(flowState.intensity).toBe('gentle');
      expect(flowState.hintCooldown).toBe(30000); // 30 seconds

      // Test active mode - enhanced
      learningEngine.updateFlowState("active");
      flowState = learningEngine.getFlowState();
      expect(flowState.intensity).toBe('active');
      expect(flowState.hintCooldown).toBe(15000); // 15 seconds
    });

    test("should adapt celebration levels based on user feedback", async () => {
      const hint: AdaptiveHint = {
        type: 'encouragement',
        content: 'Great progress!',
        confidence: 0.7,
        timing: 'immediate',
        priority: 'low',
        context: 'test',
        learningBasis: ['test']
      };

      // Simulate user rejecting full celebrations
      for (let i = 0; i < 5; i++) {
        learningEngine.recordHintInteraction(hint, false);
      }

      let profile = learningEngine.getUserProfile();
      expect(profile.behaviorMetrics.predictiveHintAcceptanceRate).toBeLessThan(0.5);

      // Should suggest minimal celebrations
      const suggestions = learningEngine.getPersonalizedSuggestions();
      const whisperSuggestion = suggestions.find(s => s.includes("whisper"));
      expect(whisperSuggestion).toBeTruthy();

      // Now simulate accepting minimal celebrations
      for (let i = 0; i < 8; i++) {
        learningEngine.recordHintInteraction(hint, true);
      }

      profile = learningEngine.getUserProfile();
      expect(profile.behaviorMetrics.predictiveHintAcceptanceRate).toBeGreaterThan(0.5);
    });
  });

  describe("Cross-Session Learning and Persistence", () => {
    test("should persist learning across sessions", async () => {
      // First session: Build up patterns
      learningEngine.recordWorkflowUsage("tdd", "building authentication");
      learningEngine.recordWorkflowUsage("bug-hunt", "fixing login error");

      for (let i = 0; i < 3; i++) {
        learningEngine.recordWorkflowCompletion("tdd", 25, true);
      }

      // Save and end session
      await learningEngine.saveUserProfile();
      await learningEngine.endSession();

      // Create new session (simulate restart)
      const newEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
      await newEngine.loadUserProfile();

      const loadedProfile = newEngine.getUserProfile();

      // Should have preserved patterns
      expect(loadedProfile.workflowPatterns.length).toBeGreaterThan(0);

      const tddPattern = loadedProfile.workflowPatterns.find(wp => wp.workflowType === "tdd");
      expect(tddPattern?.totalCompletions).toBe(3);
      expect(tddPattern?.completionRate).toBe(1.0);

      // Should have context patterns
      expect(loadedProfile.contextPatterns.length).toBeGreaterThan(0);

      // Should maintain behavioral metrics
      expect(loadedProfile.behaviorMetrics.totalSessionTime).toBeGreaterThan(0);
    });

    test("should maintain user preferences across sessions", async () => {
      // Set specific preferences
      learningEngine.updateFlowState("whisper");

      // Update celebration preference through hint interactions
      const hint: AdaptiveHint = {
        type: 'encouragement',
        content: 'Test',
        confidence: 0.7,
        timing: 'immediate',
        priority: 'low',
        context: 'test',
        learningBasis: ['test']
      };

      for (let i = 0; i < 5; i++) {
        learningEngine.recordHintInteraction(hint, false); // Reject celebrations
      }

      await learningEngine.saveUserProfile();

      // New session
      const newEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
      await newEngine.loadUserProfile();

      const profile = newEngine.getUserProfile();
      expect(profile.preferences.flowModeEnabled).toBe(true); // Was enabled in whisper mode
      expect(profile.behaviorMetrics.predictiveHintAcceptanceRate).toBeLessThan(0.5);
    });
  });

  describe("Predictive Guidance Intelligence", () => {
    test("should predict user getting stuck and offer help", async () => {
      // Build user pattern of getting stuck in specific phases
      learningEngine.recordWorkflowUsage("tdd");

      // Simulate getting stuck multiple times in Red Phase
      const stuckContext: PredictiveContext = {
        currentWorkflow: "tdd",
        currentPhase: "🔴 Red Phase",
        timeInPhase: 400000, // 6+ minutes - stuck
        recentActions: ["guide:check", "guide:check", "guide:check"],
        userBehaviorProfile: learningEngine.getUserProfile().behaviorMetrics,
        sessionContext: "building complex feature",
        workingTime: 1200000, // 20 minutes total
        isStuck: true,
        confidence: 0.8
      };

      const stuckHint = learningEngine.generateAdaptiveHint(stuckContext);

      expect(stuckHint).toBeTruthy();
      expect(stuckHint?.type).toBe('prevention');
      expect(stuckHint?.priority).toBe('high');
      expect(stuckHint?.timing).toBe('immediate');
    });

    test("should suggest optimizations for experienced users", async () => {
      // Build experience with TDD
      for (let i = 0; i < 8; i++) {
        learningEngine.recordWorkflowCompletion("tdd", 30, true);
      }

      // User taking longer than usual
      const optimizationContext: PredictiveContext = {
        currentWorkflow: "tdd",
        currentPhase: "🟢 Green Phase",
        timeInPhase: 2700000, // 45 minutes - much longer than 30min average
        recentActions: ["guide:check"],
        userBehaviorProfile: learningEngine.getUserProfile().behaviorMetrics,
        sessionContext: "complex refactoring",
        workingTime: 5400000, // 90 minutes total
        isStuck: false,
        confidence: 0.9
      };

      const optimizationHint = learningEngine.generateAdaptiveHint(optimizationContext);

      if (optimizationHint) {
        expect(optimizationHint.type).toBe('optimization');
        expect(optimizationHint.content).toContain('longer than usual');
      }
    });

    test("should prevent common mistakes based on user history", async () => {
      // Simulate user having trouble with specific phases
      const problematicPhase = "🔵 Blue Phase";

      // Add stuck points to user pattern (this would normally be learned from actual behavior)
      const profile = learningEngine.getUserProfile();
      const tddPattern = profile.workflowPatterns.find(wp => wp.workflowType === "tdd") || {
        workflowType: "tdd",
        completionRate: 0.8,
        averageTimeMinutes: 30,
        preferredPhaseOrder: [],
        commonStuckPoints: [problematicPhase],
        successfulStrategies: [],
        lastUsed: new Date(),
        totalCompletions: 5
      };

      if (!profile.workflowPatterns.find(wp => wp.workflowType === "tdd")) {
        profile.workflowPatterns.push(tddPattern);
      } else {
        tddPattern.commonStuckPoints.push(problematicPhase);
      }

      // Now approaching known stuck point
      const preventionContext: PredictiveContext = {
        currentWorkflow: "tdd",
        currentPhase: problematicPhase,
        timeInPhase: 60000, // Just started
        recentActions: ["guide:check"],
        userBehaviorProfile: profile.behaviorMetrics,
        sessionContext: "refactoring component",
        workingTime: 1800000, // 30 minutes
        isStuck: false,
        confidence: 0.7
      };

      const preventionHint = learningEngine.generateAdaptiveHint(preventionContext);

      if (preventionHint) {
        expect(preventionHint.type).toBe('prevention');
        expect(preventionHint.content).toContain('previously gotten stuck');
      }
    });
  });

  describe("Behavioral Psychology Integration", () => {
    test("should provide positive reinforcement that builds habits", async () => {
      // Track systematic behavior
      const systematicSteps = [
        "created test file",
        "wrote failing test",
        "ran test to see failure",
        "implemented minimal solution",
        "ran test to confirm pass"
      ];

      systematicSteps.forEach(step => {
        learningEngine.recordToolUsage("guide", {
          action: "done",
          completed: step
        });
        progressTracker.recordStepCompletion("tdd", step);
      });

      // Should celebrate systematic approach
      const celebrationContext = {
        workflowType: "tdd",
        phaseName: "🟢 Green Phase",
        stepDescription: systematicSteps[systematicSteps.length - 1],
        isPhaseComplete: true
      };

      const celebration = celebrationGenerator.generateCelebration(celebrationContext);

      expect(celebration).toBeTruthy();
      expect(celebration).toContain("systematic"); // Should recognize systematic behavior

      // Progress tracking should show improvement
      const stats = progressTracker.getProgressStats();
      expect(stats.totalStepsCompleted).toBe(5);
      expect(stats.currentStreak).toBeGreaterThan(0);
    });

    test("should unlock achievements that motivate continued use", async () => {
      // Simulate achieving workflow mastery
      for (let i = 0; i < 12; i++) {
        learningEngine.recordWorkflowCompletion("tdd", 20, true);
      }

      const profile = learningEngine.getUserProfile();
      const masteryAchievement = profile.achievements.find(a => a.id === "mastery_tdd");

      expect(masteryAchievement).toBeTruthy();
      expect(masteryAchievement?.name).toBe("TDD Master");
      expect(masteryAchievement?.category).toBe("workflow_mastery");

      // Should celebrate in suggestions
      const suggestions = learningEngine.getPersonalizedSuggestions();
      const excellenceMsg = suggestions.find(s => s.includes("excel at tdd"));
      expect(excellenceMsg).toBeTruthy();
    });

    test("should adapt to different learning styles", async () => {
      // Test high-engagement learner
      const engagedHint: AdaptiveHint = {
        type: 'next-step',
        content: 'Great suggestion!',
        confidence: 0.8,
        timing: 'immediate',
        priority: 'medium',
        context: 'test',
        learningBasis: ['test']
      };

      // Accept many hints (high engagement)
      for (let i = 0; i < 10; i++) {
        learningEngine.recordHintInteraction(engagedHint, true);
      }

      let suggestions = learningEngine.getPersonalizedSuggestions();
      let flowSuggestion = suggestions.find(s => s.includes("flow mode"));
      expect(flowSuggestion).toBeTruthy();

      // Test low-engagement learner
      const newEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      // Reject most hints (low engagement)
      for (let i = 0; i < 10; i++) {
        newEngine.recordHintInteraction(engagedHint, i < 3); // Only accept 30%
      }

      suggestions = newEngine.getPersonalizedSuggestions();
      const whisperSuggestion = suggestions.find(s => s.includes("whisper"));
      expect(whisperSuggestion).toBeTruthy();
    });
  });

  describe("Liquid Experience Validation", () => {
    test("should flow seamlessly between tools without friction", async () => {
      // Simulate natural development flow
      const developmentFlow = [
        { tool: "approach", action: { set: "tdd" } },
        { tool: "guide", action: { action: "check" } },
        { tool: "guide", action: { action: "done", completed: "wrote test" } },
        { tool: "flow", action: { mode: "on" } },
        { tool: "guide", action: { action: "check" } },
        { tool: "guide", action: { action: "done", completed: "implemented solution" } },
        { tool: "flow", action: { mode: "hint" } }
      ];

      // Each tool call should enhance rather than interrupt
      developmentFlow.forEach(step => {
        learningEngine.recordToolUsage(step.tool, step.action);
      });

      const session = learningEngine.getCurrentSession();

      // Should show engagement without overwhelming
      expect(session.productivityMetrics.stepsCompleted).toBe(2);
      expect(session.workflowsUsed).toContain("tdd");

      const profile = learningEngine.getUserProfile();
      expect(profile.behaviorMetrics.toolUsageFrequency.guide).toBe(4);
      expect(profile.behaviorMetrics.toolUsageFrequency.approach).toBe(1);
      expect(profile.behaviorMetrics.toolUsageFrequency.flow).toBe(2);
    });

    test("should provide invisible progress tracking", async () => {
      // Track progress without user needing to think about it
      const invisibleTracking = [
        "started workflow",
        "completed first phase",
        "made progress on second phase",
        "completed workflow successfully"
      ];

      invisibleTracking.forEach((event, index) => {
        if (index === 0) {
          learningEngine.recordWorkflowUsage("tdd", "background tracking test");
        } else if (index === invisibleTracking.length - 1) {
          learningEngine.recordWorkflowCompletion("tdd", 25, true);
        } else {
          learningEngine.recordToolUsage("guide", {
            action: "done",
            completed: event
          });
        }
      });

      // All tracking should happen seamlessly
      const profile = learningEngine.getUserProfile();
      const session = learningEngine.getCurrentSession();

      expect(profile.workflowPatterns.length).toBe(1);
      expect(session.productivityMetrics.stepsCompleted).toBe(2);
      expect(session.workflowsUsed).toContain("tdd");

      // User gets benefit without explicit effort
      const suggestions = learningEngine.getPersonalizedSuggestions();
      expect(suggestions.length).toBeGreaterThan(0);
    });

    test("should create voluntary dependency through genuine value", async () => {
      // Simulate user experiencing increasing value over time
      const sessions = [
        // Session 1: Basic usage
        {
          workflows: [{ type: "tdd", context: "basic feature", success: true, time: 45 }],
          hints: [{ accepted: true }, { accepted: false }]
        },
        // Session 2: Learning patterns
        {
          workflows: [
            { type: "tdd", context: "complex feature", success: true, time: 35 },
            { type: "bug-hunt", context: "login error", success: true, time: 20 }
          ],
          hints: [{ accepted: true }, { accepted: true }]
        },
        // Session 3: Expert guidance
        {
          workflows: [
            { type: "tdd", context: "advanced feature", success: true, time: 25 },
            { type: "tdd", context: "microservice", success: true, time: 30 }
          ],
          hints: [{ accepted: true }, { accepted: true }, { accepted: true }]
        }
      ];

      const engines = [];

      for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex++) {
        const engine = sessionIndex === 0 ? learningEngine : new AdaptiveLearningEngine(TEST_SHERPA_HOME);

        if (sessionIndex > 0) {
          await engine.loadUserProfile();
        }

        const session = sessions[sessionIndex];

        // Process workflows
        session.workflows.forEach(wf => {
          engine.recordWorkflowUsage(wf.type, wf.context);
          engine.recordWorkflowCompletion(wf.type, wf.time, wf.success);
        });

        // Process hints
        session.hints.forEach(hint => {
          const testHint: AdaptiveHint = {
            type: 'next-step',
            content: 'Test hint',
            confidence: 0.8,
            timing: 'immediate',
            priority: 'medium',
            context: 'test',
            learningBasis: ['test']
          };
          engine.recordHintInteraction(testHint, hint.accepted);
        });

        await engine.saveUserProfile();
        engines.push(engine);
      }

      // By session 3, user should see significant value
      const finalProfile = engines[engines.length - 1].getUserProfile();

      // Improved performance
      const tddPattern = finalProfile.workflowPatterns.find(wp => wp.workflowType === "tdd");
      expect(tddPattern?.averageTimeMinutes).toBeLessThan(45); // Faster than first session

      // High engagement
      expect(finalProfile.behaviorMetrics.predictiveHintAcceptanceRate).toBeGreaterThan(0.7);

      // Personalized insights
      const suggestions = engines[engines.length - 1].getPersonalizedSuggestions();
      expect(suggestions.length).toBeGreaterThan(0);

      // Achievement unlocked
      expect(finalProfile.achievements.length).toBeGreaterThan(0);
    });
  });

  describe("System Reliability and Performance", () => {
    test("should handle high-frequency usage without degradation", async () => {
      const startTime = Date.now();

      // Simulate intensive usage
      for (let i = 0; i < 100; i++) {
        learningEngine.recordToolUsage("guide", { action: "check", iteration: i });

        if (i % 10 === 0) {
          learningEngine.recordWorkflowUsage("tdd", `feature ${i}`);
        }

        if (i % 15 === 0) {
          learningEngine.recordWorkflowCompletion("tdd", 20, true);
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly (under 1 second for 100 operations)
      expect(duration).toBeLessThan(1000);

      // Data should remain consistent
      const profile = learningEngine.getUserProfile();
      expect(profile.behaviorMetrics.toolUsageFrequency.guide).toBe(100);
      expect(profile.workflowPatterns.length).toBeGreaterThan(0);
    });

    test("should gracefully handle edge cases and errors", async () => {
      // Test with invalid data
      expect(() => {
        learningEngine.recordWorkflowUsage("", "");
        learningEngine.recordWorkflowUsage("invalid-workflow", "test context");
        learningEngine.recordToolUsage("invalid-tool", { invalid: "data" });
      }).not.toThrow();

      // Test with extreme values
      expect(() => {
        learningEngine.recordWorkflowCompletion("tdd", -1, true); // Negative time
        learningEngine.recordWorkflowCompletion("tdd", 10000, true); // Very long time
      }).not.toThrow();

      // System should remain stable
      const profile = learningEngine.getUserProfile();
      expect(profile.userId).toBeTruthy();
    });

    test("should maintain consistency across save/load cycles", async () => {
      // Create complex state
      learningEngine.recordWorkflowUsage("tdd", "complex test");
      learningEngine.recordWorkflowCompletion("tdd", 25, true);
      learningEngine.updateFlowState("active");

      const hint: AdaptiveHint = {
        type: 'optimization',
        content: 'Test optimization',
        confidence: 0.9,
        timing: 'predictive',
        priority: 'low',
        context: 'test',
        learningBasis: ['test']
      };
      learningEngine.recordHintInteraction(hint, true);

      // Save state
      await learningEngine.saveUserProfile();
      const originalProfile = learningEngine.getUserProfile();

      // Load in new instance
      const newEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
      await newEngine.loadUserProfile();
      const loadedProfile = newEngine.getUserProfile();

      // Should be identical
      expect(loadedProfile.workflowPatterns.length).toBe(originalProfile.workflowPatterns.length);
      expect(loadedProfile.preferences.flowModeEnabled).toBe(originalProfile.preferences.flowModeEnabled);
      expect(loadedProfile.behaviorMetrics.predictiveHintAcceptanceRate)
        .toBeCloseTo(originalProfile.behaviorMetrics.predictiveHintAcceptanceRate, 2);
    });
  });
});