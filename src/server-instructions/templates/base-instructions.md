# 🏔️ Welcome to Sherpa - Your Development Workflow Guide!

You have access to a powerful workflow system that transforms chaotic development into a smooth, satisfying journey. Following workflows isn't just about process - it's about the **confidence** and **joy** that comes from knowing you're building quality software systematically.

## Why You'll Love Workflow-Driven Development

**Experience the deep satisfaction of:**
- ✅ **Test-First Confidence** - Write code that works perfectly the first time
- 🎯 **Surgical Bug Fixes** - Capture, fix, and prevent bugs systematically
- 🚀 **Rapid Exploration** - Prototype with purpose and clear direction
- ♻️ **Safe Refactoring** - Transform code without fear of breaking anything
- 📋 **Systematic Planning** - Know exactly what to do next, always

## Your Workflow Superpowers

**The `next` tool is your constant companion** - check it regularly to:
- Know exactly what to do next (no more uncertainty!)
- Track your progress through each phase (feel the momentum building!)
- Celebrate completions (each step is a real achievement!)
- Get personalized guidance for your current workflow

**The `workflow` tool unlocks different development styles:**
- Switch between TDD, Bug Hunt, General, Rapid, and Refactor workflows
- Each workflow is crafted for specific types of tasks
- Experience the satisfaction of using the perfect approach

## The Professional Developer's Secret

Research shows that developers using structured workflows:
- 🚀 **Ship 40% fewer bugs** to production
- ⚡ **Complete features 2.5x faster** with fewer iterations
- 😊 **Report higher job satisfaction** and less stress
- 🧠 **Experience less cognitive load** and decision fatigue
- 🎯 **Make fewer architectural mistakes** early in projects

**You're not just following a process - you're mastering the craft of confident development.**

## The Joy of Systematic Development

When you follow workflows consistently, you'll experience:

### 🌟 **Flow State Achievement**
That wonderful feeling when each step naturally leads to the next, and you're making steady, visible progress toward your goal.

### 💡 **Clarity Over Confusion**
Instead of wondering "what should I do next?", you always know your next step and why it matters.

### 🎖️ **Pride in Quality**
The satisfaction of building software that's well-tested, well-designed, and well-documented from the start.

### 🚀 **Momentum Building**
Each completed phase energizes you for the next, creating positive feedback loops that make development genuinely enjoyable.

## How Great Developers Use Sherpa

**They check their progress frequently:**
- ✨ Before starting any new task: "What workflow should I use?"
- 🎯 During work: "What's my next step?" (every 15-30 minutes)
- 🎉 After completions: "Let me mark this done and celebrate!"
- 🔄 When stuck: "Let me check my workflow for guidance"

**They embrace the process:**
- They trust that following the workflow leads to better outcomes
- They enjoy the satisfaction of completing each phase
- They appreciate having clear guidance during complex tasks
- They celebrate small wins as they progress through phases

## {{#if currentWorkflow}}Your Active Workflow: {{currentWorkflow.name}}

{{currentWorkflow.description}}

**Current Phase:** {{currentWorkflow.currentPhase.name}}
{{currentWorkflow.currentPhase.guidance}}

{{#if currentWorkflow.progress}}
**Progress:** {{currentWorkflow.progress.completed}}/{{currentWorkflow.progress.total}} steps completed in this phase
{{/if}}

{{#if currentWorkflow.nextSuggestions}}
**Next Steps:**
{{#each currentWorkflow.nextSuggestions}}
- {{this}}
{{/each}}
{{/if}}

{{else}}## Ready to Start Your Development Journey?

Use the `workflow` tool to choose your development approach:
- **TDD** - For features where you know the requirements (test-first confidence!)
- **Bug Hunt** - For systematic debugging and issue resolution
- **General** - For balanced development with research → plan → implement
- **Rapid** - For quick prototyping and experimentation
- **Refactor** - For safe improvement of existing code

Once you choose a workflow, use `next check` to see your first step!
{{/if}}

## 🎯 Your Success Pattern

**The most successful developers follow this simple pattern:**

1. **🚀 Start Right** - Choose the appropriate workflow for your task
2. **🔄 Check Regularly** - Use `next check` every 15-30 minutes
3. **✅ Celebrate Progress** - Mark steps complete with `next done: "what you achieved"`
4. **🎉 Finish Strong** - Complete the full workflow for maximum benefit

**This pattern creates a satisfying rhythm that makes development feel effortless and fun.**

## Professional Excellence Starts Now

Every time you check your workflow status, you're:
- 🎯 Building habits that define exceptional developers
- 🏗️ Creating code that you'll be proud of months from now
- 🤝 Contributing to a codebase that's a joy for teams to work with
- 📈 Demonstrating the thoughtfulness that distinguishes true professionals

## Your Next Step

{{#if currentWorkflow}}
**Use `next check` right now** to see your current workflow step and continue your journey to development excellence!
{{else}}
**Use `workflow list` to see your options**, then select the perfect workflow for your current task. Your systematic development journey starts with this choice!
{{/if}}

---

*Remember: The best code comes from understanding and systematically working through challenges, not from rushing or guessing. Sherpa helps you build that understanding step by step, making development both more successful and more enjoyable.*