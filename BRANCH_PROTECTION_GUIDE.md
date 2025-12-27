# Branch Protection Setup Guide

## Current Issue
You can still commit directly to `main` branch despite enabling branch protection.

## Solution: Configure Branch Protection Properly

### Step 1: Go to Branch Protection Settings
1. Navigate to: https://github.com/kubegraf/kubegraf/settings/branches
2. Click "Add rule" or edit the existing rule for `main`

### Step 2: Enable These Critical Settings

#### ✅ **MUST ENABLE:**
- [x] **Require a pull request before merging**
  - [x] **Required number of approvals: 1** (or more)
  - [x] **Dismiss stale pull request approvals when new commits are pushed**
  - [x] **Require review from Code Owners** (if you have CODEOWNERS file)
  
- [x] **Include administrators** ⚠️ **CRITICAL** - This prevents even admins from bypassing protection

- [x] **Do not allow bypassing the above settings**

#### ✅ **RECOMMENDED:**
- [x] **Require status checks to pass before merging** (if you have CI/CD)
- [x] **Require conversation resolution before merging**
- [x] **Require linear history** (prevents merge commits)
- [x] **Require signed commits** (optional, for security)

#### ❌ **MUST DISABLE:**
- [ ] **Allow force pushes**
- [ ] **Allow deletions**

### Step 3: Test Protection

After saving, try to push directly:

```bash
# This should FAIL after protection is enabled
git checkout main
git add .
git commit -m "Test direct push"
git push origin main
```

**Expected Error:**
```
! [remote rejected] main -> main (protected branch hook declined)
error: failed to push some refs to 'origin'
```

## Proper Workflow (After Protection is Enabled)

### ✅ **CORRECT WAY:**

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   ```bash
   git add .
   git commit -m "Your commit message"
   ```

3. **Push to feature branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request on GitHub:**
   - Go to: https://github.com/kubegraf/kubegraf/pulls
   - Click "New Pull Request"
   - Select your feature branch → main
   - Add description and reviewers
   - Submit PR

5. **After PR is approved and merged:**
   ```bash
   git checkout main
   git pull origin main
   git branch -d feature/your-feature-name  # Delete local branch
   ```

### ❌ **WRONG WAY (Will be blocked):**
```bash
git checkout main
git add .
git commit -m "Direct commit"
git push origin main  # ❌ This will be REJECTED
```

## Quick Setup Script

If you want to automate the branch protection setup, you can use the GitHub CLI:

```bash
# Install GitHub CLI if not installed
# brew install gh  # macOS
# or download from: https://cli.github.com/

# Authenticate
gh auth login

# Set branch protection (example)
gh api repos/kubegraf/kubegraf/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":[]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null
```

## Verify Protection is Working

After configuration, test with:

```bash
# Try to push directly (should fail)
echo "test" >> test.txt
git add test.txt
git commit -m "Test direct push"
git push origin main
```

If you see an error, protection is working! ✅

## Troubleshooting

### Still able to push?
1. Check if "Include administrators" is enabled
2. Verify you're pushing to the correct branch (`main`)
3. Make sure the protection rule is saved
4. Try refreshing the GitHub settings page

### Need to make urgent fix?
If you need to bypass protection for an emergency:
1. Temporarily disable protection (Settings → Branches → Edit rule)
2. Make the fix
3. Re-enable protection immediately
4. Document why protection was bypassed

## Best Practices

1. **Always use feature branches** for new work
2. **Require at least 1 approval** for PRs
3. **Use descriptive branch names**: `feature/`, `fix/`, `docs/`
4. **Keep PRs small and focused**
5. **Use PR templates** for consistency

