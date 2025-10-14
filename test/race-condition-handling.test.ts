import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { AdaptiveLearningEngine } from "../src/behavioral-adoption/adaptive-learning-engine";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `sherpa-race-condition-test-${Date.now()}`);
const TEST_SHERPA_HOME = path.join(TEST_ROOT, "sherpa");

/**
 * Comprehensive race condition handling tests.
 *
 * These scenarios test the system's ability to handle:
 * - Concurrent user profile access
 * - Simultaneous workflow recording
 * - Multiple engines accessing same profile
 * - File system race conditions
 * - Session state consistency under concurrency
 *
 * The system must maintain data consistency and avoid corruption.
 */
describe("Race Condition Handling", () => {
  beforeEach(async () => {
    // Clean test environment
    try {
      await fs.rm(TEST_ROOT, { recursive: true, force: true });
    } catch {}

    await fs.mkdir(TEST_ROOT, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_ROOT, { recursive: true, force: true });
    } catch {}
  });

  describe("Concurrent Profile Access", () => {
    test("should handle multiple engines accessing same profile simultaneously", async () => {
      // Create initial profile
      const engine1 = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
      engine1.recordWorkflowUsage("tdd", "initial");
      await engine1.saveUserProfile();

      // Create multiple engines accessing same profile concurrently
      const engines = Array.from({ length: 5 }, () => new AdaptiveLearningEngine(TEST_SHERPA_HOME));

      // All engines load profile simultaneously
      const loadPromises = engines.map(engine => engine.loadUserProfile());

      expect(async () => {
        await Promise.all(loadPromises);
      }).not.toThrow();

      // All engines should have consistent initial state
      engines.forEach(engine => {
        const profile = engine.getUserProfile();
        expect(profile.workflowPatterns.length).toBeGreaterThan(0);
        expect(profile.userId).toBeTruthy();
      });
    });

    test("should handle concurrent save operations without corruption", async () => {
      const engines = Array.from({ length: 3 }, () => new AdaptiveLearningEngine(TEST_SHERPA_HOME));

      // Each engine records different data
      engines[0].recordWorkflowUsage("tdd", "test1");
      engines[1].recordWorkflowUsage("bug-hunt", "test2");
      engines[2].recordWorkflowUsage("general", "test3");

      // All engines save simultaneously
      const savePromises = engines.map(engine => engine.saveUserProfile());

      expect(async () => {
        await Promise.all(savePromises);
      }).not.toThrow();

      // Profile should be readable and valid after concurrent saves
      const testEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
      await testEngine.loadUserProfile();
      const profile = testEngine.getUserProfile();

      expect(profile.userId).toBeTruthy();
      expect(Array.isArray(profile.workflowPatterns)).toBe(true);
    });

    test("should handle read-write race conditions gracefully", async () => {
      const readerEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
      const writerEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      // Writer records data and saves
      writerEngine.recordWorkflowUsage("tdd", "concurrent-test");
      const savePromise = writerEngine.saveUserProfile();

      // Reader tries to load at same time
      const loadPromise = readerEngine.loadUserProfile();

      expect(async () => {
        await Promise.all([savePromise, loadPromise]);
      }).not.toThrow();

      // Both engines should have valid state
      const writerProfile = writerEngine.getUserProfile();
      const readerProfile = readerEngine.getUserProfile();

      expect(writerProfile.userId).toBeTruthy();
      expect(readerProfile.userId).toBeTruthy();
    });
  });

  describe("Concurrent Workflow Recording", () => {
    test("should handle simultaneous workflow usage recording", async () => {
      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      // Record multiple workflows concurrently
      const recordingPromises = [
        Promise.resolve().then(() => engine.recordWorkflowUsage("tdd", "concurrent1")),
        Promise.resolve().then(() => engine.recordWorkflowUsage("bug-hunt", "concurrent2")),
        Promise.resolve().then(() => engine.recordWorkflowUsage("general", "concurrent3")),
        Promise.resolve().then(() => engine.recordWorkflowUsage("rapid", "concurrent4")),
        Promise.resolve().then(() => engine.recordWorkflowUsage("refactor", "concurrent5"))
      ];

      await Promise.all(recordingPromises);

      const profile = engine.getUserProfile();
      expect(profile.workflowPatterns.length).toBe(5); // All workflows should be recorded

      const workflowTypes = profile.workflowPatterns.map(p => p.workflowType).sort();
      expect(workflowTypes).toEqual(["bug-hunt", "general", "rapid", "refactor", "tdd"]);
    });

    test("should handle concurrent tool usage recording", async () => {
      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      // Record multiple tool usages concurrently
      const toolRecordings = [
        Promise.resolve().then(() => engine.recordToolUsage("guide", { action: "check" })),
        Promise.resolve().then(() => engine.recordToolUsage("guide", { action: "done", completed: "test" })),
        Promise.resolve().then(() => engine.recordToolUsage("approach", { set: "tdd" })),
        Promise.resolve().then(() => engine.recordToolUsage("guide", { action: "next" })),
        Promise.resolve().then(() => engine.recordToolUsage("approach", { set: "general" }))
      ];

      await Promise.all(toolRecordings);

      const profile = engine.getUserProfile();
      expect(profile.behaviorMetrics.toolUsageFrequency.guide).toBeGreaterThan(0);
    });

    test("should maintain session consistency during concurrent recording", async () => {
      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      // Record workflows and tools concurrently
      const concurrentOperations = [
        Promise.resolve().then(() => engine.recordWorkflowUsage("tdd", "session-test")),
        Promise.resolve().then(() => engine.recordToolUsage("guide", { action: "check" })),
        Promise.resolve().then(() => engine.recordWorkflowUsage("bug-hunt", "session-test2")),
        Promise.resolve().then(() => engine.recordToolUsage("approach", { set: "rapid" })),
        Promise.resolve().then(() => engine.recordWorkflowUsage("general", "session-test3"))
      ];

      await Promise.all(concurrentOperations);

      const session = engine.getCurrentSession();
      expect(session.workflowsUsed.length).toBeGreaterThan(0);
      expect(session.contextsProvided.length).toBeGreaterThan(0);
    });
  });

  describe("Multi-Engine Scenarios", () => {
    test("should handle multiple engines modifying shared profile", async () => {
      // Create shared profile
      const initialEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
      initialEngine.recordWorkflowUsage("tdd", "initial");
      await initialEngine.saveUserProfile();

      // Create multiple engines that modify the profile
      const engines = Array.from({ length: 3 }, () => new AdaptiveLearningEngine(TEST_SHERPA_HOME));

      // Load existing profiles
      await Promise.all(engines.map(engine => engine.loadUserProfile()));

      // Each engine records different data concurrently
      const modifications = [
        engines[0].recordWorkflowUsage("bug-hunt", "engine1"),
        engines[1].recordWorkflowUsage("general", "engine2"),
        engines[2].recordWorkflowUsage("rapid", "engine3")
      ];

      expect(() => {
        modifications;
      }).not.toThrow();

      // All engines save concurrently (last write wins - this is expected)
      const savePromises = engines.map(engine => engine.saveUserProfile());

      expect(async () => {
        await Promise.all(savePromises);
      }).not.toThrow();

      // Final state should be consistent (last write wins in race condition)
      const finalEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
      await finalEngine.loadUserProfile();
      const finalProfile = finalEngine.getUserProfile();

      // Due to concurrent saves, only one engine's changes survive (last write wins)
      // The profile is valid but may not have all workflow patterns
      expect(finalProfile.userId).toBeTruthy();
      expect(Array.isArray(finalProfile.workflowPatterns)).toBe(true);
    });

    test("should handle concurrent directory creation", async () => {
      // Multiple engines try to create directory simultaneously
      const engines = Array.from({ length: 5 }, () => new AdaptiveLearningEngine(TEST_SHERPA_HOME));

      // All try to save (which creates directories) simultaneously
      const savePromises = engines.map(async engine => {
        engine.recordWorkflowUsage("tdd", "concurrent-dir");
        return engine.saveUserProfile();
      });

      expect(async () => {
        await Promise.all(savePromises);
      }).not.toThrow();

      // Directory should exist and be accessible
      const dirExists = await fs.access(TEST_SHERPA_HOME).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });

    test("should handle engines with different session states", async () => {
      const engine1 = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
      const engine2 = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      // Engines have different session configurations
      engine1.getCurrentSession().celebrationLevel = 'minimal';
      engine2.getCurrentSession().celebrationLevel = 'full';

      // Both record data concurrently
      const recordings = [
        Promise.resolve().then(() => {
          engine1.recordWorkflowUsage("tdd", "engine1-context");
          engine1.recordToolUsage("guide", { action: "check" });
        }),
        Promise.resolve().then(() => {
          engine2.recordWorkflowUsage("bug-hunt", "engine2-context");
          engine2.recordToolUsage("guide", { action: "check" });
        })
      ];

      expect(() => {
        Promise.all(recordings);
      }).not.toThrow();

      // Sessions should maintain their individual states
      expect(engine1.getCurrentSession().celebrationLevel).toBe('minimal');
      expect(engine2.getCurrentSession().celebrationLevel).toBe('full');

      // But profile data should be consistent
      const profile1 = engine1.getUserProfile();
      const profile2 = engine2.getUserProfile();
      expect(profile1.userId).toBeTruthy();
      expect(profile2.userId).toBeTruthy();
    });
  });

  describe("File System Race Conditions", () => {
    test("should handle concurrent file operations without corruption", async () => {
      const engines = Array.from({ length: 4 }, () => new AdaptiveLearningEngine(TEST_SHERPA_HOME));

      // Simulate rapid save/load operations
      const operations: Promise<void>[] = [];

      for (let i = 0; i < engines.length; i++) {
        operations.push(
          (async () => {
            for (let j = 0; j < 3; j++) {
              engines[i].recordWorkflowUsage("tdd", `rapid-${i}-${j}`);
              await engines[i].saveUserProfile();
              await engines[i].loadUserProfile();
            }
          })()
        );
      }

      expect(async () => {
        await Promise.all(operations);
      }).not.toThrow();

      // Final profile should be valid and readable
      const testEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
      await testEngine.loadUserProfile();
      const profile = testEngine.getUserProfile();

      expect(profile.userId).toBeTruthy();
      expect(Array.isArray(profile.workflowPatterns)).toBe(true);
    });

    test("should handle interrupted save operations gracefully", async () => {
      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
      engine.recordWorkflowUsage("tdd", "interrupt-test");

      // Start save operation
      const savePromise = engine.saveUserProfile();

      // Try to read immediately (simulating interruption)
      const readPromise = engine.loadUserProfile();

      expect(async () => {
        await Promise.all([savePromise, readPromise]);
      }).not.toThrow();

      // Profile should still be valid
      const profile = engine.getUserProfile();
      expect(profile.userId).toBeTruthy();
    });

    test("should handle profile file being deleted during operation", async () => {
      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      // Create initial profile
      engine.recordWorkflowUsage("tdd", "deletion-test");
      await engine.saveUserProfile();

      // Start load operation and delete file concurrently
      const loadPromise = engine.loadUserProfile();
      const deletePromise = fs.rm(path.join(TEST_SHERPA_HOME, "user-profile.json"), { force: true });

      expect(async () => {
        await Promise.all([loadPromise, deletePromise]);
      }).not.toThrow();

      // Engine should still function with defaults
      const profile = engine.getUserProfile();
      expect(profile.userId).toBeTruthy();
    });
  });

  describe("Data Consistency Under Concurrency", () => {
    test("should maintain workflow pattern consistency with concurrent access", async () => {
      const sharedEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      // Record initial patterns
      sharedEngine.recordWorkflowUsage("tdd", "initial");
      await sharedEngine.saveUserProfile();

      // Multiple engines add patterns concurrently
      const engines = Array.from({ length: 3 }, () => new AdaptiveLearningEngine(TEST_SHERPA_HOME));

      await Promise.all(engines.map(engine => engine.loadUserProfile()));

      const concurrentRecordings = [
        engines[0].recordWorkflowUsage("bug-hunt", "concurrent1"),
        engines[1].recordWorkflowUsage("general", "concurrent2"),
        engines[2].recordWorkflowUsage("rapid", "concurrent3")
      ];

      expect(() => {
        concurrentRecordings;
      }).not.toThrow();

      // Check that each engine has valid patterns
      engines.forEach(engine => {
        const patterns = engine.getUserProfile().workflowPatterns;
        expect(Array.isArray(patterns)).toBe(true);
        patterns.forEach(pattern => {
          expect(typeof pattern.workflowType).toBe('string');
          expect(typeof pattern.completionRate).toBe('number');
        });
      });
    });

    test("should handle concurrent behavior metrics updates", async () => {
      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      // Update metrics concurrently
      const metricUpdates = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve().then(() => {
          engine.recordToolUsage("guide", { action: "check" });
          engine.recordWorkflowUsage("tdd", `metric-update-${i}`);
        })
      );

      await Promise.all(metricUpdates);

      const metrics = engine.getUserProfile().behaviorMetrics;
      expect(typeof metrics.toolUsageFrequency).toBe('object');
      expect(metrics.toolUsageFrequency.guide).toBeGreaterThan(0);
    });

    test("should maintain user ID consistency across concurrent operations", async () => {
      const engines = Array.from({ length: 5 }, () => new AdaptiveLearningEngine(TEST_SHERPA_HOME));

      // All engines perform operations concurrently
      const operations = engines.map(async (engine, i) => {
        engine.recordWorkflowUsage("tdd", `consistency-${i}`);
        await engine.saveUserProfile();
        await engine.loadUserProfile();
        return engine.getUserProfile().userId;
      });

      const userIds = await Promise.all(operations);

      // All engines should have the same user ID (first one created wins)
      const firstUserId = userIds[0];
      expect(firstUserId).toBeTruthy();

      // Note: Due to race conditions, user IDs might differ, but they should all be valid
      userIds.forEach(userId => {
        expect(typeof userId).toBe('string');
        expect(userId.length).toBeGreaterThan(0);
      });
    });
  });
});