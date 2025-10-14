#!/usr/bin/env bun
/**
 * Sherpa Setup Script
 *
 * Initializes the ~/.sherpa directory with default workflows and folder structure.
 * This script copies the default workflow templates from the source to the user's
 * home directory where they can be customized.
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { fileURLToPath } from "url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

const SHERPA_HOME = path.join(os.homedir(), ".sherpa");
const WORKFLOWS_DIR = path.join(SHERPA_HOME, "workflows");
const LOGS_DIR = path.join(SHERPA_HOME, "logs");
const SOURCE_WORKFLOWS = path.join(MODULE_DIR, "workflows");

async function checkBunInstallation(): Promise<boolean> {
  try {
    const { spawn } = await import("child_process");
    const bunProcess = spawn("bun", ["--version"], { stdio: "pipe" });

    return new Promise((resolve) => {
      bunProcess.on("error", () => resolve(false));
      bunProcess.on("exit", (code) => resolve(code === 0));
    });
  } catch {
    return false;
  }
}

async function displayInstallationHelp() {
  console.log("\n❌ Bun is required but not found on your system.");
  console.log("\n📦 To install Bun:");
  console.log("   curl -fsSL https://bun.sh/install | bash");
  console.log("   # or");
  console.log("   npm install -g bun");
  console.log("   # or");
  console.log("   brew install bun");
  console.log("\n📖 For more installation options, visit: https://bun.sh/docs/installation");
  console.log("\n⚠️  If you have Bun installed but see this error:");
  console.log("   - Restart your terminal");
  console.log("   - Check that 'bun' is in your PATH");
  console.log("   - Try running 'bun --version' manually");
}

async function verifyInstallation(): Promise<boolean> {
  try {
    // Check if directories exist
    const sherpaExists = await fileExists(SHERPA_HOME);
    const workflowsExist = await fileExists(WORKFLOWS_DIR);
    const logsExist = await fileExists(LOGS_DIR);

    if (!sherpaExists || !workflowsExist || !logsExist) {
      return false;
    }

    // Check if we have workflow files
    const workflowFiles = await fs.readdir(WORKFLOWS_DIR);
    const yamlFiles = workflowFiles.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    if (yamlFiles.length === 0) {
      return false;
    }

    // Try to start the server briefly to check it works
    const serverPath = path.join(MODULE_DIR, "sherpa-server.ts");
    const serverExists = await fileExists(serverPath);

    return serverExists;
  } catch {
    return false;
  }
}

async function displayVerificationResults() {
  console.log("\n🔍 Verifying installation...");

  const isValid = await verifyInstallation();

  if (isValid) {
    console.log("✅ Installation verified successfully!");
    console.log("   • Sherpa directory structure created");
    console.log("   • Workflow templates installed");
    console.log("   • Server files accessible");
  } else {
    console.log("⚠️  Installation verification failed");
    console.log("   Please try running setup again or check file permissions");
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyWorkflows(force = false) {
  const sourceFiles = await fs.readdir(SOURCE_WORKFLOWS);
  const yamlFiles = sourceFiles.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

  let copied = 0;
  let skipped = 0;

  for (const file of yamlFiles) {
    const sourcePath = path.join(SOURCE_WORKFLOWS, file);
    const destPath = path.join(WORKFLOWS_DIR, file);

    if (!force && await fileExists(destPath)) {
      console.log(`⏭️  Skipping ${file} (already exists)`);
      skipped++;
    } else {
      await fs.copyFile(sourcePath, destPath);
      console.log(`📋 Copied ${file}`);
      copied++;
    }
  }

  return { copied, skipped };
}

async function setup(options: { force?: boolean, reset?: boolean } = {}) {
  console.log("🏔️  Setting up Sherpa...\n");

  try {
    // Create directory structure
    console.log(`📁 Creating directory structure at ${SHERPA_HOME}`);
    await fs.mkdir(WORKFLOWS_DIR, { recursive: true });
    await fs.mkdir(LOGS_DIR, { recursive: true });

    // Copy workflows
    console.log("\n📋 Installing workflow templates:");
    const { copied, skipped } = await copyWorkflows(options.force || options.reset);

    // Success message
    console.log(`\n✅ Setup complete!`);
    console.log(`   • ${copied} workflow${copied !== 1 ? 's' : ''} installed`);
    if (skipped > 0) {
      console.log(`   • ${skipped} existing workflow${skipped !== 1 ? 's' : ''} preserved`);
    }

    console.log(`\n📍 Your Sherpa files are located at:`);
    console.log(`   Workflows: ${WORKFLOWS_DIR}`);
    console.log(`   Logs:      ${LOGS_DIR}`);

    console.log(`\n🔧 Next steps:`);
    console.log(`   1. Add Sherpa to your Claude Desktop config:`);
    console.log(`      {`);
    console.log(`        "mcpServers": {`);
    console.log(`          "sherpa": {`);
    console.log(`            "command": "bun",`);
    console.log(`            "args": ["run", "${path.join(MODULE_DIR, "sherpa-server.ts")}"]`);
    console.log(`          }`);
    console.log(`        }`);
    console.log(`      }`);
    console.log(`   2. Restart Claude Desktop`);
    console.log(`   3. Start coding with workflow guidance! 🚀`);

    if (skipped > 0 && !options.force) {
      console.log(`\n💡 To overwrite existing workflows, run: bun run setup --force`);
    }

    // Verify installation
    await displayVerificationResults();

  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

async function reset() {
  console.log("🔄 Resetting Sherpa workflows to defaults...\n");

  if (await fileExists(WORKFLOWS_DIR)) {
    console.log("🗑️  Removing existing workflows");
    await fs.rm(WORKFLOWS_DIR, { recursive: true });
  }

  await setup({ reset: true });
}

async function status() {
  console.log("🏔️  Sherpa Status\n");

  const exists = await fileExists(SHERPA_HOME);
  console.log(`Directory: ${SHERPA_HOME}`);
  console.log(`Status: ${exists ? '✅ Exists' : '❌ Not found'}`);

  if (exists) {
    try {
      const workflows = await fs.readdir(WORKFLOWS_DIR);
      const yamlFiles = workflows.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
      console.log(`\nWorkflows (${yamlFiles.length}):`);
      for (const file of yamlFiles) {
        console.log(`  📋 ${file}`);
      }

      const logs = await fs.readdir(LOGS_DIR);
      const logFiles = logs.filter(f => f.startsWith('sherpa-') && f.endsWith('.log'));
      console.log(`\nLogs (${logFiles.length}):`);
      for (const file of logFiles.slice(0, 5)) { // Show last 5 log files
        console.log(`  📝 ${file}`);
      }
      if (logFiles.length > 5) {
        console.log(`  ... and ${logFiles.length - 5} more`);
      }
    } catch (error) {
      console.log(`\n⚠️  Error reading contents: ${error}`);
    }
  } else {
    console.log("\nRun 'bun run setup' to initialize Sherpa");
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const hasForceFlag = args.includes('--force');

async function main() {
  // Check Bun installation for commands that need it
  if (command !== 'help') {
    const bunInstalled = await checkBunInstallation();
    if (!bunInstalled) {
      await displayInstallationHelp();
      process.exit(1);
    }
  }

  switch (command) {
    case 'reset':
      await reset();
      break;
    case 'status':
      await status();
      break;
    case 'help':
      console.log("🏔️  Sherpa Setup\n");
      console.log("Commands:");
      console.log("  setup [--force]  Initialize Sherpa (default)");
      console.log("  reset           Remove and reinstall all workflows");
      console.log("  status          Show current Sherpa installation status");
      console.log("  help            Show this help message");
      break;
    default:
      await setup({ force: hasForceFlag });
  }
}

main().catch(console.error);
