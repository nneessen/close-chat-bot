---
name: deploy
description: Deploys the application to production after running tests and building the project
type: project
---

Please deploy the SMS chatbot application:

1. **Pre-deployment Checks**:
   - Run all tests and ensure they pass
   - Check TypeScript compilation
   - Run linting and fix any issues
   - Verify environment variables are set

2. **Build Process**:
   - Generate optimized production build
   - Run database migrations if needed
   - Verify all dependencies are installed

3. **Deployment**:
   - Deploy to Vercel or Railway (based on configuration)
   - Verify deployment was successful
   - Test production endpoints
   - Check logs for any errors

4. **Post-deployment**:
   - Verify webhooks are working
   - Test SMS flow end-to-end
   - Monitor for any issues

Commands to run:
```bash
npm run build
npm run deploy
npm run db:migrate:deploy
```

If deployment fails:
- Check logs for error details
- Verify environment configuration
- Fix issues and retry deployment
- Update documentation with any changes

Use both test-runner and api-integrator subagents for this task.