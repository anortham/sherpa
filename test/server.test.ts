#!/usr/bin/env bun
import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import * as yaml from "yaml";

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