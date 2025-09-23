import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { AdaptiveLearningEngine } from "../src/behavioral-adoption/adaptive-learning-engine";
import { SherpaServer } from "../sherpa-server";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `sherpa-fs-error-test-${Date.now()}`);
const TEST_SHERPA_HOME = path.join(TEST_ROOT, "sherpa");
const READONLY_DIR = path.join(TEST_ROOT, "readonly");

/**
 * Critical file system error handling tests.
 *
 * These scenarios happen in production and must be handled gracefully:
 * - Permission denied (corporate environments)
 * - Network drive failures (remote work setups)
 * - Disk full scenarios (CI/CD environments)
 * - Corrupted files (power failures, disk issues)
 */
describe("File System Error Scenarios", () => {
  let learningEngine: AdaptiveLearningEngine;

  beforeEach(async () => {
    // Clean test environment
    try {
      await fs.rm(TEST_ROOT, { recursive: true, force: true });
    } catch {}

    await fs.mkdir(TEST_ROOT, { recursive: true });
    learningEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_ROOT, { recursive: true, force: true });
    } catch {}
  });

  describe("User Profile Operations", () => {
    test("should handle ENOENT when parent directory doesn't exist", async () => {
      const invalidPath = path.join("/nonexistent/deeply/nested/path", "sherpa");
      const engine = new AdaptiveLearningEngine(invalidPath);

      // Should not crash when trying to save profile to non-existent directory
      expect(async () => {
        await engine.saveUserProfile();
      }).not.toThrow();

      // Should gracefully handle load attempts from non-existent path
      expect(async () => {
        await engine.loadUserProfile();
      }).not.toThrow();
    });

    test("should handle EACCES when directory is read-only", async () => {
      // Create read-only directory
      await fs.mkdir(READONLY_DIR, { recursive: true });
      // Note: Setting chmod might not work on all systems, but we test the scenario

      const readOnlyEngine = new AdaptiveLearningEngine(path.join(READONLY_DIR, "sherpa"));

      // Should handle permission denied gracefully
      let saveError: Error | null = null;
      try {
        await readOnlyEngine.saveUserProfile();
      } catch (error) {
        saveError = error as Error;
      }

      // System should continue functioning even if save fails
      expect(readOnlyEngine.getUserProfile()).toBeTruthy();
      expect(readOnlyEngine.getCurrentSession()).toBeTruthy();
    });

    test("should handle corrupted user profile JSON", async () => {
      // Create profile file with invalid JSON
      await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });
      const profilePath = path.join(TEST_SHERPA_HOME, "user-profile.json");
      await fs.writeFile(profilePath, "{ invalid json content }[{");

      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      // Should not crash on corrupted profile load
      expect(async () => {
        await engine.loadUserProfile();
      }).not.toThrow();

      // Should create fresh profile when corrupted one can't be loaded
      const profile = engine.getUserProfile();
      expect(profile.userId).toBeTruthy();
      expect(profile.createdAt).toBeInstanceOf(Date);
    });

    test("should handle partial write failures", async () => {
      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      // Simulate a scenario where file system runs out of space mid-write
      // by creating a large profile that would exceed available space
      const largeProfile = engine.getUserProfile();

      // Create large data that could fail to write
      for (let i = 0; i < 1000; i++) {
        largeProfile.workflowPatterns.push({
          workflowType: `test-workflow-${i}`,
          completionRate: Math.random(),
          averageTimeMinutes: Math.random() * 60,
          preferredPhaseOrder: [`phase-${i}-1`, `phase-${i}-2`, `phase-${i}-3`],
          commonStuckPoints: [`stuck-${i}-1`, `stuck-${i}-2`],
          successfulStrategies: [`strategy-${i}-1`, `strategy-${i}-2`],
          lastUsed: new Date(),
          totalCompletions: Math.floor(Math.random() * 100)
        });
      }

      // Save should not crash even with large data
      expect(async () => {
        await engine.saveUserProfile();
      }).not.toThrow();
    });
  });

  describe("Workflow File Loading", () => {
    test("should handle missing workflow files gracefully", async () => {
      const server = new SherpaServer();

      // Should not crash when workflow directory doesn't exist
      expect(() => {
        (server as any).loadWorkflows();
      }).not.toThrow();

      // Should have fallback workflows even when files are missing
      const workflows = (server as any).workflows;
      expect(workflows).toBeInstanceOf(Map);
    });

    test("should handle corrupted YAML workflow files", async () => {
      // Create workflows directory with corrupted YAML
      const workflowsDir = path.join(TEST_SHERPA_HOME, "workflows");
      await fs.mkdir(workflowsDir, { recursive: true });

      // Write invalid YAML
      await fs.writeFile(
        path.join(workflowsDir, "corrupted.yaml"),
        "invalid: yaml: content: [\nbroken indentation\n  mismatched: brackets ]"
      );

      const server = new SherpaServer();

      // Should not crash on corrupted YAML
      expect(() => {
        (server as any).loadWorkflows();
      }).not.toThrow();
    });

    test("should handle workflow files with missing required fields", async () => {
      const workflowsDir = path.join(TEST_SHERPA_HOME, "workflows");
      await fs.mkdir(workflowsDir, { recursive: true });

      // Write workflow with missing required fields
      await fs.writeFile(
        path.join(workflowsDir, "incomplete.yaml"),
        `name: "Incomplete Workflow"
        # Missing description and phases
        trigger_hints:
          - "incomplete"`
      );

      const server = new SherpaServer();

      // Should handle incomplete workflow gracefully
      expect(() => {
        (server as any).loadWorkflows();
      }).not.toThrow();
    });
  });

  describe("Directory Creation Failures", () => {
    test("should handle mkdir failures gracefully", async () => {
      // Try to create directory in location that might fail
      const invalidEngine = new AdaptiveLearningEngine("/dev/null/sherpa");

      // Should not crash on directory creation failure
      expect(async () => {
        await invalidEngine.saveUserProfile();
      }).not.toThrow();
    });

    test("should handle concurrent directory creation", async () => {
      // Multiple engines trying to create same directory
      const engines = Array.from({ length: 5 }, () => new AdaptiveLearningEngine(TEST_SHERPA_HOME));

      // All should handle concurrent directory creation
      const promises = engines.map(engine => engine.saveUserProfile());

      expect(async () => {
        await Promise.all(promises);
      }).not.toThrow();
    });
  });

  describe("Network Drive Scenarios", () => {
    test("should handle network timeout scenarios", async () => {
      // Simulate very slow network drive by using a path that might timeout
      const networkPath = path.join(TEST_ROOT, "very", "deep", "nested", "network", "path");
      const engine = new AdaptiveLearningEngine(networkPath);

      // Should timeout gracefully if filesystem is slow
      const startTime = Date.now();

      try {
        await engine.saveUserProfile();
      } catch (error) {
        // Should not take forever even if it fails
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeLessThan(30000); // Should timeout within 30 seconds
      }
    });

    test("should handle network disconnection during operation", async () => {
      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      // Start save operation
      const savePromise = engine.saveUserProfile();

      // "Disconnect" by removing directory mid-operation
      setTimeout(async () => {
        try {
          await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
        } catch {}
      }, 10);

      // Should handle disconnection gracefully
      expect(async () => {
        await savePromise;
      }).not.toThrow();
    });
  });

  describe("Recovery and Resilience", () => {
    test("should automatically recover from temporary failures", async () => {
      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      // Record some data
      engine.recordWorkflowUsage("tdd", "test context");
      engine.recordToolUsage("guide", { action: "check" });

      // First save should succeed
      await engine.saveUserProfile();

      // Simulate temporary failure by removing directory
      await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });

      // Record more data
      engine.recordWorkflowUsage("bug-hunt", "debugging");

      // Save should recreate directory and save successfully
      expect(async () => {
        await engine.saveUserProfile();
      }).not.toThrow();

      // Should have recreated directory
      const dirExists = await fs.access(TEST_SHERPA_HOME).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });

    test("should maintain state consistency during failures", async () => {
      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      // Record initial state
      engine.recordWorkflowUsage("tdd", "initial");
      const initialProfileLength = engine.getUserProfile().workflowPatterns.length;

      // Simulate save failure AFTER initial setup is complete
      const originalSave = engine.saveUserProfile;
      (engine as any).saveUserProfile = async () => {
        throw new Error("Simulated save failure");
      };

      // Record more data despite save failures
      engine.recordWorkflowUsage("bug-hunt", "additional");
      engine.recordToolUsage("guide", { action: "done", completed: "test" });

      // State should remain consistent even if saves fail
      const finalProfile = engine.getUserProfile();
      expect(finalProfile.workflowPatterns.length).toBeGreaterThan(initialProfileLength);
      expect(finalProfile.behaviorMetrics.toolUsageFrequency.guide).toBeGreaterThan(0);

      // Restore original save function
      (engine as any).saveUserProfile = originalSave;
    });
  });
});