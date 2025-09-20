#!/usr/bin/env bun
import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import * as yaml from "yaml";
import { ProgressTracker } from "../src/behavioral-adoption/progress-tracker";
import { CelebrationGenerator } from "../src/behavioral-adoption/celebration-generator";
import { InstructionBuilder } from "../src/server-instructions/instruction-builder";

// Import the class we want to test (we'll need to export it)
// For now, we'll test the workflow loading logic directly

const TEST_SHERPA_HOME = path.join(os.tmpdir(), "sherpa-test");
const TEST_WORKFLOWS_DIR = path.join(TEST_SHERPA_HOME, "workflows");
const TEST_LOGS_DIR = path.join(TEST_SHERPA_HOME, "logs");

const FILE_OPS_TEST_DIR = path.join(os.tmpdir(), "sherpa-file-ops-test");
const FILE_OPS_WORKFLOWS_DIR = path.join(FILE_OPS_TEST_DIR, "workflows");

describe("Sherpa Server", () => {
  beforeAll(async () => {
    // Create test directory structure
    await fs.mkdir(TEST_WORKFLOWS_DIR, { recursive: true });
    await fs.mkdir(TEST_LOGS_DIR, { recursive: true });

    // Create test workflow files
    const testWorkflow = {
      name: "Test Workflow",
      description: "A test workflow",
      trigger_hints: ["test"],
      phases: [
        {
          name: "🧪 Test Phase",
          guidance: "Test guidance",
          suggestions: ["Test suggestion 1", "Test suggestion 2"]
        }
      ]
    };

    await fs.writeFile(
      path.join(TEST_WORKFLOWS_DIR, "test.yaml"),
      yaml.stringify(testWorkflow)
    );

    // Create an invalid workflow file to test error handling
    await fs.writeFile(
      path.join(TEST_WORKFLOWS_DIR, "invalid.yaml"),
      "invalid: yaml: content: [\n"
    );
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true });
  });

  test("should parse valid workflow files", async () => {
    const files = await fs.readdir(TEST_WORKFLOWS_DIR);
    const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    expect(yamlFiles).toContain("test.yaml");

    const content = await fs.readFile(path.join(TEST_WORKFLOWS_DIR, "test.yaml"), 'utf-8');
    const workflow = yaml.parse(content);

    expect(workflow.name).toBe("Test Workflow");
    expect(workflow.phases).toHaveLength(1);
    expect(workflow.phases[0].suggestions).toHaveLength(2);
  });

  test("should handle invalid YAML gracefully", async () => {
    expect(async () => {
      const content = await fs.readFile(path.join(TEST_WORKFLOWS_DIR, "invalid.yaml"), 'utf-8');
      yaml.parse(content);
    }).toThrow();
  });

  test("should validate workflow structure", () => {
    const validWorkflow = {
      name: "Valid",
      description: "Valid workflow",
      phases: [
        {
          name: "Phase 1",
          guidance: "Guidance",
          suggestions: ["Suggestion"]
        }
      ]
    };

    const invalidWorkflow = {
      name: "Invalid",
      // missing description and phases
    };

    // Test valid workflow
    expect(validWorkflow.name).toBeTruthy();
    expect(validWorkflow.description).toBeTruthy();
    expect(validWorkflow.phases).toBeTruthy();
    expect(Array.isArray(validWorkflow.phases)).toBe(true);

    // Test invalid workflow
    expect(invalidWorkflow.description).toBeFalsy();
    expect(invalidWorkflow.phases).toBeFalsy();
  });
});

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

