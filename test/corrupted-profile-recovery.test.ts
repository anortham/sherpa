import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { AdaptiveLearningEngine } from "../src/behavioral-adoption/adaptive-learning-engine";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `sherpa-corrupted-profile-test-${Date.now()}`);
const TEST_SHERPA_HOME = path.join(TEST_ROOT, "sherpa");

/**
 * Comprehensive corrupted user profile recovery tests.
 *
 * These scenarios test the system's ability to gracefully handle:
 * - Malformed JSON structures
 * - Missing required fields
 * - Invalid data types
 * - Corrupted workflow patterns
 * - Invalid date strings
 * - Oversized profile data
 *
 * The system must always recover to a functional state.
 */
describe("Corrupted User Profile Recovery", () => {
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

  describe("JSON Structure Corruption", () => {
    test("should handle completely invalid JSON", async () => {
      // Create profile with completely malformed JSON
      await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });
      const profilePath = path.join(TEST_SHERPA_HOME, "user-profile.json");
      await fs.writeFile(profilePath, "{ this is not valid json at all [[[");

      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      // Should not crash and should create fresh profile
      expect(async () => {
        await engine.loadUserProfile();
      }).not.toThrow();

      const profile = engine.getUserProfile();
      expect(profile.userId).toBeTruthy();
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.workflowPatterns).toEqual([]);
    });

    test("should handle truncated JSON", async () => {
      await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });
      const profilePath = path.join(TEST_SHERPA_HOME, "user-profile.json");
      await fs.writeFile(profilePath, '{"userId": "test123", "createdAt": "2024-01-01", "workflowPatterns": [{"workflowType": "t');

      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      expect(async () => {
        await engine.loadUserProfile();
      }).not.toThrow();

      const profile = engine.getUserProfile();
      expect(profile.workflowPatterns).toEqual([]);
    });

    test("should handle JSON with wrong root type", async () => {
      await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });
      const profilePath = path.join(TEST_SHERPA_HOME, "user-profile.json");
      await fs.writeFile(profilePath, '"this should be an object, not a string"');

      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      expect(async () => {
        await engine.loadUserProfile();
      }).not.toThrow();

      const profile = engine.getUserProfile();
      expect(typeof profile).toBe('object');
      expect(profile.userId).toBeTruthy();
    });
  });

  describe("Missing Required Fields", () => {
    test("should handle profile missing userId", async () => {
      await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });
      const profilePath = path.join(TEST_SHERPA_HOME, "user-profile.json");
      await fs.writeFile(profilePath, JSON.stringify({
        createdAt: "2024-01-01T00:00:00.000Z",
        workflowPatterns: [],
        contextPatterns: []
        // Missing userId and other required fields
      }));

      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      expect(async () => {
        await engine.loadUserProfile();
      }).not.toThrow();

      const profile = engine.getUserProfile();
      expect(profile.userId).toBeTruthy(); // Should generate new userId
      expect(profile.behaviorMetrics).toBeTruthy(); // Should have default metrics
    });

    test("should handle profile missing behaviorMetrics", async () => {
      await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });
      const profilePath = path.join(TEST_SHERPA_HOME, "user-profile.json");
      await fs.writeFile(profilePath, JSON.stringify({
        userId: "test123",
        createdAt: "2024-01-01T00:00:00.000Z",
        workflowPatterns: [],
        contextPatterns: []
        // Missing behaviorMetrics
      }));

      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      expect(async () => {
        await engine.loadUserProfile();
      }).not.toThrow();

      const profile = engine.getUserProfile();
      expect(profile.behaviorMetrics).toBeTruthy();
      expect(profile.behaviorMetrics.toolUsageFrequency).toBeTruthy();
    });
  });

  describe("Invalid Data Types", () => {
    test("should handle workflow patterns with wrong data types", async () => {
      await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });
      const profilePath = path.join(TEST_SHERPA_HOME, "user-profile.json");
      await fs.writeFile(profilePath, JSON.stringify({
        userId: "test123",
        createdAt: "2024-01-01T00:00:00.000Z",
        workflowPatterns: "should be array", // Wrong type
        contextPatterns: [],
        behaviorMetrics: {
          totalSessionTime: 0,
          averageSessionLength: 0,
          toolUsageFrequency: {},
          preferredCelebrationLevel: 'full',
          workflowSwitchFrequency: 0,
          contextAwarenessAccuracy: 0,
          predictiveHintAcceptanceRate: 0,
          flowModeUsage: 0
        },
        preferences: {
          defaultWorkflow: 'general',
          celebrationLevel: 'full',
          flowModeEnabled: false,
          predictiveHintsEnabled: true
        },
        achievements: []
      }));

      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      expect(async () => {
        await engine.loadUserProfile();
      }).not.toThrow();

      const profile = engine.getUserProfile();
      expect(Array.isArray(profile.workflowPatterns)).toBe(true);
      expect(profile.workflowPatterns).toEqual([]);
    });

    test("should handle behaviorMetrics with invalid types", async () => {
      await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });
      const profilePath = path.join(TEST_SHERPA_HOME, "user-profile.json");
      await fs.writeFile(profilePath, JSON.stringify({
        userId: "test123",
        createdAt: "2024-01-01T00:00:00.000Z",
        workflowPatterns: [],
        contextPatterns: [],
        behaviorMetrics: {
          totalSessionTime: "should be number",
          averageSessionLength: null,
          toolUsageFrequency: "should be object",
          preferredCelebrationLevel: 123, // Should be string
          workflowSwitchFrequency: "invalid",
          contextAwarenessAccuracy: true,
          predictiveHintAcceptanceRate: [],
          flowModeUsage: {}
        },
        preferences: {
          defaultWorkflow: 'general',
          celebrationLevel: 'full',
          flowModeEnabled: false,
          predictiveHintsEnabled: true
        },
        achievements: []
      }));

      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      expect(async () => {
        await engine.loadUserProfile();
      }).not.toThrow();

      const profile = engine.getUserProfile();
      expect(typeof profile.behaviorMetrics.totalSessionTime).toBe('number');
      expect(typeof profile.behaviorMetrics.averageSessionLength).toBe('number');
      expect(typeof profile.behaviorMetrics.toolUsageFrequency).toBe('object');
    });
  });

  describe("Invalid Date Handling", () => {
    test("should handle invalid date strings", async () => {
      await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });
      const profilePath = path.join(TEST_SHERPA_HOME, "user-profile.json");
      await fs.writeFile(profilePath, JSON.stringify({
        userId: "test123",
        createdAt: "not-a-valid-date",
        lastActive: "also-invalid",
        workflowPatterns: [{
          workflowType: "tdd",
          completionRate: 0.5,
          averageTimeMinutes: 30,
          preferredPhaseOrder: [],
          commonStuckPoints: [],
          successfulStrategies: [],
          lastUsed: "invalid-date-string",
          totalCompletions: 5
        }],
        contextPatterns: [],
        behaviorMetrics: {
          totalSessionTime: 0,
          averageSessionLength: 0,
          toolUsageFrequency: {},
          preferredCelebrationLevel: 'full',
          workflowSwitchFrequency: 0,
          contextAwarenessAccuracy: 0,
          predictiveHintAcceptanceRate: 0,
          flowModeUsage: 0
        },
        preferences: {
          defaultWorkflow: 'general',
          celebrationLevel: 'full',
          flowModeEnabled: false,
          predictiveHintsEnabled: true
        },
        achievements: []
      }));

      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      expect(async () => {
        await engine.loadUserProfile();
      }).not.toThrow();

      const profile = engine.getUserProfile();
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.lastActive).toBeInstanceOf(Date);
      if (profile.workflowPatterns.length > 0) {
        expect(profile.workflowPatterns[0].lastUsed).toBeInstanceOf(Date);
      }
    });

    test("should handle null date values", async () => {
      await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });
      const profilePath = path.join(TEST_SHERPA_HOME, "user-profile.json");
      await fs.writeFile(profilePath, JSON.stringify({
        userId: "test123",
        createdAt: null,
        lastActive: null,
        workflowPatterns: [],
        contextPatterns: [],
        behaviorMetrics: {
          totalSessionTime: 0,
          averageSessionLength: 0,
          toolUsageFrequency: {},
          preferredCelebrationLevel: 'full',
          workflowSwitchFrequency: 0,
          contextAwarenessAccuracy: 0,
          predictiveHintAcceptanceRate: 0,
          flowModeUsage: 0
        },
        preferences: {
          defaultWorkflow: 'general',
          celebrationLevel: 'full',
          flowModeEnabled: false,
          predictiveHintsEnabled: true
        },
        achievements: []
      }));

      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      expect(async () => {
        await engine.loadUserProfile();
      }).not.toThrow();

      const profile = engine.getUserProfile();
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.lastActive).toBeInstanceOf(Date);
    });
  });

  describe("Workflow Pattern Corruption", () => {
    test("should handle corrupted workflow pattern structure", async () => {
      await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });
      const profilePath = path.join(TEST_SHERPA_HOME, "user-profile.json");
      await fs.writeFile(profilePath, JSON.stringify({
        userId: "test123",
        createdAt: "2024-01-01T00:00:00.000Z",
        workflowPatterns: [
          "should be object not string",
          { workflowType: "missing-required-fields" },
          {
            workflowType: null,
            completionRate: "should be number",
            averageTimeMinutes: [],
            preferredPhaseOrder: "should be array",
            commonStuckPoints: null,
            successfulStrategies: 123,
            lastUsed: "invalid-date",
            totalCompletions: "invalid"
          }
        ],
        contextPatterns: [],
        behaviorMetrics: {
          totalSessionTime: 0,
          averageSessionLength: 0,
          toolUsageFrequency: {},
          preferredCelebrationLevel: 'full',
          workflowSwitchFrequency: 0,
          contextAwarenessAccuracy: 0,
          predictiveHintAcceptanceRate: 0,
          flowModeUsage: 0
        },
        preferences: {
          defaultWorkflow: 'general',
          celebrationLevel: 'full',
          flowModeEnabled: false,
          predictiveHintsEnabled: true
        },
        achievements: []
      }));

      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      expect(async () => {
        await engine.loadUserProfile();
      }).not.toThrow();

      const profile = engine.getUserProfile();
      expect(Array.isArray(profile.workflowPatterns)).toBe(true);

      // Should filter out invalid patterns and fix valid ones
      profile.workflowPatterns.forEach(pattern => {
        expect(typeof pattern).toBe('object');
        expect(typeof pattern.workflowType).toBe('string');
        expect(typeof pattern.completionRate).toBe('number');
        expect(Array.isArray(pattern.preferredPhaseOrder)).toBe(true);
      });
    });

    test("should handle extremely large workflow pattern arrays", async () => {
      const largePatterns = Array.from({ length: 1000 }, (_, i) => ({
        workflowType: `pattern-${i}`,
        completionRate: 0.5,
        averageTimeMinutes: 30,
        preferredPhaseOrder: [],
        commonStuckPoints: [],
        successfulStrategies: [],
        lastUsed: "2024-01-01T00:00:00.000Z",
        totalCompletions: 1
      }));

      await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });
      const profilePath = path.join(TEST_SHERPA_HOME, "user-profile.json");
      await fs.writeFile(profilePath, JSON.stringify({
        userId: "test123",
        createdAt: "2024-01-01T00:00:00.000Z",
        workflowPatterns: largePatterns,
        contextPatterns: [],
        behaviorMetrics: {
          totalSessionTime: 0,
          averageSessionLength: 0,
          toolUsageFrequency: {},
          preferredCelebrationLevel: 'full',
          workflowSwitchFrequency: 0,
          contextAwarenessAccuracy: 0,
          predictiveHintAcceptanceRate: 0,
          flowModeUsage: 0
        },
        preferences: {
          defaultWorkflow: 'general',
          celebrationLevel: 'full',
          flowModeEnabled: false,
          predictiveHintsEnabled: true
        },
        achievements: []
      }));

      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      expect(async () => {
        await engine.loadUserProfile();
      }).not.toThrow();

      // Should handle large data gracefully without performance issues
      const startTime = Date.now();
      const profile = engine.getUserProfile();
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(1000); // Should load within 1 second
      expect(Array.isArray(profile.workflowPatterns)).toBe(true);
    });
  });

  describe("Recovery and Defaults", () => {
    test("should maintain functionality after profile recovery", async () => {
      // Create corrupted profile
      await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });
      const profilePath = path.join(TEST_SHERPA_HOME, "user-profile.json");
      await fs.writeFile(profilePath, "{ invalid json }");

      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      // Load should recover gracefully
      await engine.loadUserProfile();

      // System should be fully functional after recovery
      engine.recordWorkflowUsage("tdd", "test context");
      engine.recordToolUsage("guide", { action: "check" });

      const profile = engine.getUserProfile();
      expect(profile.workflowPatterns.length).toBe(1);
      expect(profile.workflowPatterns[0].workflowType).toBe("tdd");

      const session = engine.getCurrentSession();
      expect(session.workflowsUsed).toContain("tdd");
      expect(session.contextsProvided).toContain("test context");
    });

    test("should generate valid new profile when recovery fails completely", async () => {
      // Create completely invalid file
      await fs.mkdir(TEST_SHERPA_HOME, { recursive: true });
      const profilePath = path.join(TEST_SHERPA_HOME, "user-profile.json");
      await fs.writeFile(profilePath, Buffer.from([0x00, 0x01, 0x02, 0xFF])); // Binary data

      const engine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

      expect(async () => {
        await engine.loadUserProfile();
      }).not.toThrow();

      const profile = engine.getUserProfile();

      // Should have all required fields with correct types
      expect(typeof profile.userId).toBe('string');
      expect(profile.userId.length).toBeGreaterThan(0);
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.lastActive).toBeInstanceOf(Date);
      expect(Array.isArray(profile.workflowPatterns)).toBe(true);
      expect(Array.isArray(profile.contextPatterns)).toBe(true);
      expect(Array.isArray(profile.achievements)).toBe(true);
      expect(typeof profile.behaviorMetrics).toBe('object');
      expect(typeof profile.preferences).toBe('object');
    });
  });
});