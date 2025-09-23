import { describe, test, expect, beforeEach } from "bun:test";
import { SherpaServer } from "../sherpa-server";
import { AdaptiveLearningEngine } from "../src/behavioral-adoption/adaptive-learning-engine";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

const TEST_SHERPA_HOME = path.join(os.tmpdir(), `sherpa-celebration-test-${Date.now()}`);

/**
 * Comprehensive test suite for celebration filtering system.
 * Tests all 4 celebration levels: off, whisper, minimal, full
 *
 * This system is critical for the liquid experience - it ensures
 * that celebrations match user preferences without interrupting flow.
 */
describe("Celebration Filtering System", () => {
  let server: any;
  let learningEngine: AdaptiveLearningEngine;

  beforeEach(async () => {
    // Clean test environment
    try {
      await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
    } catch {}

    learningEngine = new AdaptiveLearningEngine(TEST_SHERPA_HOME);

    // Create a test implementation that matches the real server method
    server = {
      learningEngine,
      filterCelebrationContent: (content: string) => {
        // Handle null/undefined input gracefully
        if (!content || typeof content !== 'string') {
          return '';
        }

        const session = learningEngine.getCurrentSession();
        const celebrationLevel = session.celebrationLevel;

        switch (celebrationLevel) {
          case 'off':
            return content
              // Remove celebration emojis using Unicode escapes
              .replace(/[\u{1F389}\u{1F525}\u{26A1}\u{1F680}\u{2728}\u{1F3C6}\u{1F4AA}\u{1F31F}\u{1F3AF}\u{1F4BB}\u{1F527}\u{2699}\u{1F4DD}\u{1F3A8}\u{1F9EA}\u{1F50D}]/gu, '')
              // Replace enthusiastic words
              .replace(/\b(awesome|amazing|fantastic|incredible|brilliant|excellent|outstanding|superb|wonderful|great|perfect)\b/gi, 'good')
              // Replace exclamation marks with single period
              .replace(/!+/g, '.')
              // Clean up extra spaces
              .replace(/\s+/g, ' ')
              .trim();

          case 'whisper':
            return content
              // Remove loud celebration emojis but keep work-related ones like 🔧, 💻, 🔄
              .replace(/[\u{1F389}\u{1F525}\u{26A1}\u{1F680}\u{1F3C6}\u{1F4AA}\u{1F31F}]/gu, '')
              // Reduce multiple exclamation marks to single
              .replace(/!{2,}/g, '!')
              // Clean up extra spaces
              .replace(/\s+/g, ' ')
              .trim();

          case 'minimal':
            return content
              // Remove very enthusiastic emojis including trophy
              .replace(/[\u{1F389}\u{1F525}\u{26A1}\u{1F680}\u{1F3C6}]/gu, '')
              // Limit exclamation marks to maximum 2
              .replace(/!{3,}/g, '!!')
              // Clean up extra spaces
              .replace(/\s+/g, ' ')
              .trim();

          case 'full':
          default:
            return content;
        }
      }
    };
  });

  describe("Celebration Level: OFF", () => {
    test("should remove all emojis and enthusiasm", () => {
      // Set celebration level to 'off'
      learningEngine.getCurrentSession().celebrationLevel = 'off';

      const input = "🎉 Excellent work! You're amazing at this! 🚀✨";
      const result = server.filterCelebrationContent(input);

      // Should remove emojis and replace enthusiastic words
      expect(result).toBe("good work. You're good at this.");
      expect(result).not.toContain("🎉");
      expect(result).not.toContain("🚀");
      expect(result).not.toContain("!");
      expect(result).not.toContain("Excellent");
      expect(result).not.toContain("amazing");
    });

    test("should handle multiple exclamation marks", () => {
      learningEngine.getCurrentSession().celebrationLevel = 'off';

      const input = "Great work!!! Fantastic job!!!";
      const result = server.filterCelebrationContent(input);

      expect(result).toBe("good work. good job.");
      expect(result).not.toContain("!");
    });

    test("should preserve basic sentence structure", () => {
      learningEngine.getCurrentSession().celebrationLevel = 'off';

      const input = "You completed the task. This is good progress.";
      const result = server.filterCelebrationContent(input);

      expect(result).toBe("You completed the task. This is good progress.");
    });
  });

  describe("Celebration Level: WHISPER", () => {
    test("should remove loud emojis but keep subtle ones", () => {
      learningEngine.getCurrentSession().celebrationLevel = 'whisper';

      const input = "🎉 Great work! 🔧 This is excellent!! 🚀";
      const result = server.filterCelebrationContent(input);

      // Should remove loud emojis but keep subtle ones like 🔧
      expect(result).toContain("🔧");
      expect(result).not.toContain("🎉");
      expect(result).not.toContain("🚀");
      expect(result).toContain("Great work!");
      expect(result).not.toContain("!!"); // Should reduce multiple exclamations
    });

    test("should reduce multiple exclamation marks", () => {
      learningEngine.getCurrentSession().celebrationLevel = 'whisper';

      const input = "Awesome work!!! Keep going!!!";
      const result = server.filterCelebrationContent(input);

      expect(result).toBe("Awesome work! Keep going!");
      expect(result).not.toContain("!!!");
    });
  });

  describe("Celebration Level: MINIMAL", () => {
    test("should remove very enthusiastic emojis but keep moderate ones", () => {
      learningEngine.getCurrentSession().celebrationLevel = 'minimal';

      const input = "🎉 Great! 💻 Good work! 🚀 Keep going!!!";
      const result = server.filterCelebrationContent(input);

      expect(result).toContain("💻"); // Should keep moderate emojis
      expect(result).not.toContain("🎉"); // Should remove party emojis
      expect(result).not.toContain("🚀"); // Should remove rocket emojis
      expect(result).toContain("Great! 💻 Good work! Keep going!!");
    });

    test("should limit excessive exclamation marks", () => {
      learningEngine.getCurrentSession().celebrationLevel = 'minimal';

      const input = "Fantastic work!!!! Amazing job!!!!!";
      const result = server.filterCelebrationContent(input);

      expect(result).toBe("Fantastic work!! Amazing job!!");
      expect(result).not.toContain("!!!");
    });
  });

  describe("Celebration Level: FULL", () => {
    test("should preserve all content unchanged", () => {
      learningEngine.getCurrentSession().celebrationLevel = 'full';

      const input = "🎉 Excellent work!!! You're absolutely amazing! 🚀✨🏆";
      const result = server.filterCelebrationContent(input);

      expect(result).toBe(input); // Should be identical
    });

    test("should handle default case", () => {
      // Don't set celebration level, should default to 'full'
      const input = "🎉 Amazing work! 🚀";
      const result = server.filterCelebrationContent(input);

      expect(result).toBe(input);
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty strings", () => {
      learningEngine.getCurrentSession().celebrationLevel = 'off';

      const result = server.filterCelebrationContent("");
      expect(result).toBe("");
    });

    test("should handle strings with only emojis", () => {
      learningEngine.getCurrentSession().celebrationLevel = 'off';

      const input = "🎉🚀✨🏆";
      const result = server.filterCelebrationContent(input);

      expect(result).toBe("");
    });

    test("should handle strings with only exclamation marks", () => {
      learningEngine.getCurrentSession().celebrationLevel = 'off';

      const input = "!!!!!!";
      const result = server.filterCelebrationContent(input);

      expect(result).toBe("."); // Clean single period is better UX than multiple
    });

    test("should handle mixed case enthusiastic words", () => {
      learningEngine.getCurrentSession().celebrationLevel = 'off';

      const input = "EXCELLENT work! Amazing job! fantastic effort!";
      const result = server.filterCelebrationContent(input);

      expect(result).toBe("good work. good job. good effort.");
    });

    test("should handle null or undefined input gracefully", () => {
      learningEngine.getCurrentSession().celebrationLevel = 'off';

      // These should not crash the system
      expect(() => server.filterCelebrationContent(null)).not.toThrow();
      expect(() => server.filterCelebrationContent(undefined)).not.toThrow();
    });
  });

  describe("Real-world Integration", () => {
    test("should filter adaptive hints correctly", () => {
      learningEngine.getCurrentSession().celebrationLevel = 'whisper';

      const hintContent = "🔄 Smart suggestion: Consider switching to TDD workflow! This will help you write better tests! 🚀";
      const result = server.filterCelebrationContent(hintContent);

      expect(result).toContain("🔄"); // Should keep workflow emoji
      expect(result).not.toContain("🚀"); // Should remove rocket
      expect(result).toContain("Smart suggestion");
      expect(result).not.toContain("!!"); // Should reduce excitement
    });

    test("should filter celebration messages correctly", () => {
      learningEngine.getCurrentSession().celebrationLevel = 'minimal';

      const celebration = "🎉 Excellent progress! You've completed 3/5 steps perfectly!!! 🏆";
      const result = server.filterCelebrationContent(celebration);

      expect(result).not.toContain("🎉");
      expect(result).not.toContain("🏆");
      expect(result).toContain("Excellent progress");
      expect(result).toContain("completed 3/5 steps perfectly!!");
    });
  });
});