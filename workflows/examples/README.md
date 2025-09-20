# Example Workflows

This directory contains additional workflow templates that you can copy to your `~/.sherpa/workflows/` directory for specialized use cases.

## Available Examples

### 📚 Documentation (`documentation.yaml`)
Comprehensive workflow for creating and maintaining documentation, guides, and API references.

**Best for:**
- Writing API documentation
- Creating user guides
- Updating README files
- Technical writing projects

### 🔒 Security Audit (`security-audit.yaml`)
Systematic security review workflow focused on defensive security analysis.

**Best for:**
- Security code reviews
- Vulnerability assessments
- Authentication/authorization audits
- Defensive security analysis

### 📈 Performance (`performance.yaml`)
Data-driven approach to identifying and fixing performance bottlenecks.

**Best for:**
- Speed optimization
- Memory usage improvements
- Database query optimization
- Profiling and benchmarking

### 👁️ Code Review (`code-review.yaml`)
Thorough code review process covering quality, architecture, and maintainability.

**Best for:**
- Pull request reviews
- Code quality assessments
- Architecture reviews
- Mentoring junior developers

## How to Use

1. **Copy to your workflow directory:**
   ```bash
   cp ~/.sherpa/workflows/examples/documentation.yaml ~/.sherpa/workflows/
   ```

2. **Use the workflow tool in Claude:**
   ```
   workflow set documentation
   ```

3. **Start your workflow:**
   ```
   next check
   ```

## Customizing Examples

Feel free to modify these workflows to match your team's processes:

1. **Edit trigger hints** - Add keywords that should auto-select this workflow
2. **Adjust phases** - Add, remove, or reorder workflow phases
3. **Customize suggestions** - Make them specific to your tools and practices
4. **Update guidance** - Reflect your team's standards and preferences

## Creating New Workflows

Use these examples as templates for your own specialized workflows:

```yaml
name: "Your Workflow Name"
description: "Brief description of when to use this workflow"
trigger_hints:
  - "keyword1"
  - "keyword2"
phases:
  - name: "📋 Phase Name"
    guidance: "What to focus on in this phase"
    suggestions:
      - "Specific actionable step"
      - "Another helpful suggestion"
```

## Tips

- **Keep phases focused** - Each phase should have a clear objective
- **Make suggestions actionable** - Avoid vague advice
- **Use emojis in phase names** - They help identify phases quickly
- **Test your workflows** - Use them on real projects to refine them