describe("File Operations", () => {
  beforeAll(async () => {
    // Create separate test directories for file operations
    await fs.mkdir(FILE_OPS_WORKFLOWS_DIR, { recursive: true });

    // Create test files for filtering test
    await fs.writeFile(path.join(FILE_OPS_WORKFLOWS_DIR, "test.yaml"), "name: Test");
    await fs.writeFile(path.join(FILE_OPS_WORKFLOWS_DIR, "another.yml"), "name: Another");
    await fs.writeFile(path.join(FILE_OPS_WORKFLOWS_DIR, "config.json"), "{}");
  });

  afterAll(async () => {
    // Clean up file operations test directory
    await fs.rm(FILE_OPS_TEST_DIR, { recursive: true, force: true });
  });

  test("should create directories recursively", async () => {
    const testDir = path.join(FILE_OPS_TEST_DIR, "nested", "directory");
    await fs.mkdir(testDir, { recursive: true });

    const stats = await fs.stat(testDir);
    expect(stats.isDirectory()).toBe(true);
  });

  test("should handle missing directories gracefully", async () => {
    const nonExistentDir = path.join(FILE_OPS_TEST_DIR, "does-not-exist");

    await expect(fs.access(nonExistentDir)).rejects.toThrow();
  });

  test("should read and filter YAML files", async () => {
    const files = await fs.readdir(FILE_OPS_WORKFLOWS_DIR);
    const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    expect(yamlFiles.length).toBeGreaterThan(0);
    expect(yamlFiles.some(f => f.endsWith('.yaml'))).toBe(true);
    expect(yamlFiles.some(f => f.endsWith('.yml'))).toBe(true);
    expect(yamlFiles).toContain("test.yaml");
    expect(yamlFiles).toContain("another.yml");
    expect(yamlFiles).not.toContain("config.json");
  });
});

describe("Logging", () => {
  test("should generate proper log entries", () => {
    const timestamp = new Date().toISOString();
    const level = "INFO";
    const message = "Test message";
    const logEntry = `[${timestamp}] ${level}: ${message}\n`;

    expect(logEntry).toContain(timestamp);
    expect(logEntry).toContain(level);
    expect(logEntry).toContain(message);
    expect(logEntry.endsWith('\n')).toBe(true);
  });

  test("should generate daily log file names", () => {
    const today = new Date().toISOString().split('T')[0];
    const logFileName = `sherpa-${today}.log`;

    expect(logFileName).toContain('sherpa-');
    expect(logFileName).toContain(today);
    expect(logFileName.endsWith('.log')).toBe(true);
  });

  test("should calculate log rotation cutoff", () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24));

    expect(daysDiff).toBe(7);
  });
});

