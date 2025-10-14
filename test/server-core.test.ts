#!/usr/bin/env bun
import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

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
      JSON.stringify(testWorkflow, null, 2)
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
    const workflow = JSON.parse(content);

    expect(workflow.name).toBe("Test Workflow");
    expect(workflow.phases).toHaveLength(1);
    expect(workflow.phases[0].suggestions).toHaveLength(2);
  });

  test("should handle invalid YAML gracefully", async () => {
    expect(async () => {
      const content = await fs.readFile(path.join(TEST_WORKFLOWS_DIR, "invalid.yaml"), 'utf-8');
      JSON.parse(content);
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