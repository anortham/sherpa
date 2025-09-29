---
allowed-tools: mcp__sherpa__approach
description: Select optimal workflow for your development task
argument-hint: [workflow|list]
---

$if($1 == "list")
**Available Workflows:** Displaying all available development workflows with descriptions and trigger hints.

Using `approach(set="list")` to show all workflow options with personalized suggestions.

$elif($1)
**Setting Workflow:** Switching to the "$1" development approach.

Using `approach(set="$1")` to activate the specified workflow methodology.

This will provide:
- Workflow overview and optimization focus
- First phase guidance and initial steps
- Success inspiration from industry leaders
- Personalized workflow suggestions based on your patterns

$else
**Workflow Selection:** Choose the optimal development approach for your current task.

Using `approach(set="list")` to view all available workflows with detailed descriptions and trigger hints.

**Quick Access:**
- `/approach list` - View all workflows with descriptions
- `/approach <name>` - Switch to specific workflow (e.g. tdd, bug-hunt, general, planning, rapid, refactor)

Each workflow provides structured phases with specific guidance, contextual celebrations, and builds systematic development habits through positive reinforcement.

**Next Steps:** After selecting a workflow, use `/guide` to get your first step and begin systematic development.
$endif