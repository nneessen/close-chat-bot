---
name: test-all
description: Runs the complete test suite including unit tests, integration tests, linting, and type checking
type: project
---

Please run the complete test suite and fix any failures:

1. **Unit Tests**: Run all component and service tests
2. **Integration Tests**: Test API endpoints and database operations
3. **Type Checking**: Verify TypeScript compilation
4. **Linting**: Check code style and best practices
5. **Security Audit**: Check for dependency vulnerabilities

Commands to run:
```bash
npm run test
npm run typecheck
npm run lint
npm audit
```

If any tests fail:
- Analyze the failure reasons
- Fix the underlying issues
- Re-run tests to ensure they pass
- Update test coverage if needed

Use the test-runner subagent for this task.