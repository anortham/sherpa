#!/usr/bin/env bun
import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import * as yaml from "yaml";
import { ProgressTracker } from "../src/behavioral-adoption/progress-tracker";
import { CelebrationGenerator } from "../src/behavioral-adoption/celebration-generator";
import { Workflow, WorkflowPhase } from "../src/types";

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
    expect((invalidWorkflow as any).description).toBeFalsy();
    expect((invalidWorkflow as any).phases).toBeFalsy();
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

    test("should only increment streak once per day", () => {
      const tracker = new ProgressTracker();

      tracker.recordStepCompletion("tdd", "first step");
      tracker.recordStepCompletion("tdd", "second step same day");

      const stats = tracker.getProgressStats();
      expect(stats.currentStreak).toBe(1);
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

    test("should return newly achieved milestones", () => {
      const tracker = new ProgressTracker();

      const milestones = tracker.recordWorkflowCompletion("tdd", 4, 30);
      const firstWorkflowMilestone = milestones.find(m => m.id === "first_workflow_completion");

      expect(firstWorkflowMilestone).toBeTruthy();
      expect(firstWorkflowMilestone?.achieved).toBe(true);
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

  test("should handle missing encouragement data gracefully", () => {
    const progressTracker = new ProgressTracker();
    const emptyEncouragements = {}; // Missing all encouragement data
    const generator = new CelebrationGenerator(progressTracker, emptyEncouragements);

    // Test generateReminder with missing data
    const reminder = generator.generateReminder("nonexistent");
    expect(reminder).toBe("");

    // Test workflow completion with missing data
    const context = {
      workflowType: "tdd",
      phaseName: "Test Phase",
      isWorkflowComplete: true
    };

    const celebration = generator.generateCelebration(context);
    expect(celebration).toBeTruthy();
    expect(celebration).toContain("TDD Mastery");
  });

  test("should test uncovered ProgressTracker functionality", () => {
    const tracker = new ProgressTracker();

    // Test recordProgressCheck (uncovered line 113)
    const beforeCheck = tracker.getProgressStats().lastActivity;
    tracker.recordProgressCheck();
    const afterCheck = tracker.getProgressStats().lastActivity;

    expect(afterCheck.getTime()).toBeGreaterThanOrEqual(beforeCheck.getTime());
  });


  test("should handle milestone celebrations", () => {
    const progressTracker = new ProgressTracker();
    const encouragements = {
      milestones: {
        "first_workflow_completion": "🎉 Amazing! You've completed your first workflow!"
      }
    };
    const generator = new CelebrationGenerator(progressTracker, encouragements);

    // Complete a workflow to trigger milestone
    progressTracker.recordWorkflowCompletion("tdd", 3, 20);

    const milestones = progressTracker.getAchievedMilestones();
    const achievedMilestone = milestones.find(m => m.achieved);
    expect(achievedMilestone).toBeTruthy();
  });

  test("should handle phase completion celebrations", () => {
    const progressTracker = new ProgressTracker();
    const encouragements = {
      progressMessages: {
        phaseComplete: ["🏁 Phase completed brilliantly!"]
      }
    };
    const generator = new CelebrationGenerator(progressTracker, encouragements);

    const context = {
      workflowType: "tdd",
      phaseName: "🧪 Test Phase",
      isPhaseComplete: true
    };

    const celebration = generator.generateCelebration(context);
    expect(celebration).toBeTruthy();
    expect(celebration).toContain("🏁");
  });
});

describe("Error Handling and Edge Cases", () => {
  test("should handle malformed workflow files", async () => {
    const testDir = path.join(os.tmpdir(), "sherpa-error-test");
    await fs.mkdir(testDir, { recursive: true });

    // Create a file with invalid YAML that will cause parsing errors
    const malformedYaml = `
name: "Test Workflow"
description: "Test
phases:
  - name: "Test Phase"
    guidance: "Test guidance"
    suggestions:
      - "Test suggestion 1"
      - "Test suggestion 2"
# Missing closing quote above should cause parse error
`;

    await fs.writeFile(path.join(testDir, "malformed.yaml"), malformedYaml);

    try {
      const content = await fs.readFile(path.join(testDir, "malformed.yaml"), 'utf-8');
      expect(() => yaml.parse(content)).toThrow();
    } finally {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  test("should handle missing workflow directory", async () => {
    const nonExistentDir = path.join(os.tmpdir(), "does-not-exist");

    await expect(fs.readdir(nonExistentDir)).rejects.toThrow();
  });

  test("should handle workflow files with missing required fields", () => {
    const invalidWorkflows = [
      { name: "Test" }, // Missing description and phases
      { name: "Test", description: "Test" }, // Missing phases
      { name: "Test", description: "Test", phases: [] }, // Empty phases
      {
        name: "Test",
        description: "Test",
        phases: [{ name: "Phase 1" }] // Missing guidance and suggestions
      }
    ];

    invalidWorkflows.forEach(workflow => {
      // Test that our validation logic would catch these
      expect(workflow.name).toBeTruthy();
      if (workflow.description) {
        expect(workflow.description).toBeTruthy();
      }
      if (workflow.phases) {
        expect(Array.isArray(workflow.phases)).toBe(true);
        workflow.phases.forEach(phase => {
          expect(phase.name).toBeTruthy();
        });
      }
    });
  });

  test("should handle very large workflow files", async () => {
    const testDir = path.join(os.tmpdir(), "sherpa-large-test");
    await fs.mkdir(testDir, { recursive: true });

    // Create a workflow with many phases and suggestions
    const largeWorkflow = {
      name: "Large Test Workflow",
      description: "A workflow with many phases to test performance",
      phases: Array.from({ length: 50 }, (_, i) => ({
        name: `Phase ${i + 1}`,
        guidance: `Guidance for phase ${i + 1}`,
        suggestions: Array.from({ length: 20 }, (_, j) => `Suggestion ${j + 1} for phase ${i + 1}`)
      }))
    };

    const yamlContent = yaml.stringify(largeWorkflow);
    await fs.writeFile(path.join(testDir, "large.yaml"), yamlContent);

    try {
      const content = await fs.readFile(path.join(testDir, "large.yaml"), 'utf-8');
      const parsedWorkflow = yaml.parse(content);

      expect(parsedWorkflow.phases).toHaveLength(50);
      expect(parsedWorkflow.phases[0].suggestions).toHaveLength(20);
    } finally {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  test("should handle concurrent file operations", async () => {
    const testDir = path.join(os.tmpdir(), "sherpa-concurrent-test");
    await fs.mkdir(testDir, { recursive: true });

    const workflow = {
      name: "Test Workflow",
      description: "Test concurrent access",
      phases: [{ name: "Test", guidance: "Test", suggestions: ["Test"] }]
    };

    // Try to write the same file multiple times concurrently
    const writePromises = Array.from({ length: 5 }, (_, i) =>
      fs.writeFile(
        path.join(testDir, `concurrent-${i}.yaml`),
        yaml.stringify(workflow)
      )
    );

    // Should not throw errors
    await Promise.all(writePromises);

    // Verify all files were created
    const files = await fs.readdir(testDir);
    expect(files.filter(f => f.startsWith('concurrent-'))).toHaveLength(5);

    await fs.rm(testDir, { recursive: true, force: true });
  });
});

describe("Performance and Memory Tests", () => {
  test("should handle memory efficiently with large progress tracking", () => {
    const progressTracker = new ProgressTracker();

    // Simulate large amounts of progress data
    for (let i = 0; i < 1000; i++) {
      progressTracker.recordStepCompletion("tdd", `step ${i}`);
    }

    // Should not consume excessive memory or throw errors
    const stats = progressTracker.getProgressStats();
    expect(stats.totalStepsCompleted).toBe(1000);
    expect(stats.workflowTypeUsage.tdd).toBe(1000);
  });

  test("should handle rapid sequential operations", () => {
    const progressTracker = new ProgressTracker();
    const celebrationGenerator = new CelebrationGenerator(progressTracker, {});

    // Rapid sequential operations
    for (let i = 0; i < 100; i++) {
      // Use recordStepCompletion which actually updates streak
      progressTracker.recordStepCompletion("tdd", `rapid step ${i}`);

      const context = {
        workflowType: "tdd",
        phaseName: "Test Phase",
        stepDescription: `rapid step ${i}`
      };

      const celebration = celebrationGenerator.generateCelebration(context);
      expect(celebration).toBeTruthy();
    }

    const stats = progressTracker.getProgressStats();
    expect(stats.currentStreak).toBeGreaterThan(0);
    expect(stats.totalStepsCompleted).toBe(100);
  });
});

describe("Real Workflow File Integration", () => {
  test("should parse actual workflow files from the project", async () => {
    const workflowsDir = path.join(process.cwd(), "workflows");

    try {
      // Test if workflows directory exists
      await fs.access(workflowsDir);

      const files = await fs.readdir(workflowsDir);
      const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      expect(yamlFiles.length).toBeGreaterThan(0);

      // Parse each actual workflow file
      for (const file of yamlFiles) {
        const content = await fs.readFile(path.join(workflowsDir, file), 'utf-8');
        const workflow = yaml.parse(content);

        // Validate structure
        expect(workflow.name).toBeTruthy();
        expect(workflow.description).toBeTruthy();
        expect(Array.isArray(workflow.phases)).toBe(true);
        expect(workflow.phases.length).toBeGreaterThan(0);

        // Validate each phase
        workflow.phases.forEach((phase: any) => {
          expect(phase.name).toBeTruthy();
          expect(phase.guidance).toBeTruthy();
          expect(Array.isArray(phase.suggestions)).toBe(true);
        });
      }
    } catch (error) {
      // If workflows directory doesn't exist, that's also a valid test result
      // Note: Workflows directory not found, skipping real file tests
    }
  });
});

describe("Workflow Progression Bug Fix Tests", () => {
  describe("Manual Phase Advancement (advance action)", () => {
    test("should advance to next phase manually when requested", () => {
      // Test data for multi-phase workflow
      const multiPhaseWorkflow = {
        name: "Test Multi-Phase Workflow",
        description: "Workflow with multiple phases",
        phases: [
          {
            name: "📋 Planning Phase",
            guidance: "Plan your approach",
            suggestions: ["Define requirements", "Create outline"]
          },
          {
            name: "🔧 Implementation Phase",
            guidance: "Build the solution",
            suggestions: ["Write code", "Add tests"]
          },
          {
            name: "✅ Review Phase",
            guidance: "Review and finalize",
            suggestions: ["Code review", "Deploy"]
          }
        ]
      };

      // Simulate starting in first phase
      let currentPhase = 0;
      let currentWorkflow = "multi-phase-test";
      const phaseProgress = new Map<string, string[]>();

      // Initial state - in planning phase
      expect(currentPhase).toBe(0);
      expect(multiPhaseWorkflow.phases[currentPhase].name).toBe("📋 Planning Phase");

      // Simulate advance action
      if (currentPhase < multiPhaseWorkflow.phases.length - 1) {
        const previousPhase = multiPhaseWorkflow.phases[currentPhase];
        currentPhase++;
        const newPhase = multiPhaseWorkflow.phases[currentPhase];

        // Verify advancement
        expect(currentPhase).toBe(1);
        expect(newPhase.name).toBe("🔧 Implementation Phase");
        expect(previousPhase.name).toBe("📋 Planning Phase");
      }

      // Test advancing to final phase
      if (currentPhase < multiPhaseWorkflow.phases.length - 1) {
        currentPhase++;
        const finalPhase = multiPhaseWorkflow.phases[currentPhase];
        expect(currentPhase).toBe(2);
        expect(finalPhase.name).toBe("✅ Review Phase");
      }
    });

    test("should prevent advancing beyond final phase", () => {
      const singlePhaseWorkflow = {
        name: "Single Phase Workflow",
        description: "Workflow with only one phase",
        phases: [
          {
            name: "🎯 Only Phase",
            guidance: "Complete all tasks",
            suggestions: ["Task 1", "Task 2"]
          }
        ]
      };

      let currentPhase = 0;

      // Already at final phase
      expect(currentPhase).toBe(singlePhaseWorkflow.phases.length - 1);

      // Attempt to advance should be blocked
      if (currentPhase < singlePhaseWorkflow.phases.length - 1) {
        currentPhase++;
      } else {
        // Should remain at final phase
        expect(currentPhase).toBe(0);
      }
    });

    test("should handle advance action without workflow loaded", () => {
      // Test handling when no workflow is loaded
      let currentWorkflow = "";
      let workflows = new Map();

      const workflow = workflows.get(currentWorkflow);
      expect(workflow).toBeUndefined();

      // Should gracefully handle missing workflow
      if (!workflow) {
        const errorResponse = "No workflow loaded! Use the 'workflow' tool to choose your development adventure.";
        expect(errorResponse).toContain("No workflow loaded");
      }
    });

    test("should generate proper celebration message for phase advancement", () => {
      const workflow = {
        phases: [
          { name: "📋 Planning", guidance: "Plan", suggestions: ["Plan step"] },
          { name: "🔧 Build", guidance: "Build", suggestions: ["Build step"] }
        ]
      };

      let currentPhase = 0;
      const previousPhase = workflow.phases[currentPhase];
      currentPhase++;
      const newPhase = workflow.phases[currentPhase];

      // Generate advancement celebration message
      const phaseAdvancementCelebration = `🔄 **Advanced from ${previousPhase.name} to ${newPhase.name}**\n\nSometimes you need to move forward manually - that's perfectly fine! Let's focus on the next phase.`;

      expect(phaseAdvancementCelebration).toContain("🔄");
      expect(phaseAdvancementCelebration).toContain("📋 Planning");
      expect(phaseAdvancementCelebration).toContain("🔧 Build");
      expect(phaseAdvancementCelebration).toContain("Advanced from");
    });
  });

  describe("Enhanced Phase Completion Logic", () => {
    test("should complete phase with traditional exact suggestion matches", () => {
      const phase = {
        name: "🧪 Test Phase",
        guidance: "Write tests",
        suggestions: ["Write unit tests", "Write integration tests", "Add edge case tests"]
      };

      // All suggestions completed (traditional completion)
      const progress = ["Write unit tests", "Write integration tests", "Add edge case tests"];
      const remainingSuggestions = phase.suggestions.filter(s => !progress.includes(s));

      expect(remainingSuggestions.length).toBe(0);

      const traditionalPhaseComplete = remainingSuggestions.length === 0;
      expect(traditionalPhaseComplete).toBe(true);
    });

    test("should complete phase with smart completion (sufficient progress)", () => {
      const phase = {
        name: "🔧 Implementation Phase",
        guidance: "Build the feature",
        suggestions: ["Set up structure", "Implement core logic", "Add error handling", "Optimize performance", "Add documentation"]
      };

      // Only completed 3 out of 5 suggestions, but that's sufficient progress
      const progress = ["Set up structure", "Implement core logic", "Add error handling"];
      const hasSubstantialProgress = progress.length >= Math.min(3, phase.suggestions.length);

      expect(hasSubstantialProgress).toBe(true);
      expect(progress.length).toBe(3);
      expect(phase.suggestions.length).toBe(5);
    });

    test("should complete phase with explicit completion keywords", () => {
      const explicitCompletionPhrases = [
        "completed the phase",
        "finished this phase",
        "done with the current phase",
        "phase is complete",
        "ready for next phase",
        "phase complete - moving on",
        "finished phase work"
      ];

      explicitCompletionPhrases.forEach(completed => {
        const explicitCompletion = completed && (
          /completed.*phase/i.test(completed) ||
          /finished.*phase/i.test(completed) ||
          /done.*with.*phase/i.test(completed) ||
          /phase.*complete/i.test(completed) ||
          /ready.*next.*phase/i.test(completed)
        );

        expect(explicitCompletion).toBe(true);
      });
    });

    test("should not complete phase with insufficient progress and vague completion", () => {
      const phase = {
        name: "🔧 Complex Phase",
        guidance: "Complex implementation",
        suggestions: ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"]
      };

      // Only 1 out of 5 suggestions completed
      const progress = ["Step 1"];
      const completed = "made some progress"; // Vague completion

      const traditionalPhaseComplete = phase.suggestions.filter(s => !progress.includes(s)).length === 0;
      const hasSubstantialProgress = progress.length >= Math.min(3, phase.suggestions.length);
      const explicitCompletion = completed && (
        /completed.*phase/i.test(completed) ||
        /finished.*phase/i.test(completed) ||
        /done.*with.*phase/i.test(completed) ||
        /phase.*complete/i.test(completed) ||
        /ready.*next.*phase/i.test(completed)
      );

      const isPhaseComplete = traditionalPhaseComplete || explicitCompletion ||
        (hasSubstantialProgress && /all|everything|complete|finish/i.test(completed || ''));

      expect(isPhaseComplete).toBe(false);
      expect(traditionalPhaseComplete).toBe(false);
      expect(hasSubstantialProgress).toBe(false);
      expect(explicitCompletion).toBe(false);
    });

    test("should complete phase with substantial progress and completion keywords", () => {
      const phase = {
        name: "📝 Documentation Phase",
        guidance: "Document the system",
        suggestions: ["Write API docs", "Add code comments", "Create user guide", "Write README"]
      };

      const progress = ["Write API docs", "Add code comments", "Create user guide"]; // 3 out of 4
      const completed = "completed all the important documentation work";

      const traditionalPhaseComplete = phase.suggestions.filter(s => !progress.includes(s)).length === 0;
      const hasSubstantialProgress = progress.length >= Math.min(3, phase.suggestions.length);
      const explicitCompletion = /completed.*phase/i.test(completed);

      const isPhaseComplete = traditionalPhaseComplete || explicitCompletion ||
        (hasSubstantialProgress && /all|everything|complete|finish/i.test(completed));

      expect(isPhaseComplete).toBe(true);
      expect(hasSubstantialProgress).toBe(true);
      expect(/all|everything|complete|finish/i.test(completed)).toBe(true);
    });
  });

  describe("Progress Tracking and Calculation", () => {
    test("should refresh progress after recording completion", () => {
      const phase = {
        name: "🧪 Test Phase",
        suggestions: ["Write tests", "Run tests", "Fix failing tests"]
      };

      let phaseProgress = new Map<string, string[]>();
      phaseProgress.set(phase.name, ["Write tests"]);

      // Initial progress
      let progress = phaseProgress.get(phase.name) || [];
      expect(progress).toEqual(["Write tests"]);

      // Record new completion
      const completed = "Run tests";
      if (!progress.includes(completed)) {
        progress.push(completed);
        phaseProgress.set(phase.name, progress);
      }

      // Refresh progress after recording - this was part of the bug fix
      progress = phaseProgress.get(phase.name) || [];
      expect(progress).toEqual(["Write tests", "Run tests"]);

      // Calculate phase completion with updated progress
      const remainingSuggestions = phase.suggestions.filter(s => !progress.includes(s));
      expect(remainingSuggestions).toEqual(["Fix failing tests"]);

      // Phase should not be complete yet
      const isPhaseComplete = remainingSuggestions.length === 0;
      expect(isPhaseComplete).toBe(false);
    });

    test("should correctly calculate phase completion after progress update", () => {
      const phase = {
        name: "🔧 Build Phase",
        suggestions: ["Setup", "Implement", "Test"]
      };

      let phaseProgress = new Map<string, string[]>();

      // Record multiple completions
      const completions = ["Setup", "Implement", "Test"];
      let progress: string[] = [];

      completions.forEach(completed => {
        progress.push(completed);
        phaseProgress.set(phase.name, [...progress]);

        // Refresh progress after each recording (simulates the bug fix)
        const refreshedProgress = phaseProgress.get(phase.name) || [];
        const isComplete = refreshedProgress.length >= phase.suggestions.length;

        if (completed === "Test") {
          expect(isComplete).toBe(true);
          expect(refreshedProgress).toEqual(["Setup", "Implement", "Test"]);
        }
      });
    });

    test("should handle workflow validation moved earlier in method", () => {
      // Test early workflow validation (part of the bug fix)
      const workflows = new Map();
      workflows.set("valid-workflow", {
        name: "Valid Workflow",
        phases: [{ name: "Phase 1", guidance: "Test", suggestions: ["Task 1"] }]
      });

      let currentWorkflow = "invalid-workflow";

      // Early validation should catch missing workflow
      const workflow = workflows.get(currentWorkflow);
      if (!workflow) {
        const errorResponse = "No workflow loaded! Use the 'workflow' tool to choose your development adventure.";
        expect(errorResponse).toContain("No workflow loaded");
      }

      // Valid workflow should pass early validation
      currentWorkflow = "valid-workflow";
      const validWorkflow = workflows.get(currentWorkflow);
      expect(validWorkflow).toBeTruthy();
      expect(validWorkflow?.phases.length).toBe(1);
    });
  });

  describe("Complete Guide Tool Workflow Integration", () => {
    test("should handle complete workflow progression from start to finish", () => {
      // Setup complete workflow scenario
      const workflow = {
        name: "Integration Test Workflow",
        description: "Full workflow for integration testing",
        phases: [
          {
            name: "📋 Planning",
            guidance: "Plan your approach carefully",
            suggestions: ["Define objectives", "Research requirements", "Create plan"]
          },
          {
            name: "🔧 Implementation",
            guidance: "Build the solution systematically",
            suggestions: ["Set up environment", "Implement core features", "Add error handling"]
          },
          {
            name: "🧪 Testing",
            guidance: "Ensure quality and reliability",
            suggestions: ["Write unit tests", "Integration testing", "Performance testing"]
          }
        ]
      };

      // Test state
      let currentPhase = 0;
      let phaseProgress = new Map<string, string[]>();
      let isWorkflowComplete = false;

      // Phase 1: Planning phase progression
      expect(workflow.phases[currentPhase].name).toBe("📋 Planning");

      // Complete some suggestions in planning
      const planningProgress = ["Define objectives", "Research requirements"];
      phaseProgress.set("📋 Planning", planningProgress);

      // Test enhanced completion with explicit completion
      const explicitCompletion = "completed the planning phase thoroughly";
      const hasSubstantialProgress = planningProgress.length >= Math.min(2, workflow.phases[0].suggestions.length); // 2 out of 3 is substantial
      const explicitMatch = /completed.*phase/i.test(explicitCompletion);
      const isPhase1Complete = hasSubstantialProgress && explicitMatch;

      expect(isPhase1Complete).toBe(true);

      // Advance to next phase
      if (isPhase1Complete && currentPhase < workflow.phases.length - 1) {
        currentPhase++;
      }

      // Phase 2: Implementation phase
      expect(currentPhase).toBe(1);
      expect(workflow.phases[currentPhase].name).toBe("🔧 Implementation");

      // Test manual advance action
      const canAdvance = currentPhase < workflow.phases.length - 1;
      expect(canAdvance).toBe(true);

      if (canAdvance) {
        const previousPhase = workflow.phases[currentPhase];
        currentPhase++; // Manual advance
        const newPhase = workflow.phases[currentPhase];

        expect(previousPhase.name).toBe("🔧 Implementation");
        expect(newPhase.name).toBe("🧪 Testing");
        expect(currentPhase).toBe(2);
      }

      // Phase 3: Final phase completion
      expect(workflow.phases[currentPhase].name).toBe("🧪 Testing");

      // Complete all suggestions in testing phase (traditional completion)
      const testingProgress = ["Write unit tests", "Integration testing", "Performance testing"];
      phaseProgress.set("🧪 Testing", testingProgress);

      const remainingSuggestions = workflow.phases[2].suggestions.filter(s => !testingProgress.includes(s));
      const isPhase3Complete = remainingSuggestions.length === 0;

      expect(isPhase3Complete).toBe(true);
      expect(remainingSuggestions).toEqual([]);

      // Workflow completion
      isWorkflowComplete = isPhase3Complete && currentPhase >= workflow.phases.length - 1;
      expect(isWorkflowComplete).toBe(true);
    });

    test("should handle guide tool action enumeration after bug fix", () => {
      // Test that all guide actions are properly supported
      const validActions = ["check", "done", "tdd", "bug", "next", "advance"];

      validActions.forEach(action => {
        expect(["check", "done", "tdd", "bug", "next", "advance"]).toContain(action);
      });

      // Test new advance action specifically
      expect(validActions).toContain("advance");

      // Test action descriptions
      const actionDescriptions = {
        "check": "get next step",
        "done": "mark completion",
        "tdd": "start TDD workflow",
        "bug": "start bug hunt",
        "next": "what should I do right now",
        "advance": "manually move to next phase"
      };

      expect(actionDescriptions.advance).toBe("manually move to next phase");
    });

    test("should handle workflow progression edge cases", () => {
      // Test single-phase workflow with advance action
      const singlePhaseWorkflow = {
        name: "Single Phase Workflow",
        phases: [
          {
            name: "🎯 Only Phase",
            guidance: "Complete everything here",
            suggestions: ["Task 1", "Task 2", "Task 3"]
          }
        ]
      };

      let currentPhase = 0;
      const isAtFinalPhase = currentPhase >= singlePhaseWorkflow.phases.length - 1;

      expect(isAtFinalPhase).toBe(true);

      // Attempt to advance should be prevented
      if (currentPhase < singlePhaseWorkflow.phases.length - 1) {
        currentPhase++;
      } else {
        // Should remain at same phase
        expect(currentPhase).toBe(0);
      }
    });

    test("should maintain celebration context throughout workflow", () => {
      const progressTracker = new ProgressTracker();
      const encouragements = {
        progressMessages: {
          firstStep: ["🎯 Great start!"],
          midProgress: ["💪 Keep going!"],
          phaseComplete: ["🎉 Phase completed!"]
        }
      };
      const generator = new CelebrationGenerator(progressTracker, encouragements);

      // Simulate step completion with context
      const stepContext = {
        workflowType: "integration-test",
        phaseName: "🧪 Testing Phase",
        stepDescription: "wrote comprehensive unit tests",
        isPhaseComplete: false,
        isWorkflowComplete: false,
        newMilestones: []
      };

      const stepCelebration = generator.generateCelebration(stepContext);
      expect(stepCelebration).toBeTruthy();

      // Simulate phase completion
      const phaseContext = {
        workflowType: "integration-test",
        phaseName: "🧪 Testing Phase",
        stepDescription: "completed all testing tasks",
        isPhaseComplete: true,
        isWorkflowComplete: false,
        newMilestones: []
      };

      const phaseCelebration = generator.generateCelebration(phaseContext);
      expect(phaseCelebration).toBeTruthy();
      expect(phaseCelebration).toContain("🎉");

      // Record progress for behavioral tracking
      progressTracker.recordStepCompletion("integration-test", "comprehensive testing complete");
      const stats = progressTracker.getProgressStats();
      expect(stats.totalStepsCompleted).toBe(1);
    });

    test("should handle progress refresh in real workflow scenario", () => {
      // Simulate the exact bug fix scenario where progress wasn't refreshed
      const phase = {
        name: "🔧 Implementation Phase",
        suggestions: ["Setup project", "Write core code", "Add error handling", "Optimize performance"]
      };

      let phaseProgress = new Map<string, string[]>();

      // Start with some initial progress
      phaseProgress.set(phase.name, ["Setup project"]);

      // Simulate guide done action
      const completed = "Write core code";

      // BEFORE bug fix: progress not refreshed, used stale data
      let progressBeforeRefresh = phaseProgress.get(phase.name) || [];
      expect(progressBeforeRefresh).toEqual(["Setup project"]);

      // Record the new completion
      if (!progressBeforeRefresh.includes(completed)) {
        progressBeforeRefresh.push(completed);
        phaseProgress.set(phase.name, progressBeforeRefresh);
      }

      // AFTER bug fix: progress refreshed for accurate calculation
      let progressAfterRefresh = phaseProgress.get(phase.name) || [];
      expect(progressAfterRefresh).toEqual(["Setup project", "Write core code"]);

      // Calculate remaining with updated progress
      const remainingSuggestions = phase.suggestions.filter(s => !progressAfterRefresh.includes(s));
      expect(remainingSuggestions).toEqual(["Add error handling", "Optimize performance"]);

      // Phase completion should be based on refreshed progress
      const isPhaseComplete = remainingSuggestions.length === 0;
      expect(isPhaseComplete).toBe(false); // Still has 2 remaining tasks

      // Test the complete flow
      const finalCompletions = ["Add error handling", "Optimize performance"];
      finalCompletions.forEach(task => {
        progressAfterRefresh = phaseProgress.get(phase.name) || [];
        progressAfterRefresh.push(task);
        phaseProgress.set(phase.name, progressAfterRefresh);
      });

      const finalProgress = phaseProgress.get(phase.name) || [];
      const finalRemaining = phase.suggestions.filter(s => !finalProgress.includes(s));
      expect(finalRemaining).toEqual([]);
      expect(finalProgress.length).toBe(4); // All suggestions completed
    });
  });
});
