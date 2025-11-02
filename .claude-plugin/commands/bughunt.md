---
name: bughunt
description: Start Bug Hunt workflow for systematic debugging with detective-like investigation
---

# Bug Hunt Workflow Command

Activate the Bug Hunt workflow for systematic, test-driven debugging.

## Task

1. **Activate Bug Hunt workflow:**
   ```
   approach({ workflow: "bug-hunt" })
   ```

2. **Present the workflow activation:**
   Show the user:
   - Workflow description
   - Current phase (Phase 1: Reproduce & Isolate)
   - Initial guidance
   - Detective-themed encouragement

3. **Begin guidance cycle:**
   ```
   guide()
   ```

4. **Explain the bug hunt process:**
   ```markdown
   🔍 Bug Hunt Workflow Activated

   **4 Phases:**
   1. 🔍 Reproduce & Isolate - Reliably trigger the bug
   2. ✅ Capture in Test - Write a failing test that demonstrates the bug
   3. 🔧 Fix the Bug - Minimal fix to make the test pass
   4. ✅ Verify & Prevent - Confirm fix and prevent regression

   **Current Phase:** Reproduce & Isolate

   [Detailed guidance from guide() call]

   ---
   Time to put on your detective hat! 🕵️ Let's hunt this bug down.
   ```

## Example Output

```markdown
🔍 Bug Hunt Workflow - Systematic Debugging

**Phase 1: Reproduce & Isolate**

Find a way to reliably trigger the bug. The best debugging starts with
consistent reproduction.

**What to do:**
- Identify exact steps to reproduce
- Isolate the problematic code path
- Gather error messages and stack traces
- Determine what's expected vs actual behavior

**Detective work:**
- What conditions trigger the bug?
- Is it consistent or intermittent?
- What's the minimal reproduction case?

---

🕵️ The game is afoot! Every great fix starts with understanding the crime scene.

**Next steps:**
1. Reproduce the bug reliably
2. Once isolated, I'll guide you to capture it in a test
3. Then we'll fix it properly with test protection
```

## Key Behaviors

- Use detective/investigation metaphors
- Emphasize systematic approach
- Guide toward test-driven bug fixing
- Celebrate discoveries along the way

## Integration with Code Tools

Bug Hunt works great with:
- **Julie** - Trace execution paths, find references
- **Goldfish** - Checkpoint discoveries and investigation steps
- **Git bisect** - Find when bug was introduced

Suggest these tools when appropriate:
```
"Use Julie's trace_call_path to follow the execution flow"
"Checkpoint your investigation findings with Goldfish"
```

## Error Handling

- If Sherpa server not available, explain setup needed
- If workflow activation fails, provide troubleshooting
