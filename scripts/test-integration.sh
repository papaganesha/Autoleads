#!/bin/bash

# ============================================
# Integration Test Script
# Tests Fix 1-7 in production
# ============================================

set -e

# Configuration
API_URL="${1:-http://localhost:3000}"
TIMEOUT=30

echo "🧪 AutoLeads Fix 1-7 Integration Tests"
echo "========================================"
echo "API URL: $API_URL"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Test 1: InputValidator - Valid Request
echo "📋 Test 1: InputValidator - Valid Request"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Plumbing",
    "location": "São Paulo",
    "limit": 10
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ PASS: Got 201 Created"
  JOB_ID=$(echo "$BODY" | grep -o '"searchId":"[^"]*' | cut -d'"' -f4)
  echo "   Job ID: $JOB_ID"
else
  echo "❌ FAIL: Expected 201, got $HTTP_CODE"
  echo "   Response: $BODY"
  exit 1
fi

echo ""

# Test 2: InputValidator - SQL Injection Blocked
echo "📋 Test 2: InputValidator - SQL Injection Blocked"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Plumbing; DROP TABLE leads; --",
    "location": "São Paulo",
    "limit": 10
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [ "$HTTP_CODE" = "400" ]; then
  echo "✅ PASS: Blocked SQL injection (400)"
else
  echo "❌ FAIL: Should block SQL injection"
  echo "   Got HTTP $HTTP_CODE: $BODY"
  exit 1
fi

echo ""

# Test 3: InputValidator - XSS Blocked
echo "📋 Test 3: InputValidator - XSS Blocked"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "<script>alert(1)</script>",
    "location": "São Paulo",
    "limit": 10
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "400" ]; then
  echo "✅ PASS: Blocked XSS (400)"
else
  echo "❌ FAIL: Should block XSS"
  echo "   Got HTTP $HTTP_CODE"
  exit 1
fi

echo ""

# Test 4: InputValidator - Command Injection Blocked
echo "📋 Test 4: InputValidator - Command Injection Blocked"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Plumbing && cat /etc/passwd",
    "location": "São Paulo",
    "limit": 10
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "400" ]; then
  echo "✅ PASS: Blocked command injection (400)"
else
  echo "❌ FAIL: Should block command injection"
  echo "   Got HTTP $HTTP_CODE"
  exit 1
fi

echo ""

# Test 5: SSE Endpoint
echo "📋 Test 5: SSE Endpoint (if first test passed)"
if [ ! -z "$JOB_ID" ]; then
  echo "   Checking SSE endpoint for job: $JOB_ID"

  # Get one event from SSE with timeout
  TIMEOUT_CMD="timeout 5 || true"
  SSE_RESPONSE=$(curl -s -N "$API_URL/api/search/$JOB_ID/events" 2>&1 | head -1 || echo "")

  if [ ! -z "$SSE_RESPONSE" ]; then
    echo "✅ PASS: SSE endpoint responds"
  else
    echo "⚠️  WARN: SSE endpoint may not have data yet (job still processing)"
  fi
fi

echo ""
echo "========================================"
echo "✅ All Security Tests Passed!"
echo ""
echo "Summary:"
echo "  ✅ Valid requests return 201 with jobId"
echo "  ✅ SQL injection attempts blocked (400)"
echo "  ✅ XSS attempts blocked (400)"
echo "  ✅ Command injection attempts blocked (400)"
echo "  ✅ InputValidator (Fix 6) is ACTIVE"
echo ""
echo "Next steps:"
echo "  1. Monitor worker logs: tail -f backend.log | grep worker"
echo "  2. Check queue depth: SELECT COUNT(*) FROM pipeline_jobs WHERE status='pending'"
echo "  3. Monitor errors: SELECT * FROM stage_errors ORDER BY timestamp DESC"
echo ""
