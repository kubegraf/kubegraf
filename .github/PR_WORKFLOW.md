# PR-Only Workflow Guide

## ⚠️ CRITICAL: Enable "Include Administrators"

Your branch protection is enabled, but **admins can still bypass it**. You need to enable "Include administrators" in the GitHub UI.

### Steps to Fix (Do This Now):

1. **Go to Branch Protection Settings:**
   - Visit: https://github.com/kubegraf/kubegraf/settings/branches
   - Click on the rule for `main` branch

2. **Enable This Critical Setting:**
   - ✅ **Check "Include administrators"** 
   - This prevents even you (as admin) from bypassing protection

3. **Verify These Settings Are Enabled:**
   - ✅ Require a pull request before merging
   - ✅ Required approvals: 1
   - ✅ Dismiss stale reviews
   - ✅ Include administrators ⚠️ **MUST BE CHECKED**
   - ❌ Allow force pushes (DISABLED)
   - ❌ Allow deletions (DISABLED)

4. **Save Changes**

## ✅ Proper Workflow (After Protection is Enabled)

### Step 1: Create Feature Branch

```bash
# Always start from updated main
git checkout main
git pull origin main

# Create new feature branch
git checkout -b feature/your-feature-name
# OR
git checkout -b fix/your-bug-name
# OR
git checkout -b docs/your-doc-update
```

### Step 2: Make Your Changes

```bash
# Make changes to files
# ... edit files ...

# Stage changes
git add .

# Commit with descriptive message
git commit -m "Add feature: description of what you did"
```

### Step 3: Push Feature Branch

```bash
# Push to remote (creates branch on GitHub)
git push origin feature/your-feature-name
```

### Step 4: Create Pull Request

**Option A: Via GitHub Web UI**
1. Go to: https://github.com/kubegraf/kubegraf/pulls
2. Click "New Pull Request"
3. Select: `feature/your-feature-name` → `main`
4. Add title and description
5. Click "Create Pull Request"

**Option B: Via GitHub CLI**
```bash
gh pr create --title "Your PR Title" --body "Description of changes"
```

### Step 5: Get Approval & Merge

1. Wait for review/approval (if required)
2. Address any review comments
3. Merge PR via GitHub UI (or `gh pr merge`)
4. Delete feature branch after merge

### Step 6: Clean Up Local Branch

```bash
# Switch back to main
git checkout main

# Pull latest changes
git pull origin main

# Delete local feature branch
git branch -d feature/your-feature-name
```

## 🚫 What Will Be Blocked

After enabling "Include administrators", these will FAIL:

```bash
# ❌ Direct commit to main
git checkout main
git add .
git commit -m "Direct commit"
git push origin main  # ERROR: protected branch

# ❌ Force push
git push --force origin main  # ERROR: force push not allowed

# ❌ Delete branch
git push origin --delete main  # ERROR: deletion not allowed
```

## 🧪 Test Protection

After configuring, test it:

```bash
# Try to push directly (should fail)
git checkout main
echo "test" > test-protection.txt
git add test-protection.txt
git commit -m "Test: direct push to main"
git push origin main
```

**Expected Result:**
```
! [remote rejected] main -> main (protected branch hook declined)
error: failed to push some refs to 'origin'
```

If you see this error, protection is working! ✅

## 📝 Branch Naming Conventions

Use descriptive branch names:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/changes
- `chore/` - Maintenance tasks

Examples:
- `feature/add-user-authentication`
- `fix/crashloopbackoff-diagnosis`
- `docs/update-installation-guide`

## 🔄 Quick Reference Commands

```bash
# Create and switch to feature branch
git checkout -b feature/my-feature

# Push and create PR
git push origin feature/my-feature
gh pr create

# View open PRs
gh pr list

# Merge PR (after approval)
gh pr merge <pr-number> --merge

# Update feature branch with latest main
git checkout feature/my-feature
git merge main
# or
git rebase main
```

