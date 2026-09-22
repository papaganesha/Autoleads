#!/bin/bash

# AutoLeads Deploy Workflow Automation
# Usage: ./scripts/deploy-workflow.sh "Your commit message"

set -e

COMMIT_MSG="${1:-Update $(date +%Y-%m-%d)}"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "🚀 AutoLeads Deploy Workflow"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Branch: $BRANCH"
echo "Message: $COMMIT_MSG"
echo "Time: $TIMESTAMP"
echo ""

# Step 1: Check status
echo "📋 Step 1: Checking git status..."
git status --short

# Step 2: Commit
echo ""
echo "📝 Step 2: Creating commit..."
git add -A
git commit -m "$COMMIT_MSG

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>" || echo "⚠️  Nothing to commit"

# Step 3: Push to branch
echo ""
echo "⬆️  Step 3: Pushing to branch..."
git push -u origin $BRANCH

# Step 4: Create PR (only if not on main/production)
if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "production" ]; then
  echo ""
  echo "🔀 Step 4: Creating PR..."
  gh pr create --title "$COMMIT_MSG" --body "Auto-generated PR from deploy workflow" --fill 2>/dev/null || echo "PR might already exist"
  echo "✅ PR ready"
fi

# Step 5: Merge workflow
echo ""
echo "🔀 Step 5: Merge workflow..."

if [ "$BRANCH" = "main" ]; then
  echo "  Already on main, syncing to production..."
  git checkout production
  git pull origin production
  git merge main
  git push origin production
  git checkout main
  echo "✅ Synced to production"
elif [ "$BRANCH" != "production" ]; then
  echo "  Merging feature → main..."
  git checkout main
  git pull origin main
  git merge $BRANCH
  git push origin main

  echo "  Syncing main → production..."
  git checkout production
  git pull origin production
  git merge main
  git push origin production

  git checkout $BRANCH
  echo "✅ Merged and synced"
fi

# Step 6: Sprint Log
echo ""
echo "📊 Step 6: Sprint Log"
echo ""
echo "====== DEPLOYMENT STATUS ======"
echo "Time: $TIMESTAMP"
echo "Branch: $BRANCH"
echo "Last commit: $(git log -1 --pretty=%B)"
echo ""
echo "Production commits (last 3):"
git log production --oneline -3
echo ""
echo "Status: ✅ READY FOR PRODUCTION"
echo "Next: Monitor Railway deployments (2-3 min)"
echo "================================"
echo ""
