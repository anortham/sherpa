---
name: tdd-mode
description: Explicit Test-Driven Development workflow activation. Use when user specifically requests TDD, test-first development, or when writing tests before implementation is the clear requirement. Enforces strict TDD discipline with 4 phases.
allowed-tools: mcp__sherpa__guide, mcp__sherpa__approach, Read, Edit, Write, Bash
---

# TDD Mode Skill

## Purpose
Activate **pure Test-Driven Development** workflow with strict discipline. This skill ensures test-first development by guiding through the classic TDD cycle: Red → Green → Refactor.

## When to Activate
Use this skill when the user:
- **Explicitly requests TDD**: "use TDD", "test-driven", "test-first"
- **Emphasizes testing**: "write tests first", "start with tests"
- **Wants strict discipline**: "proper TDD", "by the book"
- **Building new features** where quality is critical

**DO NOT use** for:
- Bug fixes (use Bug Hunt workflow instead)
- Quick prototypes (use Rapid workflow)
- Exploratory coding (use Exploration workflow)

## TDD Workflow Phases

### Phase 1: 📋 Define Contract
**Goal:** Design before implementing

**Activities:**
1. Define interfaces and types
2. Specify method signatures
3. Document expected behavior
4. Design API contracts

**Guidance from Sherpa:**
```
guide()
→ "Define your interfaces and types first.
   What should this component expose?
   Think about the API contract before implementation."
```

**Complete when:**
- Interfaces are defined
- Method signatures clear
- Types specified
- Behavior documented

### Phase 2: ✅ Write Tests
**Goal:** Comprehensive test suite BEFORE implementation

**Activities:**
1. Write failing tests (Red phase)
2. Cover happy paths
3. Cover edge cases
4. Cover error scenarios
5. Ensure tests fail for the right reasons

**Guidance from Sherpa:**
```
guide()
→ "Write your test suite now - BEFORE implementation.
   Cover success cases, edge cases, and errors.
   Watch them fail (that's good!)"
```

**Complete when:**
- All test cases written
- Tests fail with clear messages
- Coverage plan is comprehensive
- Edge cases identified

**DO NOT** write implementation yet!

### Phase 3: 🚀 Implement
**Goal:** Make tests pass with minimal code (Green phase)

**Activities:**
1. Implement just enough to pass tests
2. Run tests frequently
3. See tests turn green one by one
4. No gold-plating or over-engineering

**Guidance from Sherpa:**
```
guide()
→ "Now make those tests green!
   Implement the minimum needed to pass.
   Run tests often. Feel the satisfaction!"
```

**Complete when:**
- ALL tests pass
- No test failures
- Implementation is minimal
- No unnecessary features

### Phase 4: ✨ Refactor
**Goal:** Improve code while keeping tests green

**Activities:**
1. Improve code quality
2. Remove duplication
3. Enhance readability
4. Optimize if needed
5. Keep tests passing throughout

**Guidance from Sherpa:**
```
guide()
→ "Polish your code while tests stay green.
   Remove duplication. Improve clarity.
   Your tests protect you - refactor confidently!"
```

**Complete when:**
- Code is clean and readable
- No duplication
- Tests still green
- Ready for review

## Orchestration Steps

### 1. Activate TDD Workflow
```
approach({ workflow: "tdd" })
```

Sherpa responds with:
```
🎯 TDD Workflow - Test-First Development

Phase 1: Define Contract

Design your component's public interface before writing any implementation.
Think through the API, method signatures, and type contracts.

Suggestions:
- Define interfaces and types
- Specify method signatures
- Document expected behavior
- Consider edge cases early

🎉 Welcome to test-first mastery! Design → Test → Implement → Refactor
```

### 2. Guide Through Each Phase
After completing work in a phase:

```
guide({ done: "defined PaymentService interface with charge, refund, and getStatus methods" })
```

Sherpa advances to next phase:
```
✨ Excellent interface design! Moving to Phase 2: Write Tests

Now write comprehensive tests BEFORE implementation:
- Test successful charge operations
- Test refund scenarios
- Test error handling
- Test edge cases (negative amounts, invalid tokens, etc.)

Remember: These tests will fail at first - that's perfect!
```

