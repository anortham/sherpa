#!/usr/bin/env bun
import { test, expect, describe } from "bun:test";
import { WorkflowDetector } from "../src/workflow/workflow-detector";

describe("WorkflowDetector", () => {
  const mockWorkflows = new Map([
    ["tdd", {
      name: "Test-Driven Development",
      description: "Build reliable software through testing first",
      trigger_hints: ["test", "tdd", "testing"],
      phases: []
    }],
    ["bug-hunt", {
      name: "Bug Hunt",
      description: "Systematic debugging and issue resolution",
      trigger_hints: ["bug", "error", "issue", "broken"],
      phases: []
    }],
    ["rapid", {
      name: "Rapid Prototyping",
      description: "Quick experimentation and prototyping",
      trigger_hints: ["prototype", "quick", "demo", "poc"],
      phases: []
    }],
    ["refactor", {
      name: "Refactoring",
      description: "Improve code quality and maintainability",
      trigger_hints: ["refactor", "clean up", "improve", "optimize"],
      phases: []
    }],
    ["general", {
      name: "General Development",
      description: "Balanced approach for general development",
      trigger_hints: ["general", "development"],
      phases: []
    }]
  ]);

  describe("detectWorkflowFromContext", () => {
    test("should return current workflow when no context provided", () => {
      const result = WorkflowDetector.detectWorkflowFromContext(
        undefined,
        mockWorkflows as any,
        "general"
      );

      expect(result).toBe("general");
    });

    test("should return current workflow when empty context provided", () => {
      const result = WorkflowDetector.detectWorkflowFromContext(
        "",
        mockWorkflows as any,
        "general"
      );

      expect(result).toBe("general");
    });

    test("should detect bug hunt patterns", () => {
      const bugContexts = [
        "fixing login bug",
        "there's an error in the code",
        "issue with authentication",
        "something is broken",
        "debugging the problem",
        "troubleshooting login issue",
        "reproducing the crash",
        "investigating the bug"
      ];

      bugContexts.forEach(context => {
        const result = WorkflowDetector.detectWorkflowFromContext(
          context,
          mockWorkflows as any,
          "general"
        );
        expect(result).toBe("bug-hunt");
      });
    });

    test("should detect rapid prototyping patterns", () => {
      const rapidContexts = [
        "quick prototype demo",
        "proof of concept",
        "spike solution",
        "experiment with the idea",
        "fast prototype"
      ];

      rapidContexts.forEach(context => {
        const result = WorkflowDetector.detectWorkflowFromContext(
          context,
          mockWorkflows as any,
          "general"
        );
        expect(result).toBe("rapid");
      });
    });

    test("should detect refactoring patterns", () => {
      const refactorContexts = [
        "clean up messy code",
        "refactor this function",
        "improve code quality",
        "optimize performance",
        "restructure the code",
        "modernize the codebase",
        "simplify the implementation"
      ];

      refactorContexts.forEach(context => {
        const result = WorkflowDetector.detectWorkflowFromContext(
          context,
          mockWorkflows as any,
          "general"
        );
        expect(result).toBe("refactor");
      });
    });

    test("should detect TDD patterns", () => {
      // Test individual patterns that should work
      expect(WorkflowDetector.detectWorkflowFromContext(
        "new feature",
        mockWorkflows as any,
        "general"
      )).toBe("tdd");

      expect(WorkflowDetector.detectWorkflowFromContext(
        "implement something",
        mockWorkflows as any,
        "general"
      )).toBe("tdd");
    });

    test("should prioritize bug hunt over other patterns", () => {
      // Bug patterns should be checked first
      const result = WorkflowDetector.detectWorkflowFromContext(
        "fixing bug in new feature",
        mockWorkflows as any,
        "general"
      );

      expect(result).toBe("bug-hunt");
    });

    test("should prioritize rapid over refactor patterns", () => {
      // Rapid patterns checked before refactor
      const result = WorkflowDetector.detectWorkflowFromContext(
        "quick prototype cleanup",
        mockWorkflows as any,
        "general"
      );

      expect(result).toBe("rapid");
    });

    test("should prioritize refactor over TDD patterns", () => {
      // Refactor patterns checked before TDD
      const result = WorkflowDetector.detectWorkflowFromContext(
        "improve new feature code",
        mockWorkflows as any,
        "general"
      );

      expect(result).toBe("refactor");
    });

    test("should return current workflow when no patterns match", () => {
      const result = WorkflowDetector.detectWorkflowFromContext(
        "working on documentation",
        mockWorkflows as any,
        "general"
      );

      expect(result).toBe("general");
    });

    test("should return empty string when workflow not found", () => {
      const result = WorkflowDetector.generateWorkflowSuggestion(
        "nonexistent",
        "general",
        mockWorkflows as any
      );

      expect(result).toBe("");
    });
  });

  describe("detectInitialWorkflow", () => {
    test("should return general when available", () => {
      const result = WorkflowDetector.detectInitialWorkflow(mockWorkflows);
      expect(result).toBe("general");
    });

    test("should return first available workflow when general not present", () => {
      const noGeneralWorkflows = new Map([
        ["tdd", mockWorkflows.get("tdd")!],
        ["bug-hunt", mockWorkflows.get("bug-hunt")!]
      ]);

      const result = WorkflowDetector.detectInitialWorkflow(noGeneralWorkflows);
      expect(result).toBe("tdd"); // First in iteration order
    });

    test("should return general as fallback when no workflows available", () => {
      const result = WorkflowDetector.detectInitialWorkflow(new Map());
      expect(result).toBe("general");
    });
  });

  describe("Pattern Recognition", () => {
    test("should recognize comprehensive bug patterns", () => {
      const patterns = [
        "bug", "error", "issue", "problem", "broken", "not working",
        "failing", "crash", "exception", "debug", "troubleshoot",
        "investigate", "reproduce", "fix"
      ];

      patterns.forEach(pattern => {
        const result = WorkflowDetector.detectWorkflowFromContext(
          `having ${pattern} with code`,
          mockWorkflows as any,
          "general"
        );
        expect(result).toBe("bug-hunt");
      });
    });

    test("should recognize comprehensive TDD patterns", () => {
      const patterns = [
        "new feature", "implement", "add function", "create", "build",
        "test", "tdd", "test-driven", "spec", "requirement"
      ];

      patterns.forEach(pattern => {
        const result = WorkflowDetector.detectWorkflowFromContext(
          `${pattern} development`,
          mockWorkflows as any,
          "general"
        );
        expect(result).toBe("tdd");
      });
    });

    test("should recognize comprehensive rapid patterns", () => {
      const patterns = [
        "prototype", "quick", "demo", "poc", "proof of concept",
        "experiment", "try", "spike", "explore"
      ];

      patterns.forEach(pattern => {
        const result = WorkflowDetector.detectWorkflowFromContext(
          `${pattern} idea`,
          mockWorkflows as any,
          "general"
        );
        expect(result).toBe("rapid");
      });
    });

    test("should recognize comprehensive refactor patterns", () => {
      const patterns = [
        "refactor", "clean up", "improve", "optimize", "restructure",
        "organize", "simplify", "modernize", "upgrade"
      ];

      patterns.forEach(pattern => {
        const result = WorkflowDetector.detectWorkflowFromContext(
          `${pattern} the code`,
          mockWorkflows as any,
          "general"
        );
        expect(result).toBe("refactor");
      });
    });
  });
});