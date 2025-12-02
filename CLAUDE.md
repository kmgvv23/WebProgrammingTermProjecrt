# CLAUDE.md - AI Assistant Guide for WebProgrammingTermProject

**Last Updated:** 2025-12-02
**Repository Status:** Initial/Empty State
**Project Type:** Web Programming Term Project

---

## Project Overview

This is a web programming term project repository currently in its initial state. The repository contains minimal files and is ready for development to begin.

### Current State
- **Status:** Empty/Initial repository
- **Files:** README.md only
- **No dependencies or frameworks configured yet**
- **No source code structure established**

---

## Development Workflow for AI Assistants

### 1. Branch Management
- **Current Branch:** `claude/claude-md-mio7f4dj6d24xp5d-01LaKsD2yV4kVATWrgGth6C4`
- All development MUST occur on branches prefixed with `claude/`
- Branch names must follow pattern: `claude/<session-id>`
- NEVER push directly to main/master without explicit permission
- Always use `git push -u origin <branch-name>` for pushing

### 2. Git Operations Best Practices
- Always commit changes with clear, descriptive messages
- Push changes to the designated claude/* branch
- Retry failed push/fetch operations up to 4 times with exponential backoff (2s, 4s, 8s, 16s)
- Use `git fetch origin <branch-name>` for specific branch fetches
- Create commits that are atomic and focused on single concerns

### 3. File Operations
- ALWAYS prefer editing existing files over creating new ones
- Use Read tool before any edits to understand context
- Never create documentation files unless explicitly requested
- Avoid over-engineering - keep solutions simple and focused

---

## Recommended Project Structure

Since this is a web programming project, the following structure is recommended once development begins:

```
WebProgrammingTermProject/
├── README.md                 # Project documentation
├── CLAUDE.md                # AI assistant guide (this file)
├── .gitignore               # Git ignore patterns
├── package.json             # Node.js dependencies (if using Node)
│
├── src/                     # Source code
│   ├── frontend/           # Frontend application
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── styles/        # CSS/styling files
│   │   ├── utils/         # Utility functions
│   │   └── assets/        # Static assets (images, fonts)
│   │
│   ├── backend/            # Backend application
│   │   ├── controllers/   # Request handlers
│   │   ├── models/        # Data models
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   ├── services/      # Business logic
│   │   └── config/        # Configuration files
│   │
│   └── shared/             # Shared code between frontend/backend
│       ├── types/         # TypeScript types/interfaces
│       ├── constants/     # Shared constants
│       └── utils/         # Shared utilities
│
├── tests/                   # Test files
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
│
├── public/                  # Public static files
├── config/                  # Configuration files
└── docs/                    # Additional documentation
```

---

## Technology Stack Considerations

When implementing features, consider these common web development stacks:

### Frontend Options
- **React** - Component-based UI library
- **Vue.js** - Progressive JavaScript framework
- **Angular** - Full-featured framework
- **Svelte** - Compiled JavaScript framework
- **Vanilla JS/HTML/CSS** - No framework approach

### Backend Options
- **Node.js + Express** - JavaScript/TypeScript backend
- **Python + Flask/Django** - Python web frameworks
- **Ruby on Rails** - Ruby framework
- **PHP + Laravel** - PHP framework
- **Java + Spring Boot** - Java framework

### Database Options
- **PostgreSQL** - Relational database
- **MySQL/MariaDB** - Relational database
- **MongoDB** - NoSQL document database
- **SQLite** - Lightweight relational database
- **Redis** - In-memory data store

---

## Coding Conventions

### General Principles
1. **Keep it Simple:** Don't over-engineer solutions
2. **Security First:** Avoid SQL injection, XSS, CSRF, and other OWASP Top 10 vulnerabilities
3. **Read Before Modify:** Always read files before making changes
4. **Atomic Commits:** One logical change per commit
5. **Clean Code:** Self-documenting code is better than comments

### Security Checklist
- ✓ Validate all user inputs
- ✓ Use parameterized queries (prevent SQL injection)
- ✓ Sanitize HTML output (prevent XSS)
- ✓ Implement CSRF tokens for state-changing operations
- ✓ Use HTTPS for all communications
- ✓ Hash passwords with bcrypt/argon2
- ✓ Implement rate limiting
- ✓ Keep dependencies updated
- ✓ Never commit secrets/credentials to git

### Code Style
- Use consistent indentation (2 or 4 spaces)
- Follow language-specific conventions (e.g., camelCase for JavaScript)
- Keep functions small and focused
- Use meaningful variable and function names
- Avoid deep nesting (max 3-4 levels)

### Comments and Documentation
- Only add comments where logic isn't self-evident
- Don't add comments to code you didn't change
- Prefer self-documenting code over excessive comments
- Update README.md for significant features

---

## Task Management

### Using TodoWrite Tool
AI assistants should use the TodoWrite tool for:
- Complex multi-step tasks (3+ steps)
- Non-trivial implementations
- Multiple user-requested tasks
- Planning and tracking progress

### Task States
- `pending` - Not started
- `in_progress` - Currently working (ONLY ONE at a time)
- `completed` - Finished successfully

### Task Guidelines
- Mark tasks complete IMMEDIATELY after finishing
- Don't batch completions
- Only mark complete when FULLY accomplished
- Keep tasks as in_progress if blocked or encountering errors

---

## Common Operations Guide

### Starting a New Feature
1. Read existing code to understand context
2. Create TodoWrite list for multi-step features
3. Implement incrementally
4. Test as you go
5. Commit with clear message
6. Push to claude/* branch

### Fixing Bugs
1. Read the affected file(s) first
2. Understand the root cause
3. Implement minimal fix
4. Don't refactor surrounding code
5. Test the fix
6. Commit and push

### Adding Dependencies
1. Check if dependency is necessary
2. Choose well-maintained packages
3. Update package.json
4. Update documentation if needed
5. Commit dependency changes separately

### Refactoring
1. Only refactor when explicitly requested
2. Ensure tests exist before refactoring
3. Make small, incremental changes
4. Test after each change
5. Don't combine refactoring with feature additions

---

## Testing Strategy

### Test Types
- **Unit Tests:** Test individual functions/components
- **Integration Tests:** Test component interactions
- **E2E Tests:** Test complete user flows
- **Manual Testing:** Verify in browser/environment

### Testing Principles
- Write tests for critical functionality
- Test edge cases and error conditions
- Keep tests simple and readable
- Use descriptive test names
- Mock external dependencies

---

## Common Pitfalls to Avoid

### ❌ Don't Do
- Create files unnecessarily
- Add features not requested
- Over-engineer solutions
- Skip reading files before editing
- Commit credentials or secrets
- Push to wrong branches
- Add backwards-compatibility hacks for unused code
- Rename unused variables with `_prefix`
- Add error handling for impossible scenarios
- Create abstractions for one-time operations

### ✓ Do
- Keep changes minimal and focused
- Read code before modifying
- Follow existing patterns in codebase
- Ask questions when requirements are unclear
- Validate at system boundaries only
- Delete unused code completely
- Trust internal code and framework guarantees
- Make changes directly rather than adding compatibility layers

---

## AI Assistant Communication

### Tone and Style
- Be concise and clear
- Don't use emojis unless requested
- Output directly to user (not via bash echo)
- Use markdown for formatting
- Focus on facts over validation

### Tool Usage
- Use specialized tools over bash when possible
- Use Task tool for exploratory codebase searches
- Make parallel tool calls when operations are independent
- Use sequential calls when operations have dependencies
- Never guess or use placeholders in tool parameters

---

## Project-Specific Notes

### Current Status
This repository is in its initial state with no code structure established. When development begins:

1. **First Steps Should Include:**
   - Creating .gitignore file
   - Setting up package.json (if using Node.js)
   - Establishing directory structure
   - Configuring development tools
   - Setting up testing framework
   - Adding basic documentation to README.md

2. **Technology Stack Decision:**
   - Should be determined based on project requirements
   - Consider team familiarity with technologies
   - Evaluate project complexity and timeline
   - Choose appropriate frameworks and libraries

3. **Development Environment:**
   - Set up linting (ESLint, Prettier, etc.)
   - Configure build tools (Webpack, Vite, etc.)
   - Establish development server
   - Set up hot reload for development

### Future Updates
As the project evolves, this CLAUDE.md file should be updated to reflect:
- Chosen technology stack
- Actual project structure
- Project-specific conventions
- API documentation
- Database schema
- Deployment procedures
- Environment variables and configuration

---

## Quick Reference Commands

### Git Operations
```bash
# Check status
git status

# Create and switch to new branch
git checkout -b claude/<session-id>

# Stage changes
git add <files>

# Commit with message
git commit -m "descriptive message"

# Push to remote
git push -u origin claude/<branch-name>

# Fetch specific branch
git fetch origin <branch-name>

# View recent commits
git log --oneline -10
```

### Common Development Commands
```bash
# Install dependencies (Node.js)
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Check for linting errors
npm run lint
```

---

## Resources and References

### Web Development Best Practices
- OWASP Top 10 Security Risks
- MDN Web Docs
- Web.dev by Google
- Accessibility guidelines (WCAG)

### Code Quality
- Clean Code principles
- SOLID principles
- DRY (Don't Repeat Yourself)
- KISS (Keep It Simple, Stupid)
- YAGNI (You Aren't Gonna Need It)

---

## Contact and Support

For questions about this project:
- Check README.md for project-specific information
- Review git commit history for context
- Ask the repository owner for clarification

For Claude Code specific help:
- Use `/help` command
- Report issues at https://github.com/anthropics/claude-code/issues

---

**Note to AI Assistants:** This document is a living guide. As the project develops, update this file to reflect the actual codebase structure, conventions, and workflows. Always verify current state before making assumptions based on this documentation.
