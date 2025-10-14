#!/usr/bin/env bun
import { test, expect, describe } from "bun:test";
import { PhaseCompletionDetector } from "../src/workflow/phase-completion";

describe("PhaseCompletionDetector", () => {
  describe("isPhaseSemanticallComplete", () => {
    test("should return false for insufficient progress", () => {
      const phase = {
        name: "Test Phase",
        suggestions: ["step1", "step2", "step3"]
      };

      const result = PhaseCompletionDetector.isPhaseSemanticallComplete(
        "tdd",
        phase,
        ["step1"],
        "some work"
      );

      expect(result).toBe(false);
    });

    test("should detect TDD red phase completion", () => {
      const phase = {
        name: "🔴 Red Phase",
        suggestions: ["write test", "run test", "see failure"]
      };

      const result = PhaseCompletionDetector.isPhaseSemanticallComplete(
        "tdd",
        phase,
        ["wrote test", "ran test"],
        "test fails as expected"
      );

      expect(result).toBe(true);
    });

    test("should detect TDD green phase completion", () => {
      const phase = {
        name: "🟢 Green Phase",
        suggestions: ["implement code", "run test", "see pass"]
      };

      const result = PhaseCompletionDetector.isPhaseSemanticallComplete(
        "tdd",
        phase,
        ["wrote code", "ran test"],
        "test passes now"
      );

      expect(result).toBe(true);
    });

    test("should detect TDD refactor phase completion", () => {
      const phase = {
        name: "🔵 Refactor Phase",
        suggestions: ["clean code", "run tests", "ensure pass"]
      };

      const result = PhaseCompletionDetector.isPhaseSemanticallComplete(
        "tdd",
        phase,
        ["refactored code", "ran tests"],
        "tests still pass"
      );

      expect(result).toBe(true);
    });

    test("should detect bug hunt reproduce phase completion", () => {
      const phase = {
        name: "🔍 Reproduce & Isolate",
        suggestions: ["reproduce bug", "find steps", "isolate code"]
      };

      const result = PhaseCompletionDetector.isPhaseSemanticallComplete(
        "bug-hunt",
        phase,
        ["tried to reproduce", "found steps"],
        "can reproduce the bug consistently"
      );

      expect(result).toBe(true);
    });

    test("should detect bug hunt test phase completion", () => {
      const phase = {
        name: "🧪 Test & Capture",
        suggestions: ["write test", "capture bug", "test fails"]
      };

      const result = PhaseCompletionDetector.isPhaseSemanticallComplete(
        "bug-hunt",
        phase,
        ["wrote test", "ran test"],
        "test fails and captures the bug"
      );

      expect(result).toBe(true);
    });

    test("should detect bug hunt fix phase completion", () => {
      const phase = {
        name: "🔧 Fix & Verify",
        suggestions: ["fix bug", "run tests", "verify fix"]
      };

      const result = PhaseCompletionDetector.isPhaseSemanticallComplete(
        "bug-hunt",
        phase,
        ["fixed code", "ran tests"],
        "bug is resolved"
      );

      expect(result).toBe(true);
    });

    test("should detect general planning phase completion", () => {
      const phase = {
        name: "📋 Plan & Research",
        suggestions: ["analyze requirements", "research solutions", "create plan"]
      };

      const result = PhaseCompletionDetector.isPhaseSemanticallComplete(
        "general",
        phase,
        ["analyzed requirements", "researched options"],
        "have a clear plan"
      );

      expect(result).toBe(true);
    });

    test("should detect general implementation phase completion", () => {
      const phase = {
        name: "⚙️ Implement",
        suggestions: ["write code", "test functionality", "integrate"]
      };

      const result = PhaseCompletionDetector.isPhaseSemanticallComplete(
        "general",
        phase,
        ["wrote code", "tested"],
        "functionality is working"
      );

      expect(result).toBe(true);
    });

    test("should detect general testing phase completion", () => {
      const phase = {
        name: "🧪 Test & Verify",
        suggestions: ["write tests", "run tests", "verify results"]
      };

      const result = PhaseCompletionDetector.isPhaseSemanticallComplete(
        "general",
        phase,
        ["wrote tests", "ran tests"],
        "all tests pass"
      );

      expect(result).toBe(true);
    });

    test("should handle case insensitive matching", () => {
      const phase = {
        name: "🔴 Red Phase",
        suggestions: ["write test", "run test"]
      };

      const result = PhaseCompletionDetector.isPhaseSemanticallComplete(
        "tdd",
        phase,
        ["WROTE TEST", "RAN TEST"],
        "TEST FAILS AS EXPECTED"
      );

      expect(result).toBe(true);
    });

    test("should require substantial progress for generic completion", () => {
      const phase = {
        name: "Some Phase",
        suggestions: ["step1", "step2", "step3", "step4", "step5"]
      };

      // Only 1 progress item, not enough
      const result1 = PhaseCompletionDetector.isPhaseSemanticallComplete(
        "general",
        phase,
        ["step1"],
        "everything is working"
      );
      expect(result1).toBe(false);

      // 2 progress items with strong completion language
      const result2 = PhaseCompletionDetector.isPhaseSemanticallComplete(
        "general",
        phase,
        ["step1", "step2"],
        "everything implemented and working"
      );
      expect(result2).toBe(true);
    });
  });

  describe("isPhaseComplete", () => {
    const mockPhase = {
      name: "Test Phase",
      suggestions: ["step1", "step2", "step3"]
    };

    test("should complete phase with traditional completion (all suggestions done)", () => {
      const result = PhaseCompletionDetector.isPhaseComplete(
        "tdd",
        mockPhase,
        ["step1", "step2", "step3"],
        "completed phase"
      );

      expect(result).toBe(true);
    });

    test("should complete phase with substantial progress and completion keywords", () => {
      // 2 out of 3 suggestions = 66% > 60% threshold + completion keyword
      const result = PhaseCompletionDetector.isPhaseComplete(
        "tdd",
        mockPhase,
        ["step1", "step2"],
        "implementation working"
      );

      expect(result).toBe(true);
    });

    test("should complete phase with explicit completion language", () => {
      const explicitCompletions = [
        "completed phase",
        "finished phase",
        "done with phase",
        "phase complete",
        "ready next phase",
        "moving to next"
      ];

      explicitCompletions.forEach(completion => {
        const result = PhaseCompletionDetector.isPhaseComplete(
          "tdd",
          mockPhase,
          ["step1"],
          completion
        );
        expect(result).toBe(true);
      });
    });

    test("should complete phase with semantic completion", () => {
      const result = PhaseCompletionDetector.isPhaseComplete(
        "tdd",
        { name: "🔴 Red Phase", suggestions: ["write test", "run test"] },
        ["wrote test"],
        "test fails as expected"
      );

      expect(result).toBe(true);
    });

    test("should complete phase with natural completion indicators", () => {
      const naturalCompletions = [
        "all done",
        "everything working",
        "fully implemented",
        "complete working",
        "done",
        "working"
      ];

      naturalCompletions.forEach(completion => {
        const result = PhaseCompletionDetector.isPhaseComplete(
          "tdd",
          mockPhase,
          ["step1", "step2"], // substantial progress
          completion
        );
        expect(result).toBe(true);
      });
    });

    test("should not complete phase with insufficient progress", () => {
      const result = PhaseCompletionDetector.isPhaseComplete(
        "tdd",
        mockPhase,
        ["step1"], // only 1 out of 3 = 33% < 60%
        "some work done"
      );

      expect(result).toBe(false);
    });

    test("should not complete phase with weak completion language", () => {
      const result = PhaseCompletionDetector.isPhaseComplete(
        "tdd",
        mockPhase,
        ["step1"],
        "started working on it"
      );

      expect(result).toBe(false);
    });

    test("should handle edge cases gracefully", () => {
      // Empty progress
      expect(PhaseCompletionDetector.isPhaseComplete("tdd", mockPhase, [], undefined)).toBe(false);

      // Null/undefined completed
      expect(PhaseCompletionDetector.isPhaseComplete("tdd", mockPhase, ["step1"], undefined)).toBe(false);

      // Empty completed string
      expect(PhaseCompletionDetector.isPhaseComplete("tdd", mockPhase, ["step1"], "")).toBe(false);
    });

    test("should work with different workflow types", () => {
      const workflows = ["tdd", "bug-hunt", "general", "rapid", "refactor"];

      workflows.forEach(workflowType => {
        const result = PhaseCompletionDetector.isPhaseComplete(
          workflowType,
          mockPhase,
          ["step1", "step2", "step3"],
          "completed"
        );
        expect(result).toBe(true);
      });
    });
  });
});