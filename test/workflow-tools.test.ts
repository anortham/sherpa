#!/usr/bin/env bun
import { test, expect, describe } from "bun:test";

describe("Workflow Tools", () => {
  test("should generate next step response", () => {
    const workflow = {
      name: "Test Workflow",
      description: "Test",
      phases: [
        {
          name: "🧪 Test Phase",
          guidance: "Test guidance",
          suggestions: ["Suggestion 1", "Suggestion 2"]
        }
      ]
    };

    const currentPhase = 0;
    const phase = workflow.phases[currentPhase];
    const progress: string[] = [];

    const response = {
      workflow: workflow.name,
      phase: phase.name,
      guidance: phase.guidance,
      suggestions: phase.suggestions.filter(s => !progress.includes(s)),
      phase_number: `${currentPhase + 1}/${workflow.phases.length}`,
    };

    expect(response.workflow).toBe("Test Workflow");
    expect(response.phase).toBe("🧪 Test Phase");
    expect(response.suggestions).toHaveLength(2);
    expect(response.phase_number).toBe("1/1");
  });

  test("should filter completed suggestions", () => {
    const suggestions = ["Task 1", "Task 2", "Task 3"];
    const progress = ["Task 1", "Task 3"];

    const remainingSuggestions = suggestions.filter(s => !progress.includes(s));

    expect(remainingSuggestions).toEqual(["Task 2"]);
  });

  test("should handle workflow switching", () => {
    const workflows = new Map();
    workflows.set("workflow1", { name: "Workflow 1", description: "First", phases: [] });
    workflows.set("workflow2", { name: "Workflow 2", description: "Second", phases: [] });

    // Test listing workflows
    const workflowList = Array.from(workflows.entries()).map(([key, wf]) => ({
      key,
      name: wf.name,
      description: wf.description,
      phases: wf.phases.length
    }));

    expect(workflowList).toHaveLength(2);
    expect(workflowList[0].key).toBe("workflow1");
    expect(workflowList[1].key).toBe("workflow2");

    // Test workflow switching
    const targetWorkflow = "workflow2";
    expect(workflows.has(targetWorkflow)).toBe(true);

    const switched = workflows.get(targetWorkflow);
    expect(switched?.name).toBe("Workflow 2");
  });
});