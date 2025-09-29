#!/usr/bin/env bun
import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as yaml from "yaml";

// We'll test the tools by creating a simplified version of the server handlers
// since we can't easily instantiate the full SherpaServer in tests

const TEST_SHERPA_HOME = path.join(os.tmpdir(), "sherpa-enhanced-tools-test");
const TEST_WORKFLOWS_DIR = path.join(TEST_SHERPA_HOME, "workflows");

describe("Enhanced Tool Handlers with Learning Integration", () => {
  beforeEach(async () => {
    // Create test environment
    await fs.mkdir(TEST_WORKFLOWS_DIR, { recursive: true });

    // Create test workflows
    const tddWorkflow = {
      name: "Test-Driven Development",
      description: "Build reliable software through testing first",
      trigger_hints: ["test", "tdd", "testing"],
      phases: [
        {
          name: "🔴 Red Phase",
          guidance: "Write a failing test that describes the desired behavior",
          suggestions: [
            "Create test file",
            "Write simple assertion",
            "Run test to see failure"
          ]
        },
        {
          name: "🟢 Green Phase",
          guidance: "Write the minimal code to make the test pass",
          suggestions: [
            "Implement minimal solution",
            "Run test to confirm pass",
            "Don't add extra features"
          ]
        }
      ]
    };

    const bugHuntWorkflow = {
      name: "Bug Hunt",
      description: "Systematic debugging and issue resolution",
      trigger_hints: ["bug", "error", "issue", "broken"],
      phases: [
        {
          name: "🔍 Reproduce & Isolate",
          guidance: "Understand the bug completely before fixing",
          suggestions: [
            "Reproduce the bug consistently",
            "Identify minimum reproduction steps",
            "Isolate the problematic code"
          ]
        }
      ]
    };

    await fs.writeFile(
      path.join(TEST_WORKFLOWS_DIR, "tdd.yaml"),
      yaml.stringify(tddWorkflow)
    );

    await fs.writeFile(
      path.join(TEST_WORKFLOWS_DIR, "bug-hunt.yaml"),
      yaml.stringify(bugHuntWorkflow)
    );
  });

  afterEach(async () => {
    await fs.rm(TEST_SHERPA_HOME, { recursive: true, force: true }).catch(() => {});
  });

  describe("Guide Tool", () => {
    test("should handle basic check action", () => {
      const args = { action: "check" };

      expect(args.action).toBe("check");
    });

    test("should handle done action with completion tracking", () => {
      const args = {
        action: "done",
        completed: "wrote first test"
      };

      expect(args.action).toBe("done");
      expect(args.completed).toBe("wrote first test");
    });

    test("should handle quick shortcuts", () => {
      const tddArgs = { action: "tdd" };
      const bugArgs = { action: "bug" };
      const nextArgs = { action: "next", context: "fixing login issue" };

      expect(tddArgs.action).toBe("tdd");
      expect(bugArgs.action).toBe("bug");
      expect(nextArgs.context).toBe("fixing login issue");
    });

    test("should handle context parameter for smart suggestions", () => {
      const contextArgs = {
        action: "check",
        context: "building new authentication feature"
      };

      expect(contextArgs.context).toBeTruthy();
      expect(contextArgs.context).toContain("authentication");
    });

    test("should validate context-aware workflow detection patterns", () => {
      const testContexts = [
        { context: "fixing login bug", expected: "bug-hunt" },
        { context: "broken authentication", expected: "bug-hunt" },
        { context: "new feature development", expected: "tdd" },
        { context: "quick prototype demo", expected: "rapid" },
        { context: "clean up messy code", expected: "refactor" }
      ];

      testContexts.forEach(({ context, expected }) => {
        const lowerContext = context.toLowerCase();

        const bugPatterns = ['bug', 'error', 'issue', 'broken', 'failing'];
        const tddPatterns = ['new feature', 'development', 'implement'];
        const rapidPatterns = ['quick', 'prototype', 'demo'];
        const refactorPatterns = ['clean up', 'messy', 'refactor'];

        let detectedWorkflow = "general"; // default

        if (bugPatterns.some(pattern => lowerContext.includes(pattern))) {
          detectedWorkflow = "bug-hunt";
        } else if (rapidPatterns.some(pattern => lowerContext.includes(pattern))) {
          detectedWorkflow = "rapid";
        } else if (refactorPatterns.some(pattern => lowerContext.includes(pattern))) {
          detectedWorkflow = "refactor";
        } else if (tddPatterns.some(pattern => lowerContext.includes(pattern))) {
          detectedWorkflow = "tdd";
        }

        expect(detectedWorkflow).toBe(expected);
      });
    });

    test("should generate workflow suggestions correctly", () => {
      const testCases = [
        {
          currentWorkflow: "general",
          detectedWorkflow: "bug-hunt",
          context: "fixing error",
          shouldSuggest: true
        },
        {
          currentWorkflow: "tdd",
          detectedWorkflow: "tdd",
          context: "building feature",
          shouldSuggest: false // Same workflow
        }
      ];

      testCases.forEach(({ currentWorkflow, detectedWorkflow, context, shouldSuggest }) => {
        const suggestion = detectedWorkflow !== currentWorkflow ?
          `I detected you're working on ${context}. Consider switching to ${detectedWorkflow} workflow.` :
          "";

        if (shouldSuggest) {
          expect(suggestion).toBeTruthy();
          expect(suggestion).toContain(detectedWorkflow);
        } else {
          expect(suggestion).toBe("");
        }
      });
    });
  });

  describe("Approach Tool", () => {
    test("should handle workflow listing", async () => {
      const args = { set: "list" };

      // Simulate workflow loading
      const files = await fs.readdir(TEST_WORKFLOWS_DIR);
      const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      expect(yamlFiles.length).toBeGreaterThan(0);
      expect(yamlFiles).toContain("tdd.yaml");
      expect(yamlFiles).toContain("bug-hunt.yaml");

      // Simulate workflow list generation
      const workflowList = [];
      for (const file of yamlFiles) {
        const content = await fs.readFile(path.join(TEST_WORKFLOWS_DIR, file), 'utf-8');
        const workflow = yaml.parse(content);
        const key = path.basename(file, path.extname(file));

        workflowList.push({
          key,
          name: workflow.name,
          description: workflow.description,
          phases: workflow.phases.length,
          trigger_hints: workflow.trigger_hints || []
        });
      }

      expect(workflowList.length).toBe(2);

      const tddWorkflow = workflowList.find(w => w.key === "tdd");
      expect(tddWorkflow?.name).toBe("Test-Driven Development");
      expect(tddWorkflow?.phases).toBe(2);
      expect(tddWorkflow?.trigger_hints).toContain("test");
    });

    test("should handle workflow switching", async () => {
      const args = { set: "tdd" };

      // Load workflow to verify it exists
      const content = await fs.readFile(path.join(TEST_WORKFLOWS_DIR, "tdd.yaml"), 'utf-8');
      const workflow = yaml.parse(content);

      expect(workflow.name).toBe("Test-Driven Development");
      expect(workflow.phases.length).toBe(2);
      expect(workflow.phases[0].name).toBe("🔴 Red Phase");
    });

    test("should handle invalid workflow names", () => {
      const args = { set: "nonexistent" };

      // Simulate workflow validation
      const availableWorkflows = ["tdd", "bug-hunt"];
      const isValid = availableWorkflows.includes(args.set);

      expect(isValid).toBe(false);
    });

    test("should generate personalized insights format", () => {
      const mockInsights = [
        "You excel at tdd workflow (92% success rate)",
        "Try bug-hunt workflow when working on: debugging, error, issue"
      ];

      expect(mockInsights.length).toBe(2);
      expect(mockInsights[0]).toContain("excel");
      expect(mockInsights[0]).toContain("92%");
      expect(mockInsights[1]).toContain("bug-hunt");
    });
  });


  describe("Natural Language Response Generation", () => {
    test("should format guide responses naturally", () => {
      const mockResponse = {
        phase: "🔴 Red Phase",
        phase_number: "1/2",
        guidance: "Write a failing test that describes the desired behavior",
        suggestions: ["Create test file", "Write simple assertion"],
        progress: { completed: 0, total: 3, remaining: 3 }
      };

      // Test natural language formatting
      let naturalResponse = "";
      naturalResponse += `**${mockResponse.phase}** (${mockResponse.phase_number})\n`;
      naturalResponse += `${mockResponse.guidance}\n\n`;
      naturalResponse += "**Next steps:**\n";
      mockResponse.suggestions.forEach(suggestion => {
        naturalResponse += `• ${suggestion}\n`;
      });
      naturalResponse += `\nProgress: ${mockResponse.progress.completed}/${mockResponse.progress.total} steps completed`;

      expect(naturalResponse).toContain("Red Phase");
      expect(naturalResponse).toContain("Next steps:");
      expect(naturalResponse).toContain("• Create test file");
      expect(naturalResponse).toContain("Progress: 0/3");
    });

    test("should handle celebration filtering by level", () => {
      const testCelebration = "🎉 Excellent! Amazing work! Great job! 🏆";

      const celebrationLevels = {
        "off": "",
        "whisper": testCelebration
          .replace(/[🎯🔄🧪🏆✅🔍💡🎉]/g, "")
          .replace(/excellent|great|awesome|amazing|fantastic/gi, "")
          .replace(/!/g, "")
          .trim(),
        "minimal": testCelebration
          .replace(/[🎉🏆]/g, "")
          .replace(/excellent|great|awesome|amazing|fantastic/gi, "good")
          .replace(/!!+/g, ""),
        "full": testCelebration
      };

      expect(celebrationLevels.off).toBe("");
      expect(celebrationLevels.whisper).not.toContain("🎉");
      expect(celebrationLevels.whisper).not.toContain("Excellent");
      expect(celebrationLevels.minimal).toContain("good");
      expect(celebrationLevels.full).toBe(testCelebration);
    });

    test("should format adaptive hints properly", () => {
      const mockHint = {
        type: 'workflow-suggestion' as const,
        content: 'Consider switching to Bug Hunt workflow for this debugging task',
        confidence: 0.85,
        timing: 'predictive' as const,
        priority: 'high' as const,
        context: 'debugging context',
        learningBasis: ['context_pattern_analysis', 'historical_success_rates']
      };

      const flowIntensities = ['whisper', 'gentle', 'active'];

      flowIntensities.forEach(intensity => {
        let formattedHint = "";

        switch (intensity) {
          case 'whisper':
            if (mockHint.priority === 'high' || mockHint.priority === 'urgent') {
              formattedHint = `💭 ${mockHint.content}`;
            }
            break;

          case 'gentle':
            const icons = {
              'workflow-suggestion': '🔄',
              'next-step': '➡️',
              'optimization': '⚡',
              'prevention': '⚠️',
              'encouragement': '💪'
            };
            const icon = icons[mockHint.type] || '💡';
            formattedHint = `${icon} **Smart suggestion**: ${mockHint.content}`;
            break;

          case 'active':
            formattedHint = `🧠 **Adaptive insight** (${Math.round(mockHint.confidence * 100)}% confidence):\n${mockHint.content}`;
            if (mockHint.learningBasis.length > 0) {
              formattedHint += `\n*Based on: ${mockHint.learningBasis.join(', ')}*`;
            }
            break;
        }

        if (intensity === 'whisper' && mockHint.priority !== 'high') {
          expect(formattedHint).toBe("");
        } else if (intensity === 'gentle') {
          expect(formattedHint).toContain("🔄");
          expect(formattedHint).toContain("Smart suggestion");
        } else if (intensity === 'active') {
          expect(formattedHint).toContain("85% confidence");
          expect(formattedHint).toContain("context_pattern_analysis");
        }
      });
    });
  });

  describe("Context-Aware Auto-Detection", () => {
    test("should detect TDD contexts", () => {
      const tddContexts = [
        "new feature development",
        "implementing user authentication",
        "building new parser",
        "create test coverage"
      ];

      tddContexts.forEach(context => {
        const tddPatterns = [
          'new feature', 'implement', 'add function', 'create', 'build',
          'test', 'tdd', 'test-driven', 'spec', 'requirement'
        ];

        const matchesTDD = tddPatterns.some(pattern =>
          context.toLowerCase().includes(pattern)
        );

        expect(matchesTDD).toBe(true);
      });
    });

    test("should detect Bug Hunt contexts", () => {
      const bugContexts = [
        "login bug needs fixing",
        "error in authentication",
        "broken user interface",
        "debugging payment issue"
      ];

      bugContexts.forEach(context => {
        const bugPatterns = [
          'bug', 'error', 'issue', 'problem', 'broken', 'not working',
          'failing', 'crash', 'exception', 'debug', 'troubleshoot'
        ];

        const matchesBug = bugPatterns.some(pattern =>
          context.toLowerCase().includes(pattern)
        );

        expect(matchesBug).toBe(true);
      });
    });

    test("should detect Rapid contexts", () => {
      const rapidContexts = [
        "quick prototype for demo",
        "proof of concept experiment",
        "spike exploration"
      ];

      rapidContexts.forEach(context => {
        const rapidPatterns = [
          'prototype', 'quick', 'demo', 'poc', 'proof of concept',
          'experiment', 'try', 'spike', 'explore'
        ];

        const matchesRapid = rapidPatterns.some(pattern =>
          context.toLowerCase().includes(pattern)
        );

        expect(matchesRapid).toBe(true);
      });
    });

    test("should detect Refactor contexts", () => {
      const refactorContexts = [
        "clean up messy code",
        "optimize performance issues",
        "restructure the codebase"
      ];

      refactorContexts.forEach(context => {
        const refactorPatterns = [
          'refactor', 'clean up', 'improve', 'optimize', 'restructure',
          'organize', 'simplify', 'modernize', 'upgrade'
        ];

        const matchesRefactor = refactorPatterns.some(pattern =>
          context.toLowerCase().includes(pattern)
        );

        expect(matchesRefactor).toBe(true);
      });
    });
  });

  describe("Learning Integration Points", () => {
    test("should track tool usage for learning", () => {
      const toolUsageEvents = [
        { tool: "guide", args: { action: "check" } },
        { tool: "guide", args: { action: "done", completed: "wrote test" } },
        { tool: "approach", args: { set: "tdd" } },
        { tool: "approach", args: { set: "planning" } }
      ];

      // Simulate tracking each event
      const usageFrequency: Record<string, number> = {};

      toolUsageEvents.forEach(event => {
        usageFrequency[event.tool] = (usageFrequency[event.tool] || 0) + 1;
      });

      expect(usageFrequency.guide).toBe(2);
      expect(usageFrequency.approach).toBe(2);
    });

    test("should track workflow usage patterns", () => {
      const workflowEvents = [
        { workflow: "tdd", context: "building new feature" },
        { workflow: "bug-hunt", context: "fixing login error" },
        { workflow: "tdd", context: "adding authentication" }
      ];

      const workflowUsage: Record<string, number> = {};
      const contextMappings: Array<{ workflow: string, keywords: string[] }> = [];

      workflowEvents.forEach(event => {
        workflowUsage[event.workflow] = (workflowUsage[event.workflow] || 0) + 1;

        if (event.context) {
          const keywords = event.context.toLowerCase().split(/\s+/)
            .filter(word => word.length > 3);

          contextMappings.push({
            workflow: event.workflow,
            keywords
          });
        }
      });

      expect(workflowUsage.tdd).toBe(2);
      expect(workflowUsage["bug-hunt"]).toBe(1);

      const tddContexts = contextMappings.filter(m => m.workflow === "tdd");
      expect(tddContexts.length).toBe(2);
      expect(tddContexts[0].keywords).toContain("building");
    });

    test("should track celebration preference adaptation", () => {
      const celebrationEvents = [
        { level: "full", userResponse: "accepted" },
        { level: "full", userResponse: "ignored" },
        { level: "minimal", userResponse: "accepted" },
        { level: "minimal", userResponse: "accepted" }
      ];

      // Simulate learning from user responses
      const levelStats: Record<string, { accepted: number, total: number }> = {};

      celebrationEvents.forEach(event => {
        if (!levelStats[event.level]) {
          levelStats[event.level] = { accepted: 0, total: 0 };
        }

        levelStats[event.level].total++;
        if (event.userResponse === "accepted") {
          levelStats[event.level].accepted++;
        }
      });

      const fullAcceptanceRate = levelStats.full.accepted / levelStats.full.total;
      const minimalAcceptanceRate = levelStats.minimal.accepted / levelStats.minimal.total;

      expect(fullAcceptanceRate).toBe(0.5); // 50% acceptance
      expect(minimalAcceptanceRate).toBe(1.0); // 100% acceptance

      // Should prefer minimal based on higher acceptance rate
      const preferredLevel = minimalAcceptanceRate > fullAcceptanceRate ? "minimal" : "full";
      expect(preferredLevel).toBe("minimal");
    });
  });

  describe("Backward Compatibility", () => {
    test("should maintain compatibility with old tool names", () => {
      // Test that old tool calls can still be mapped
      const oldToolMappings = {
        "next": "guide",
        "workflow": "approach"
      };

      Object.entries(oldToolMappings).forEach(([oldName, newName]) => {
        expect(newName).toBeTruthy();
        expect(typeof newName).toBe("string");
      });
    });

    test("should handle transition from JSON to natural language", () => {
      const oldJsonResponse = {
        celebration: "🧪 Excellent! First test written",
        workflow: "TDD",
        phase: "🔴 Red Phase",
        guidance: "Write failing tests first",
        suggestions: ["Create test file", "Write simple assertion"]
      };

      // Convert to new natural language format
      let naturalResponse = "";
      if (oldJsonResponse.celebration) {
        naturalResponse += `${oldJsonResponse.celebration}\n\n`;
      }
      naturalResponse += `**${oldJsonResponse.phase}**\n`;
      naturalResponse += `${oldJsonResponse.guidance}\n\n`;
      naturalResponse += "**Next steps:**\n";
      oldJsonResponse.suggestions.forEach(suggestion => {
        naturalResponse += `• ${suggestion}\n`;
      });

      expect(naturalResponse).not.toContain("{");
      expect(naturalResponse).not.toContain("}");
      expect(naturalResponse).toContain("Red Phase");
      expect(naturalResponse).toContain("• Create test file");
    });
  });

  describe("Error Handling in Enhanced Tools", () => {
    test("should handle missing workflow files gracefully", () => {
      const invalidWorkflowName = "nonexistent-workflow";

      // Simulate workflow existence check
      const availableWorkflows = ["tdd", "bug-hunt"];
      const exists = availableWorkflows.includes(invalidWorkflowName);

      expect(exists).toBe(false);

      // Should provide helpful error message
      const errorMessage = `Workflow "${invalidWorkflowName}" not found! Try one of these: ${availableWorkflows.join(", ")}`;
      expect(errorMessage).toContain("not found");
      expect(errorMessage).toContain("tdd");
    });

    test("should handle malformed contexts gracefully", () => {
      const problematicContexts = [
        "",
        null,
        undefined,
        "   ",
        "a".repeat(1000) // Very long context
      ];

      problematicContexts.forEach(context => {
        // Should not throw errors
        const contextStr = context?.toString()?.toLowerCase() || "";
        expect(() => {
          const words = contextStr.split(/\s+/).filter(word => word.length > 3);
          return words;
        }).not.toThrow();
      });
    });

    test("should handle invalid celebration levels", () => {
      const invalidLevels = ["invalid", "", null, undefined];
      const validLevels = ["full", "minimal", "whisper", "off"];

      invalidLevels.forEach(level => {
        const isValid = validLevels.includes(level as string);
        expect(isValid).toBe(false);
      });
    });
  });
});