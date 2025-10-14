#!/usr/bin/env bun
import { describe, test, expect, beforeEach, afterEach, vi } from "bun:test";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as yaml from "yaml";
import { SherpaServer } from "../sherpa-server";

const ORIGINAL_HOME = process.env.HOME;
const ORIGINAL_USERPROFILE = process.env.USERPROFILE;
let homedirSpy: ReturnType<typeof vi.spyOn> | null = null;

const baseWorkflow = {
  name: "General Development",
  description: "Balanced workflow",
  phases: [
    {
      name: "Research",
      guidance: "Understand the problem",
      suggestions: ["Gather requirements", "Review existing code"]
    }
  ]
};

const multiPhaseWorkflow = {
  name: "Multi-Phase Workflow",
  description: "Covers multiple phases for testing",
  phases: [
    {
      name: "Phase One",
      guidance: "Start strong",
      suggestions: ["Step 1A", "Step 1B"]
    },
    {
      name: "Phase Two",
      guidance: "Finish well",
      suggestions: ["Step 2A", "Step 2B"]
    }
  ]
};

describe("SherpaServer regression coverage", () => {
  let tempHome: string;
  let workflowsDir: string;

  beforeEach(async () => {
    tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "sherpa-home-"));
    process.env.HOME = tempHome;
    process.env.USERPROFILE = tempHome;

    homedirSpy = vi.spyOn(os, "homedir").mockReturnValue(tempHome);

    const sherpaDir = path.join(tempHome, ".sherpa");
    workflowsDir = path.join(sherpaDir, "workflows");
    await fs.mkdir(workflowsDir, { recursive: true });

    const sourceWorkflowsDir = path.join(process.cwd(), "workflows");
    const sourceFiles = await fs.readdir(sourceWorkflowsDir);
    await Promise.all(
      sourceFiles
        .filter(file => file.endsWith(".yaml"))
        .map(file => fs.copyFile(
          path.join(sourceWorkflowsDir, file),
          path.join(workflowsDir, file)
        ))
    );

    await fs.writeFile(
      path.join(workflowsDir, "general.yaml"),
      yaml.stringify(baseWorkflow)
    );

    await fs.writeFile(
      path.join(workflowsDir, "multi.yaml"),
      yaml.stringify(multiPhaseWorkflow)
    );

  });

  afterEach(async () => {
    process.env.HOME = ORIGINAL_HOME;
    if (ORIGINAL_USERPROFILE === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = ORIGINAL_USERPROFILE;
    }
    homedirSpy?.mockRestore();
    homedirSpy = null;
    vi.restoreAllMocks();
    await fs.rm(tempHome, { recursive: true, force: true }).catch(() => {});
  });

  function createServer(): SherpaServer {
    return new SherpaServer();
  }



  test("workflow completion records all steps across phases", async () => {
    const server = createServer();
    const handleGuide = (server as any).guideHandler.handleGuide.bind((server as any).guideHandler);
    const tracker = (server as any).progressTracker;
    const workflowMap: Map<string, any> = (server as any).workflows;
    await (server as any).loadWorkflows();
    const workflow = workflowMap.get("tdd");
    expect(workflow).toBeTruthy();

    // Pretend all phases are complete
    (server as any).currentWorkflow = "tdd";
    (server as any).currentPhase = workflow.phases.length - 1;
    workflow.phases.forEach((phase: any) => {
      (server as any).phaseProgress.set(phase.name, [...phase.suggestions]);
    });

    let workflowCall: [string, number, number] | null = null;
    const originalWorkflowCompletion = tracker.recordWorkflowCompletion.bind(tracker);
    tracker.recordWorkflowCompletion = (workflowType: string, stepsCompleted: number, timeSpent: number) => {
      workflowCall = [workflowType, stepsCompleted, timeSpent];
      return originalWorkflowCompletion(workflowType, stepsCompleted, timeSpent);
    };

    await handleGuide({ action: "done" });

    const totalSuggestions = workflow.phases.reduce((sum: number, phase: any) => sum + phase.suggestions.length, 0);
    expect(workflowCall).not.toBeNull();
    expect(workflowCall![0]).toBe("tdd");
    expect(workflowCall![1]).toBe(totalSuggestions);
  });

  test("invalid workflow files do not prevent loading valid ones", async () => {
    await fs.writeFile(path.join(workflowsDir, "broken.yaml"), "this: : : invalid");

    const server = createServer();
    const workflows = (server as any).workflows;
    await (server as any).loadWorkflows();

    expect(workflows.size).toBeGreaterThan(0);
    expect(workflows.has("general")).toBe(true);
  });

  test("guide tool tolerates missing arguments", () => {
    const server = createServer();
    const handleGuide = (server as any).guideHandler.handleGuide.bind((server as any).guideHandler);

    expect(() => {
      handleGuide(undefined);
    }).not.toThrow();
  });
});