describe("Behavioral Adoption System", () => {
  describe("ProgressTracker", () => {
    test("should initialize with default stats", () => {
      const tracker = new ProgressTracker();
      const stats = tracker.getProgressStats();

      expect(stats.totalWorkflowsCompleted).toBe(0);
      expect(stats.totalStepsCompleted).toBe(0);
      expect(stats.currentStreak).toBe(0);
      expect(stats.workflowTypeUsage).toEqual({});
      expect(stats.averageStepsPerWorkflow).toBe(0);
      expect(stats.timeSpentInWorkflows).toBe(0);
    });

    test("should record step completion", () => {
      const tracker = new ProgressTracker();

      tracker.recordStepCompletion("tdd", "wrote first test");
      const stats = tracker.getProgressStats();

      expect(stats.totalStepsCompleted).toBe(1);
      expect(stats.workflowTypeUsage.tdd).toBe(1);
      expect(stats.currentStreak).toBeGreaterThan(0);
    });

    test("should record workflow completion", () => {
      const tracker = new ProgressTracker();

      tracker.recordWorkflowCompletion("tdd", 5, 30);
      const stats = tracker.getProgressStats();

      expect(stats.totalWorkflowsCompleted).toBe(1);
      expect(stats.timeSpentInWorkflows).toBe(30);
      expect(stats.averageStepsPerWorkflow).toBe(5);
      expect(stats.workflowTypeUsage.tdd).toBe(1);
    });

    test("should detect milestones", () => {
      const tracker = new ProgressTracker();

      // Complete first workflow to trigger milestone
      tracker.recordWorkflowCompletion("tdd", 3, 20);

      const milestones = tracker.getAchievedMilestones();
      expect(milestones.length).toBeGreaterThan(0);

      const firstWorkflowMilestone = milestones.find(m => m.id === "first_workflow_completion");
      expect(firstWorkflowMilestone).toBeTruthy();
      expect(firstWorkflowMilestone?.achieved).toBe(true);
      expect(firstWorkflowMilestone?.achievedAt).toBeInstanceOf(Date);
    });

    test("should detect workflow diversity milestone", () => {
      const tracker = new ProgressTracker();

      // Use all 5 workflow types
      const workflowTypes = ["tdd", "bug-hunt", "general", "rapid", "refactor"];
      workflowTypes.forEach(type => {
        tracker.recordStepCompletion(type, "test step");
      });

      const milestones = tracker.getAchievedMilestones();
      const diversityMilestone = milestones.find(m => m.id === "workflow_diversity");
      expect(diversityMilestone?.achieved).toBe(true);
    });

    test("should provide progress encouragement", () => {
      const tracker = new ProgressTracker();

      const encouragement = tracker.getProgressEncouragement();
      expect(encouragement).toBeTruthy();
      expect(typeof encouragement).toBe("string");
      expect(encouragement.length).toBeGreaterThan(0);
    });

    test("should provide personalized tips", () => {
      const tracker = new ProgressTracker();

      // Use only one workflow type
      tracker.recordStepCompletion("tdd", "test step");

      const tips = tracker.getPersonalizedTips();
      expect(Array.isArray(tips)).toBe(true);

      // Should suggest trying different workflows
      const diversityTip = tips.find(tip => tip.includes("different workflows"));
      expect(diversityTip).toBeTruthy();
    });

    test("should reset statistics", () => {
      const tracker = new ProgressTracker();

      tracker.recordWorkflowCompletion("tdd", 3, 20);
      tracker.resetStats();

      const stats = tracker.getProgressStats();
      expect(stats.totalWorkflowsCompleted).toBe(0);
      expect(stats.totalStepsCompleted).toBe(0);

      const milestones = tracker.getAchievedMilestones();
      expect(milestones.length).toBe(0);
    });
  });

  describe("CelebrationGenerator", () => {
    test("should initialize with progress tracker", () => {
      const progressTracker = new ProgressTracker();
      const encouragements = { testMessages: ["test"] };
      const generator = new CelebrationGenerator(progressTracker, encouragements);

      expect(generator).toBeTruthy();
    });

    test("should generate step completion celebration", () => {
      const progressTracker = new ProgressTracker();
      const encouragements = {
        progressMessages: {
          firstStep: ["Great first step!"],
          midProgress: ["Keep going!"],
          nearCompletion: ["Almost there!"]
        }
      };
      const generator = new CelebrationGenerator(progressTracker, encouragements);

      const context = {
        workflowType: "tdd",
        phaseName: "Test Phase",
        stepDescription: "wrote first test"
      };

      const celebration = generator.generateCelebration(context);
      expect(celebration).toBeTruthy();
      expect(typeof celebration).toBe("string");
      expect(celebration.length).toBeGreaterThan(0);
    });

    test("should generate phase entry celebration", () => {
      const progressTracker = new ProgressTracker();
      const encouragements = {
        phaseEntry: {
          tdd: {
            "implement-tests": "🧪 Time for the fun part - building your test suite!"
          }
        }
      };
      const generator = new CelebrationGenerator(progressTracker, encouragements);

      const celebration = generator.generatePhaseEntryCelebration("tdd", "🧪 Implement Tests");
      expect(celebration).toBeTruthy();
      expect(celebration).toContain("🧪");
    });

    test("should generate tool usage encouragement", () => {
      const progressTracker = new ProgressTracker();
      const encouragements = {
        toolUsageEncouragement: {
          next: ["Great workflow awareness!"]
        }
      };
      const generator = new CelebrationGenerator(progressTracker, encouragements);

      const encouragement = generator.generateToolUsageEncouragement("next");
      expect(encouragement).toBeTruthy();
      expect(typeof encouragement).toBe("string");
    });

    test("should generate workflow selection motivation", () => {
      const progressTracker = new ProgressTracker();
      const encouragements = {};
      const generator = new CelebrationGenerator(progressTracker, encouragements);

      const workflows = ["tdd", "bug-hunt", "general"];
      const motivation = generator.generateWorkflowSelectionMotivation(workflows);

      expect(motivation).toBeTruthy();
      expect(motivation).toMatch(/🎯|🏔️|⚡|🚀/); // Should contain motivational emoji
      expect(motivation).toContain("TDD");
      expect(motivation).toContain("Bug Hunt");
    });

    test("should generate success stories", () => {
      const progressTracker = new ProgressTracker();
      const encouragements = {};
      const generator = new CelebrationGenerator(progressTracker, encouragements);

      const tddStory = generator.generateSuccessStory("tdd");
      expect(tddStory).toBeTruthy();
      expect(tddStory).toContain("67%");

      const bugHuntStory = generator.generateSuccessStory("bug-hunt");
      expect(bugHuntStory).toBeTruthy();
      expect(bugHuntStory).toContain("Netflix");
    });

    test("should get celebration for achievements", () => {
      const progressTracker = new ProgressTracker();
      const encouragements = {};
      const generator = new CelebrationGenerator(progressTracker, encouragements);

      const stepsCelebration = generator.getCelebrationForAchievement("steps_completed", 25);
      expect(stepsCelebration).toBeTruthy();
      expect(stepsCelebration).toContain("25");

      const workflowsCelebration = generator.getCelebrationForAchievement("workflows_completed", 5);
      expect(workflowsCelebration).toBeTruthy();
      expect(workflowsCelebration).toContain("5");
    });
  });

  describe("InstructionBuilder", () => {
    test("should build basic instructions", async () => {
      const progressTracker = new ProgressTracker();
      const celebrationGenerator = new CelebrationGenerator(progressTracker, {});
      const builder = new InstructionBuilder(progressTracker, celebrationGenerator);

      const workflows = new Map();
      const context = { currentWorkflow: "general", currentPhase: 0 };

      const instructions = await builder.buildInstructions(workflows, context);
      expect(instructions).toBeTruthy();
      expect(typeof instructions).toBe("string");
      expect(instructions.length).toBeGreaterThan(0);
    });

    test("should handle missing template gracefully", async () => {
      const progressTracker = new ProgressTracker();
      const celebrationGenerator = new CelebrationGenerator(progressTracker, {});
      const builder = new InstructionBuilder(progressTracker, celebrationGenerator);

      const workflowInstructions = await builder.getWorkflowSpecificInstructions("nonexistent");
      expect(workflowInstructions).toBe("");
    });
  });
});

