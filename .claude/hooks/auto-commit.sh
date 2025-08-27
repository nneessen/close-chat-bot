#!/bin/bash

# Claude Code Auto-Commit Hook
# Automatically commits code changes when no errors are detected

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Claude Code Auto-Commit Hook Starting...${NC}"

# Get the tools that were used from environment variable
TOOLS_USED=${CLAUDE_TOOLS_USED:-"Code changes"}

# Function to check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${RED}❌ Not in a git repository. Skipping auto-commit.${NC}"
        exit 0
    fi
}

# Function to check for uncommitted changes
has_changes() {
    ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]
}

# Function to run quality checks
run_quality_checks() {
    echo -e "${YELLOW}🧪 Running quality checks...${NC}"
    
    local has_errors=false
    
    # Check if package.json exists and run available scripts
    if [ -f "package.json" ]; then
        # Run TypeScript check if available
        if npm run --silent 2>/dev/null | grep -q "typecheck"; then
            echo -e "${BLUE}📝 Running TypeScript check...${NC}"
            if ! npm run typecheck; then
                echo -e "${RED}❌ TypeScript errors detected${NC}"
                has_errors=true
            fi
        fi
        
        # Run ESLint if available
        if npm run --silent 2>/dev/null | grep -q "lint"; then
            echo -e "${BLUE}🔍 Running ESLint...${NC}"
            if ! npm run lint; then
                echo -e "${RED}❌ ESLint errors detected${NC}"
                has_errors=true
            fi
        fi
    fi
    
    # Run Prisma validation if schema exists
    if [ -f "prisma/schema.prisma" ]; then
        echo -e "${BLUE}🗃️ Validating Prisma schema...${NC}"
        if ! npx prisma validate; then
            echo -e "${RED}❌ Prisma schema validation failed${NC}"
            has_errors=true
        fi
    fi
    
    if [ "$has_errors" = true ]; then
        echo -e "${RED}❌ Quality checks failed. Skipping auto-commit.${NC}"
        echo -e "${YELLOW}💡 Fix the errors above and try again.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All quality checks passed${NC}"
}

# Function to generate commit message
generate_commit_message() {
    local tools="$1"
    local changed_files=$(git diff --cached --name-only | head -5 | tr '\n' ' ')
    
    # Generate a descriptive commit message based on the tools used and files changed
    local commit_msg="feat: update code using Claude Code tools"
    
    if [[ $tools == *"Edit"* ]] || [[ $tools == *"Write"* ]] || [[ $tools == *"MultiEdit"* ]]; then
        if [[ $changed_files == *".md"* ]]; then
            commit_msg="docs: update documentation"
        elif [[ $changed_files == *"prisma"* ]]; then
            commit_msg="feat: update database schema"
        elif [[ $changed_files == *"test"* ]] || [[ $changed_files == *"spec"* ]]; then
            commit_msg="test: update tests"
        elif [[ $changed_files == *"src/"* ]]; then
            commit_msg="feat: update application code"
        fi
    fi
    
    # Full commit message with Claude attribution
    cat <<EOF
$commit_msg

Tools used: $tools
Files modified: $changed_files

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
}

# Function to commit changes
commit_changes() {
    local tools="$1"
    
    echo -e "${YELLOW}📝 Staging changes for commit...${NC}"
    
    # Add all modified and new files (but not deleted files unless explicitly staged)
    git add -A
    
    # Generate commit message
    local commit_message=$(generate_commit_message "$tools")
    
    echo -e "${YELLOW}💾 Committing changes...${NC}"
    
    # Commit with the generated message
    if git commit -m "$commit_message"; then
        echo -e "${GREEN}✅ Changes committed successfully${NC}"
        echo -e "${BLUE}📊 Commit details:${NC}"
        git log --oneline -1
    else
        echo -e "${RED}❌ Failed to commit changes${NC}"
        exit 1
    fi
}

# Main execution
main() {
    check_git_repo
    
    if ! has_changes; then
        echo -e "${BLUE}ℹ️ No changes to commit${NC}"
        exit 0
    fi
    
    echo -e "${BLUE}📋 Changes detected. Tools used: $TOOLS_USED${NC}"
    
    # Run quality checks before committing
    run_quality_checks
    
    # Commit the changes
    commit_changes "$TOOLS_USED"
    
    echo -e "${GREEN}🎉 Auto-commit completed successfully${NC}"
}

# Run main function
main "$@"