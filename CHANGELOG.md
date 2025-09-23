# Changelog

All notable changes to Sherpa MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Planning for future enhancements

## [1.0.0] - 2025-09-23

### Added
- ✅ **Production Release** - Full implementation of the liquid development experience
- 🚀 **Comprehensive CI/CD pipeline** with GitHub Actions for automated testing and release
- 📚 **Complete documentation** with CONTRIBUTING.md, enhanced README with badges
- ⚡ **Enhanced installation** with Bun detection, npm fallbacks, post-install verification
- 🔧 **Robust internal systems** with retry logic, error recovery, startup validation
- 🛡️ **Comprehensive error handling** with graceful fallbacks and detailed logging

### Changed
- **Improved error handling** with exponential backoff retry mechanisms
- **Enhanced installation experience** with better validation and helpful error messages
- **Better error recovery** in InstructionBuilder with comprehensive fallback instructions
- **Startup validation** ensuring all critical paths are verified on server start

### Fixed
- **File operation reliability** with retry logic for transient failures
- **Template loading resilience** with fallback instructions for missing workflow templates
- **Profile corruption handling** with comprehensive data validation and recovery
- **Race condition safety** in concurrent file operations

### Technical Improvements
- **201 comprehensive tests** (100% passing) covering all error scenarios
- **Retry mechanisms** for file operations with exponential backoff
- **Graceful degradation** for all failure scenarios
- **Cross-session learning** with robust profile persistence

### Added
- 🏔️ **Initial Release** - The Liquid Development Experience
- 🎯 **3-Tool Design**: `guide`, `approach`, `flow` for minimal MCP footprint
- 🧠 **Adaptive Learning Engine** with cross-session behavior analysis
- 🎉 **Behavioral Psychology System** with positive reinforcement
- 🌊 **Flow State Management** with whisper/minimal/full celebration levels
- 📈 **Progress Tracking** with milestones and achievement system
- 🔄 **Dynamic Workflow System** (TDD, Bug Hunt, Rapid, General, Refactor)
- 💾 **Global Installation** via `~/.sherpa/` directory
- 🎨 **Celebration Filtering** with emoji and enthusiasm level control
- 🛡️ **Robust Error Handling** for file system, corruption, and race conditions

### Features

#### Core Tools
- **guide**: Expert step-by-step guidance that prevents bugs and speeds development
- **approach**: Smart workflow selection (TDD, Bug Hunt, Rapid, etc.) based on current task
- **flow**: Adaptive flow state with intelligent, context-aware guidance

#### Behavioral Adoption
- **Positive Reinforcement**: Celebrates progress rather than punishing shortcuts
- **Cross-Session Learning**: Remembers preferences and adapts to individual patterns
- **Context-Aware Suggestions**: Provides relevant guidance based on current work
- **Achievement System**: Unlocks milestones like "First Workflow Mastery"
- **Success Stories**: Shares real-world examples from companies like Netflix, GitHub

#### Technical Excellence
- **201 comprehensive tests** with 789 expect() calls (100% passing)
- **TypeScript safety** throughout the codebase
- **YAML workflow templates** for easy customization
- **Comprehensive logging** with automatic rotation
- **Graceful error recovery** from all failure scenarios

#### Installation & Setup
- **One-command setup**: `bun run setup` creates global configuration
- **Automatic workflow copying** to `~/.sherpa/workflows/`
- **Claude Desktop integration** with simple MCP configuration
- **Cross-project availability** via global installation

### The Liquid Experience

Sherpa introduces the concept of "liquid development" - guidance that flows naturally with coding like water:

- **Flow State Preservation**: Never interrupts unless providing proportional value
- **Natural Language Responses**: Conversational guidance instead of JSON blobs
- **Context-Aware Auto-Detection**: Suggests appropriate workflows based on user language
- **Minimal Friction**: Quick shortcuts like `guide("tdd")` and `guide("next")`
- **Invisible Infrastructure**: Behavioral psychology works subconsciously

### Behavioral Psychology Features

- **4 Celebration Levels**: Full, Minimal, Whisper, Off
- **Contextual Encouragement**: Different celebrations for different achievements
- **Workflow-Specific Metaphors**: TDD gets lab work analogies, Bug Hunt gets detective themes
- **Progress Celebration**: Step completion, phase advancement, milestone achievements
- **Success Inspiration**: Occasionally shares relevant company success stories

### Test Coverage

Comprehensive testing covering:
- **Celebration Filtering**: All 4 levels with emoji and text processing
- **File System Errors**: ENOENT, EACCES, corruption, network failures
- **Race Conditions**: Concurrent profile access, workflow recording
- **Data Validation**: Corrupted JSON, invalid types, missing fields
- **Behavioral Scenarios**: User adoption patterns, tool usage, flow state

### Architecture

- **Global Installation Model**: Workflows available across all projects
- **Behavioral Adoption System**: ProgressTracker, CelebrationGenerator, InstructionBuilder
- **Adaptive Learning Engine**: Cross-session user behavior analysis
- **Template System**: Dynamic instruction generation with Handlebars-style substitution
- **MCP Protocol**: Full compliance with Model Context Protocol v1.18.1

---

## Development Philosophy

Sherpa is built on the principle that **systematic development should feel joyful, not burdensome**. Through positive reinforcement and behavioral psychology, we help AI agents develop better coding habits naturally.

### Key Metrics Achieved
- **201 tests** - Comprehensive coverage of all scenarios
- **3 tools only** - Minimal MCP footprint for unobtrusive experience
- **100% TypeScript** - Type safety throughout
- **Cross-session persistence** - Behavioral adaptation across sessions
- **Zero configuration** - Works out of the box after setup

*The liquid development experience is here.* 🌊