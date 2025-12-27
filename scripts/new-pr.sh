#!/bin/bash
# Helper script to create a new feature branch and PR workflow

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get branch type and name
if [ -z "$1" ] || [ -z "$2" ]; then
    echo -e "${RED}Usage: $0 <type> <name>${NC}"
    echo "Types: feature, fix, docs, refactor, test, chore"
    echo "Example: $0 feature add-user-auth"
    exit 1
fi

TYPE=$1
NAME=$2
BRANCH_NAME="${TYPE}/${NAME}"

# Validate branch type
if [[ ! "$TYPE" =~ ^(feature|fix|docs|refactor|test|chore)$ ]]; then
    echo -e "${RED}Error: Invalid branch type '${TYPE}'${NC}"
    echo "Valid types: feature, fix, docs, refactor, test, chore"
    exit 1
fi

echo -e "${GREEN}🚀 Creating new PR workflow...${NC}"

# Ensure we're on main and up to date
echo -e "${YELLOW}📥 Updating main branch...${NC}"
git checkout main
git pull origin main

# Check if branch already exists
if git show-ref --verify --quiet refs/heads/$BRANCH_NAME; then
    echo -e "${RED}Error: Branch '${BRANCH_NAME}' already exists locally${NC}"
    read -p "Switch to existing branch? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout $BRANCH_NAME
        echo -e "${GREEN}✅ Switched to existing branch${NC}"
    fi
    exit 1
fi

# Create and switch to new branch
echo -e "${YELLOW}🌿 Creating branch: ${BRANCH_NAME}${NC}"
git checkout -b $BRANCH_NAME

echo -e "${GREEN}✅ Branch created: ${BRANCH_NAME}${NC}"
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "  1. Make your changes"
echo "  2. git add ."
echo "  3. git commit -m 'Your commit message'"
echo "  4. git push origin ${BRANCH_NAME}"
echo "  5. gh pr create"
echo ""
echo -e "${GREEN}Or use: ./scripts/push-pr.sh${NC}"