### 3. Mark Progress Explicitly
Use descriptive `done` messages:

**Good examples:**
- `"designed complete PaymentService API"`
- `"wrote 12 test cases covering all payment scenarios"`
- `"all tests passing - Stripe integration complete"`
- `"refactored to extract StripeClient helper class"`

**Bad examples:**
- `"done with phase 1"`
- `"finished"`
- `"tests work"`

### 4. Receive Celebrations
Sherpa celebrates automatically:

**Step completion:**
```
"Great progress on your test suite! 🧪"
```

**Phase advancement:**
```
"🎉 Test phase complete! 12 tests written!
Moving to implementation..."
```

**Milestones:**
```
"🏆 Milestone: First TDD Workflow Complete!
You're building systematic habits!"
```

## TDD Discipline Enforcement

### The TDD Rules

1. **Write NO production code** until tests exist for it
2. **Write only enough test** to fail (including compilation failures)
3. **Write only enough code** to make tests pass
4. **Refactor with confidence** - tests protect you

### Staying On Track

If you find yourself:
- **Writing implementation before tests** → STOP. Go back to phase 2
- **Over-engineering** → Remember: minimum to pass tests
- **Skipping edge cases** → Add more tests
- **Breaking tests during refactor** → Revert, smaller steps

## Example TDD Session

```markdown
User: "Implement JWT token refresh functionality"

→ approach({ workflow: "tdd" })

Sherpa: "🎯 TDD Workflow activated! Phase 1: Define Contract"

[Design token refresh interface]
→ guide({ done: "defined TokenRefresher interface with refresh() and revoke() methods" })

Sherpa: "✨ Solid contract! Phase 2: Write Tests
        Write tests for token refresh BEFORE implementing."

[Write 8 tests covering various scenarios]
→ guide({ done: "wrote 8 tests: valid refresh, expired token, invalid token, revoked token, etc." })

Sherpa: "🎉 Outstanding test coverage! 8 comprehensive tests!
        Phase 3: Implementation
        Make those tests green!"

[Implement TokenRefresher]
→ guide({ done: "implemented TokenRefresher, all 8 tests passing" })

Sherpa: "🏆 All green! Beautiful work!
        Phase 4: Refactor
        Polish your code with test protection."

[Extract helper, improve naming]
→ guide({ done: "refactored to extract RedisTokenStore, improved error messages" })

Sherpa: "🌟 TDD Workflow Complete! Clean code, solid tests!
        🏆 Milestone: TDD Mastery!"
```

## Integration with Testing Tools

### Running Tests
```bash
# After writing tests (Phase 2)
npm test -- payment.test.ts

# Expected: Tests fail (RED)

# After implementation (Phase 3)
npm test -- payment.test.ts

# Expected: Tests pass (GREEN)

# During refactoring (Phase 4)
npm test -- --watch

# Expected: Tests stay green
```

### Test Coverage
```bash
# Check coverage during Phase 4
npm test -- --coverage

# Ensure high coverage before completing workflow
```

## Key Behaviors

### ✅ DO
- Activate TDD explicitly when appropriate
- Follow phases in order (no skipping!)
- Write tests BEFORE implementation
- Use specific `done` descriptions
- Run tests frequently
- Refactor with confidence
- Let Sherpa celebrate your discipline

### ❌ DON'T
- Skip to implementation without tests
- Write minimal tests just to "check the box"
- Over-engineer during implementation phase
- Break tests during refactoring
- Ignore Sherpa's guidance
- Rush through phases

## Success Criteria

TDD Mode succeeds when:
- Tests are written before implementation (always)
- All tests pass before refactoring
- Code is clean and well-tested
- User builds muscle memory for TDD cycle
- Quality of code improves over time

## Celebrating TDD Discipline

Sherpa tracks TDD-specific achievements:
- **First TDD Workflow** - Your first complete test-first cycle
- **TDD Consistency** - 3 TDD workflows in a row
- **TDD Master** - 10 TDD workflows completed
- **Never Skip Tests** - Always write tests first

---

**Remember:** TDD is a discipline that pays dividends. Design → Test → Implement → Refactor. Let Sherpa guide you to test-first mastery!