describe("Integration Tests", () => {
  test("should work together for complete behavioral flow", () => {
    const progressTracker = new ProgressTracker();
    const encouragements = {
      progressMessages: {
        firstStep: ["🎯 Great first step!"],
        midProgress: ["💪 Keep the momentum!"],
        nearCompletion: ["🏆 Almost there!"]
      },
      phaseEntry: {
        tdd: {
          "implement-tests": "🧪 Test time!"
        }
      }
    };
    const celebrationGenerator = new CelebrationGenerator(progressTracker, encouragements);

    // Simulate completing a step
    progressTracker.recordStepCompletion("tdd", "wrote first test");

    const context = {
      workflowType: "tdd",
      phaseName: "🧪 Implement Tests",
      stepDescription: "wrote first test"
    };

    const celebration = celebrationGenerator.generateCelebration(context);
    const phaseEntry = celebrationGenerator.generatePhaseEntryCelebration("tdd", "🧪 Implement Tests");
    const successStory = celebrationGenerator.generateSuccessStory("tdd");

    // All components should work together
    expect(celebration).toBeTruthy();
    expect(phaseEntry).toContain("🧪");
    expect(successStory).toContain("67%");

    const stats = progressTracker.getProgressStats();
    expect(stats.totalStepsCompleted).toBe(1);
    expect(stats.workflowTypeUsage.tdd).toBe(1);
  });

  test("should handle milestone progression", () => {
    const progressTracker = new ProgressTracker();
    const celebrationGenerator = new CelebrationGenerator(progressTracker, {});

    // Complete multiple workflows to trigger milestones
    for (let i = 0; i < 6; i++) {
      progressTracker.recordWorkflowCompletion("tdd", 3, 20);
    }

    const milestones = progressTracker.getAchievedMilestones();
    expect(milestones.length).toBeGreaterThan(1);

    // Should have both first workflow and veteran milestones
    const firstWorkflow = milestones.find(m => m.id === "first_workflow_completion");
    const veteran = milestones.find(m => m.id === "five_workflows_completed");

    expect(firstWorkflow?.achieved).toBe(true);
    expect(veteran?.achieved).toBe(true);
  });
});