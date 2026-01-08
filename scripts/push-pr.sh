#!/bin/bash
# Helper script to push changes and create PR

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Check if on main
if [ "$BRANCH" = "main" ]; then
    echo -e "${RED}❌ Error: You're on main branch!${NC}"
    echo "Create a feature branch first:"
    echo "  git checkout -b feature/your-feature-name"
    exit 1
fi

# Check if branch follows naming convention
if [[ ! "$BRANCH" =~ ^(feature|fix|docs|refactor|test|chore)/ ]]; then
    echo -e "${YELLOW}⚠️  Warning: Branch name doesn't follow convention (feature/fix/docs/etc.)${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}📝 You have uncommitted changes.${NC}"
    echo "Staged files:"
    git diff --cached --name-only
    echo ""
    echo "Unstaged files:"
    git diff --name-only
    echo ""
    read -p "Commit these changes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Commit message: " COMMIT_MSG
        git add .
        git commit -m "$COMMIT_MSG"
    else
        echo -e "${RED}❌ Please commit or stash changes first${NC}"
        exit 1
    fi
fi

# Push branch
echo -e "${YELLOW}📤 Pushing branch to remote...${NC}"
git push origin $BRANCH

# Create PR
echo -e "${YELLOW}🔨 Creating Pull Request...${NC}"
if command -v gh &> /dev/null; then
    gh pr create --title "$BRANCH" --body "Changes in $BRANCH branch"
    echo -e "${GREEN}✅ PR created!${NC}"
else
    echo -e "${YELLOW}GitHub CLI not found. Create PR manually:${NC}"
    echo "  https://github.com/kubegraf/kubegraf/compare/main...${BRANCH}"
fi





