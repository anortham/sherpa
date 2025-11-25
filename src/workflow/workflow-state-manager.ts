import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { WorkflowState } from "../types";

/** Hours before workflow state is considered stale */
const STATE_EXPIRY_HOURS = 24;

/**
 * Manages workflow state persistence and restoration
 * Handles saving/loading workflow progress across sessions
 */
export class WorkflowStateManager {
  private workflowStateFile: string;
  private sherpaHome: string;

  constructor(
    private log: (level: string, message: string) => void,
    customSherpaHome?: string
  ) {
    this.sherpaHome = customSherpaHome || path.join(os.homedir(), ".sherpa");
    this.workflowStateFile = path.join(this.sherpaHome, "workflow-state.json");
  }

  /**
   * Saves current workflow state to persistent storage using atomic write
   * (write to temp file, then rename to avoid partial writes)
   */
  async saveWorkflowState(
    currentWorkflow: string,
    currentPhase: number,
    phaseProgress: Map<string, string[]>
  ): Promise<void> {
    const state: WorkflowState = {
      currentWorkflow,
      currentPhase,
      phaseProgress: Object.fromEntries(phaseProgress),
      lastUpdated: new Date(),
      sessionStartTime: new Date()
    };

    const tempFile = `${this.workflowStateFile}.tmp`;

    try {
      // Ensure directory exists
      await fs.mkdir(this.sherpaHome, { recursive: true });

      // Write to temp file first
      await fs.writeFile(tempFile, JSON.stringify(state, null, 2));

      // Atomic rename to final location
      await fs.rename(tempFile, this.workflowStateFile);

      this.log("DEBUG", `Workflow state saved: ${currentWorkflow} phase ${currentPhase}`);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
      this.log("WARN", `Failed to save workflow state: ${error}`);
      throw error; // Re-throw so caller knows save failed
    }
  }

  /**
   * Loads workflow state from persistent storage
   * Returns null if no valid state exists
   */
  async loadWorkflowState(): Promise<{
    currentWorkflow: string;
    currentPhase: number;
    phaseProgress: Map<string, string[]>;
  } | null> {
    try {
      const content = await fs.readFile(this.workflowStateFile, 'utf-8');
      const state: WorkflowState = JSON.parse(content);

      // Only restore state if it's recent to avoid stale state
      const lastUpdated = new Date(state.lastUpdated);
      const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);

      if (hoursSinceUpdate < STATE_EXPIRY_HOURS) {
        this.log("INFO", `Restored workflow state: ${state.currentWorkflow} phase ${state.currentPhase}`);
        return {
          currentWorkflow: state.currentWorkflow,
          currentPhase: state.currentPhase,
          phaseProgress: new Map(Object.entries(state.phaseProgress))
        };
      } else {
        this.log("INFO", "Workflow state too old, starting fresh");
        await this.clearWorkflowState();
        return null;
      }
    } catch (error) {
      // No existing state file or invalid - start fresh
      this.log("DEBUG", "No existing workflow state found, starting fresh");
      return null;
    }
  }

  /**
   * Clears workflow state file and resets to defaults
   */
  async clearWorkflowState(): Promise<void> {
    try {
      await fs.unlink(this.workflowStateFile);
    } catch (error) {
      // File doesn't exist - that's fine
    }
  }
}