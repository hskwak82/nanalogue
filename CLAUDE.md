# Project Rules for Claude

## Git Workflow Rules

**CRITICAL - MUST FOLLOW:**

1. **Never work on master branch directly**
   - Always create a new feature branch before starting any work
   - Even for small changes, create a branch first

2. **Branch creation is mandatory**
   - Before any code change, run: `git checkout -b feature/<descriptive-name>`
   - Use descriptive branch names (e.g., `feature/add-scroll`, `fix/login-bug`)

3. **Do not merge without explicit permission**
   - Never merge branches automatically
   - Wait for explicit user instruction to merge (e.g., "merge to master", "merge it")
   - After completing work, inform the user and wait for merge approval

**Workflow:**
```
git checkout -b feature/<name>  # Create branch FIRST
# ... do work ...
git add && git commit           # Commit changes
git push origin <branch>        # Push to remote
# WAIT for user to approve merge
```
