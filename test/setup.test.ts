#!/usr/bin/env bun
import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as yaml from "yaml";

const TEST_HOME = path.join(os.tmpdir(), "sherpa-setup-test");
const TEST_SHERPA_HOME = path.join(TEST_HOME, ".sherpa");
const TEST_WORKFLOWS_DIR = path.join(TEST_SHERPA_HOME, "workflows");
const TEST_LOGS_DIR = path.join(TEST_SHERPA_HOME, "logs");
const SOURCE_WORKFLOWS = path.join(__dirname, "..", "workflows");

// Helper functions that mirror the setup script logic
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyWorkflows(sourceDir: string, destDir: string, force = false) {
  const sourceFiles = await fs.readdir(sourceDir);
  const yamlFiles = sourceFiles.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

  let copied = 0;
  let skipped = 0;

  for (const file of yamlFiles) {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);

    if (!force && await fileExists(destPath)) {
      skipped++;
    } else {
      await fs.copyFile(sourcePath, destPath);
      copied++;
    }
  }

  return { copied, skipped };
}

describe("Setup Script Functions", () => {
  let testSourceDir: string;

  beforeAll(async () => {
    // Create test environment
    await fs.mkdir(TEST_HOME, { recursive: true });

    // Create source workflows for testing
    testSourceDir = path.join(TEST_HOME, "source-workflows");
    await fs.mkdir(testSourceDir, { recursive: true });

    // Create test workflow files
    const workflows = [
      {
        name: "Test TDD",
        description: "Test TDD workflow",
        phases: [{ name: "Test", guidance: "Test", suggestions: ["Test"] }]
      },
      {
        name: "Test General",
        description: "Test general workflow",
        phases: [{ name: "Test", guidance: "Test", suggestions: ["Test"] }]
      }
    ];

    await fs.writeFile(
      path.join(testSourceDir, "tdd.yaml"),
      yaml.stringify(workflows[0])
    );
    await fs.writeFile(
      path.join(testSourceDir, "general.yaml"),
      yaml.stringify(workflows[1])
    );

    // Set SOURCE_WORKFLOWS to our test directory for testing
    process.env.TEST_SOURCE_WORKFLOWS = testSourceDir;
  });

  afterAll(async () => {
    await fs.rm(TEST_HOME, { recursive: true, force: true });
  });

  test("should check file existence correctly", async () => {
    const existingFile = path.join(TEST_HOME, "existing.txt");
    await fs.writeFile(existingFile, "test");

    expect(await fileExists(existingFile)).toBe(true);
    expect(await fileExists(path.join(TEST_HOME, "nonexistent.txt"))).toBe(false);
  });

  test("should create directory structure", async () => {
    const testDir = path.join(TEST_HOME, "test-sherpa");
    const workflowsDir = path.join(testDir, "workflows");
    const logsDir = path.join(testDir, "logs");

    await fs.mkdir(workflowsDir, { recursive: true });
    await fs.mkdir(logsDir, { recursive: true });

    expect(await fileExists(testDir)).toBe(true);
    expect(await fileExists(workflowsDir)).toBe(true);
    expect(await fileExists(logsDir)).toBe(true);
  });

  test("should copy workflow files", async () => {
    const destDir = path.join(TEST_HOME, "test-workflows");
    await fs.mkdir(destDir, { recursive: true });

    const { copied, skipped } = await copyWorkflows(testSourceDir, destDir);

    expect(copied).toBe(2);
    expect(skipped).toBe(0);

    // Verify files were copied
    expect(await fileExists(path.join(destDir, "tdd.yaml"))).toBe(true);
    expect(await fileExists(path.join(destDir, "general.yaml"))).toBe(true);
  });

  test("should skip existing files when not forced", async () => {
    const destDir = path.join(TEST_HOME, "test-workflows-skip");
    await fs.mkdir(destDir, { recursive: true });

    // Create an existing file
    await fs.writeFile(path.join(destDir, "tdd.yaml"), "existing content");

    const { copied, skipped } = await copyWorkflows(testSourceDir, destDir, false);

    expect(copied).toBe(1); // Only general.yaml should be copied
    expect(skipped).toBe(1); // tdd.yaml should be skipped

    // Verify existing file wasn't overwritten
    const content = await fs.readFile(path.join(destDir, "tdd.yaml"), 'utf-8');
    expect(content).toBe("existing content");
  });

  test("should overwrite files when forced", async () => {
    const destDir = path.join(TEST_HOME, "test-workflows-force");
    await fs.mkdir(destDir, { recursive: true });

    // Create an existing file
    await fs.writeFile(path.join(destDir, "tdd.yaml"), "existing content");

    const { copied, skipped } = await copyWorkflows(testSourceDir, destDir, true);

    expect(copied).toBe(2); // Both files should be copied
    expect(skipped).toBe(0); // Nothing should be skipped

    // Verify existing file was overwritten
    const content = await fs.readFile(path.join(destDir, "tdd.yaml"), 'utf-8');
    expect(content).not.toBe("existing content");

    // Verify it's valid YAML
    const workflow = yaml.parse(content);
    expect(workflow.name).toBe("Test TDD");
  });
});

describe("Workflow Validation", () => {
  test("should validate copied workflow files", async () => {
    const sourceDir = path.join(TEST_HOME, "source-workflows");

    // Ensure source directory exists
    await fs.mkdir(sourceDir, { recursive: true });

    const destDir = path.join(TEST_HOME, "test-validation");
    await fs.mkdir(destDir, { recursive: true });

    await copyWorkflows(sourceDir, destDir);

    // Read and validate each copied file
    const files = await fs.readdir(destDir);
    const yamlFiles = files.filter(f => f.endsWith('.yaml'));

    for (const file of yamlFiles) {
      const content = await fs.readFile(path.join(destDir, file), 'utf-8');
      const workflow = yaml.parse(content);

      // Validate workflow structure
      expect(workflow.name).toBeTruthy();
      expect(workflow.description).toBeTruthy();
      expect(Array.isArray(workflow.phases)).toBe(true);
      expect(workflow.phases.length).toBeGreaterThan(0);

      // Validate each phase
      for (const phase of workflow.phases) {
        expect(phase.name).toBeTruthy();
        expect(phase.guidance).toBeTruthy();
        expect(Array.isArray(phase.suggestions)).toBe(true);
      }
    }
  });
});

describe("Directory Operations", () => {
  test("should handle concurrent directory creation", async () => {
    const baseDir = path.join(TEST_HOME, "concurrent-test");

    // Try to create the same directory multiple times concurrently
    const promises = Array(5).fill(0).map(() =>
      fs.mkdir(baseDir, { recursive: true })
    );

    // Should not throw errors
    await Promise.all(promises);

    expect(await fileExists(baseDir)).toBe(true);
  });

  test("should list YAML files correctly", async () => {
    const testDir = path.join(TEST_HOME, "yaml-test");
    await fs.mkdir(testDir, { recursive: true });

    // Create various file types
    await fs.writeFile(path.join(testDir, "workflow1.yaml"), "test: content");
    await fs.writeFile(path.join(testDir, "workflow2.yml"), "test: content");
    await fs.writeFile(path.join(testDir, "config.json"), "{}");
    await fs.writeFile(path.join(testDir, "readme.txt"), "readme");

    const files = await fs.readdir(testDir);
    const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    expect(yamlFiles).toHaveLength(2);
    expect(yamlFiles).toContain("workflow1.yaml");
    expect(yamlFiles).toContain("workflow2.yml");
    expect(yamlFiles).not.toContain("config.json");
    expect(yamlFiles).not.toContain("readme.txt");
  });
});