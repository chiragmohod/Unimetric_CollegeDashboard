# Contributing to Unimetric

Thank you for your interest in contributing to Unimetric! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Respect differing opinions
- Report inappropriate behavior

## Getting Started

### 1. Fork and Clone
```bash
git clone https://github.com/yourusername/unimetric.git
cd unimetric
npm install
```

### 2. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or for bug fixes:
git checkout -b fix/your-bug-name
```

Branch naming conventions:
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `refactor/*` - Code refactoring
- `test/*` - Test additions

### 3. Development Setup

```bash
# Terminal 1: Backend
npm run serve

# Terminal 2: Frontend
npm run dev
```

## Code Style Guidelines

### TypeScript
- Use strict TypeScript (`tsconfig.json` has `strict: true`)
- Avoid `any` types
- Add type annotations for function parameters and returns
- Use interfaces for complex objects

Example:
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

async function fetchUser(id: string): Promise<User> {
  // implementation
}
```

### React Components
- Use functional components with hooks
- Capitalize component names
- Keep components focused and single-responsibility

Example:
```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
```

### File Naming
- Components: PascalCase (e.g., `StudentDashboard.tsx`)
- Utilities: camelCase (e.g., `attendance.ts`)
- Types: PascalCase (e.g., `types.ts`)

### Comments
- Use comments for "why", not "what"
- Keep comments updated with code changes
- Use JSDoc for public functions

```typescript
/**
 * Calculates CGPA from result marks
 * @param marks - Array of marks for all subjects
 * @returns Calculated CGPA value
 */
function calculateCGPA(marks: ResultMark[]): number {
  // implementation
}
```

## Commit Messages

Use clear, descriptive commit messages:

```
feat: Add student attendance tracking
fix: Resolve login redirect issue
docs: Update README with deployment instructions
refactor: Simplify database query logic
test: Add unit tests for grade calculation
```

Format: `<type>: <description>`

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting, missing semicolons, etc.)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Build, dependencies, tooling

## Making a Pull Request

1. **Before submitting:**
   ```bash
   npm run lint      # TypeScript check
   npm run build     # Build test
   ```

2. **PR Title Format:**
   ```
   [Feature|Fix|Docs] Brief description
   ```

3. **PR Description Template:**
   ```markdown
   ## Description
   Brief description of changes

   ## Related Issues
   Fixes #123

   ## Type of Change
   - [ ] New feature
   - [ ] Bug fix
   - [ ] Documentation update
   - [ ] Breaking change

   ## Testing
   How was this tested?

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex logic
   - [ ] Documentation updated
   - [ ] No new warnings generated
   ```

## Testing Guidelines

### Unit Tests
- Write tests for utility functions
- Aim for >80% code coverage
- Use descriptive test names

```typescript
// Example test structure
describe('calculateCGPA', () => {
  it('should return 10 for 100% marks', () => {
    const marks = [{ marks: 100 }, { marks: 100 }];
    expect(calculateCGPA(marks)).toBe(10);
  });
});
```

### Manual Testing
- Test on different browsers
- Test responsive design on mobile
- Verify all affected features work

## Documentation

- Update README.md if adding features
- Add JSDoc comments to public functions
- Update ARCHITECTURE.md for structural changes
- Include examples for complex features

## Database Changes

If adding database schema changes:

1. **For local development:**
   - Update `server/db.ts` types
   - Provide migration script if needed

2. **For Supabase:**
   - Create SQL migration file: `server/migrations/YYYY-MM-DD-description.sql`
   - Update `server/supabase-schema.sql`

3. **For other databases:**
   - Provide migration examples for:
     - PostgreSQL
     - MySQL
     - MongoDB

## Reporting Issues

### Bug Reports
Include:
- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Environment info (OS, browser, Node version)
- Relevant error logs

### Feature Requests
Include:
- Clear description of desired feature
- Use cases and benefits
- Potential implementation approach
- Any related issues

## Review Process

1. **Code Review:** Maintainers will review for:
   - Code quality and style
   - TypeScript correctness
   - Security issues
   - Test coverage
   - Documentation

2. **CI/CD Checks:**
   - TypeScript compilation
   - Linting
   - Build success

3. **Approval:**
   - At least one maintainer approval required
   - All CI checks must pass

## Local Database Testing

### Testing with PostgreSQL
```bash
# Start PostgreSQL (using Docker)
docker run --name unimetric-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=unimetric \
  -p 5432:5432 \
  postgres:15

# Configure .env
DATABASE_TYPE="postgresql"
DATABASE_URL="postgresql://postgres:password@localhost:5432/unimetric"
```

### Testing with MongoDB
```bash
# Start MongoDB (using Docker)
docker run --name unimetric-mongo \
  -e MONGO_INITDB_DATABASE=unimetric \
  -p 27017:27017 \
  mongo:6

# Configure .env
DATABASE_TYPE="mongodb"
DATABASE_URL="mongodb://localhost:27017/unimetric"
```

## Performance Considerations

- Minimize API calls in components
- Use React.memo for expensive components
- Implement pagination for large datasets
- Optimize database queries with indexes
- Consider caching strategies

## Security Best Practices

- Never commit sensitive data (API keys, passwords)
- Validate and sanitize user input
- Use parameterized queries
- Implement proper authentication/authorization
- Keep dependencies updated

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create release notes
4. Tag release: `git tag v1.0.0`
5. Push tag to trigger release workflow

## Questions?

- Check existing issues and discussions
- Open a discussion for questions
- Contact maintainers for guidance

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md
- GitHub Contributors page
- Release notes (for significant contributions)

Thank you for contributing to Unimetric! 🎉
