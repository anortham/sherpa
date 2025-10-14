# Contributing to Sherpa MCP Server

Thank you for your interest in contributing to Sherpa! This guide will help you get started.

## 🏔️ Project Vision

Sherpa is the first MCP server to use behavioral psychology and positive reinforcement to guide AI development workflows. Our goal is to create a "liquid experience" - guidance that flows naturally with development like water, without interrupting the creative process.

## 🛠️ Development Setup

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0.0
- Node.js 18+ (for npm compatibility)

### Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/anthropics/sherpa-mcp.git
   cd sherpa-mcp
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Run setup**
   ```bash
   bun run setup
   ```

4. **Run tests**
   ```bash
   bun test
   ```

5. **Start development server**
   ```bash
   bun run dev
   ```

## 🎯 Core Principles

### Behavioral Adoption
- **Positive Reinforcement**: Celebrate progress, don't punish shortcuts
- **Flow State Preservation**: Never interrupt unless providing proportional value
- **Natural Language**: Responses should feel conversational, not robotic
- **Minimal Friction**: Each step between intent and action is a chance to lose adoption

### Technical Excellence
- **Comprehensive Testing**: All features must have robust test coverage
- **Error Recovery**: Graceful handling of all failure scenarios
- **Cross-Session Learning**: Persistent behavioral adaptation
- **TypeScript Safety**: Strong typing throughout the codebase

## 📁 Project Structure

```
sherpa/
├── sherpa-server.ts           # Main MCP server
├── setup.ts                   # Global installation script
├── src/
│   ├── types.ts              # TypeScript interfaces
│   ├── behavioral-adoption/   # Behavioral psychology system
│   │   ├── adaptive-learning-engine.ts
│   │   ├── progress-tracker.ts
│   │   └── celebration-generator.ts
│   ├── instruction-builder/   # Dynamic instruction generation
│   │   ├── base-instructions.ts
│   │   └── tool-descriptions.ts
│   ├── server-instructions/   # Template system
│   │   └── templates/
│   ├── handlers/              # Tool request handlers
│   ├── state/                 # State management
│   ├── workflow/              # Workflow utilities
│   └── workflow-memory/       # Workflow memory system
├── workflows/                 # Default YAML workflow templates (9 workflows)
├── test/                     # Comprehensive test suite (220+ tests)
└── docs/                     # Documentation
```

## 🧪 Testing Philosophy

Sherpa follows **Test-Driven Development** (practicing what we preach!):

- **220+ tests** passing
- **100% passing rate** maintained
- **Edge cases covered**: File system errors, corrupted data, race conditions
- **Behavioral scenarios**: User adoption patterns, celebration generation, state management

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test test/celebration-filtering.test.ts

# Watch mode for development
bun test --watch
```

## 🎨 Code Style

### TypeScript Guidelines
- Use strict TypeScript settings
- Prefer interfaces over types for public APIs
- Document complex behavioral logic
- No `any` types unless absolutely necessary

### Behavioral Code
- **Celebration content** should feel earned, not automatic
- **Error handling** should always provide graceful fallbacks
- **User preferences** should persist cross-session
- **Guidance** should enhance development, never interrupt

### Commit Messages
Follow conventional commits:
```
feat: add whisper mode for minimal guidance
fix: handle corrupted profile JSON gracefully
docs: update installation instructions
test: add race condition scenarios
```

## 🔄 Development Workflow

### Making Changes

1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Write tests first** (TDD approach)
   ```bash
   # Create failing tests
   bun test test/your-feature.test.ts
   ```

3. **Implement feature**
   ```bash
   # Make tests pass
   bun run dev
   ```

4. **Verify all tests pass**
   ```bash
   bun test
   ```

5. **Submit pull request**

### Pull Request Guidelines

- **Clear description** of changes and motivation
- **Tests included** for all new functionality
- **Documentation updated** if needed
- **No breaking changes** without discussion
- **Behavioral impact** considered and tested

## 🎯 Areas for Contribution

### High Priority
- **Workflow templates**: New YAML workflows for specialized contexts
- **Behavioral patterns**: Enhanced learning from user interactions
- **Error recovery**: More robust failure handling
- **Performance optimization**: Faster startup and response times

### Medium Priority
- **Integration examples**: Sample setups with popular editors
- **Documentation**: Improved guides and examples
- **Analytics**: Anonymous usage insights (opt-in)
- **Accessibility**: Better support for different user preferences

### Experimental
- **Predictive guidance**: Anticipating user needs
- **Community insights**: Aggregated best practices
- **Multi-language support**: Non-English workflows
- **Visual components**: Rich media in responses

## 🚫 What We Don't Want

- **Tool proliferation**: Keep the 2-tool design (guide, approach)
- **Rigid enforcement**: Never force workflows, only suggest
- **Complex setup**: Installation should be simple and reliable
- **Breaking changes**: Maintain backward compatibility
- **Intrusive behavior**: Respect user concentration and flow

## 🏆 Recognition

Contributors who make significant improvements to the behavioral adoption system or add valuable workflow templates will be featured in our success stories and documentation.

## 📞 Getting Help

- **Issues**: [GitHub Issues](https://github.com/anthropics/sherpa-mcp/issues)
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check the [README](README.md) and [docs/](docs/)

## 🎉 Code of Conduct

We're committed to providing a welcoming and inspiring community for all. Please be respectful, constructive, and kind in all interactions.

Remember: Sherpa is about positive reinforcement - let's apply that principle to our contributor community too!

---

*Thank you for helping us create the liquid development experience! 🌊*