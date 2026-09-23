# 🚀 GO-LIVE GUIDE: Fix 1-7 Production Deployment

**Status**: ✅ Production branch ready  
**Last updated**: 2026-09-23  
**Estimated time**: 20-25 minutes

---

## ⚡ Quick Summary

All Fix 1-7 code is **merged to production branch** and ready to deploy. Follow these 4 steps to go live:

1. **Supabase**: Apply database migrations (5 min)
2. **Railway**: Auto-deploys when production branch updates (5-10 min)
3. **Worker**: Start background job consumer (2 min)
4. **Verify**: Run integration tests (5 min)

---

## STEP 1️⃣: Supabase - Apply Migrations (5 min)

### Action
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy ALL content from this file:
   ```
   supabase/migrations/20260922_fix_1_7_integration.sql
   ```
3. Paste into Supabase SQL Console
4. Click **Run**
5. Verify output shows 3 tables created: `pipeline_jobs`, `search_checkpoints`, `stage_errors`

### What it does
- Creates `pipeline_jobs` table (async job queue)
- Creates `search_checkpoints` table (SSE checkpoint/resume)
- Creates `stage_errors` table (error logging)
- Adds indexes for performance
- Grants appropriate permissions

### Verify Success
```sql
SELECT tablename FROM pg_tables 
WHERE tablename IN ('pipeline_jobs', 'search_checkpoints', 'stage_errors');
```
Expected: 3 rows returned ✅

---

## STEP 2️⃣: Railway - Auto-Deploy (5-10 min)

### What happens automatically
- Railway monitors `production` branch
- When new commits push to production, Railway auto-detects
- Rebuilds backend service
- Auto-deploys if build successful
- No manual action needed!

### Monitor Progress
1. Go to **Railway Dashboard** → Your Project
2. Watch **Deployments** tab
3. Should see a new deployment starting (look for "Building...")
4. Wait for status: **Deployed ✅**

### If deployment fails
- Check **Logs** tab for error messages
- Common issues:
  - Missing environment variables (check `.env.production`)
  - Node module issues (try rebuild)
  - Database connection failure

---

## STEP 3️⃣: Worker - Start Background Process (2 min)

### Option A: SSH into Railway Backend (Recommended)
```bash
# SSH into Railway backend container
railway shell

# Start worker process
cd backend && node worker.js
```

### Option B: Add to Procfile (Railway Native)
Edit `Procfile` in project root:
```
web: npm start
worker: node backend/worker.js
```
Then restart Railway service.

### Verify Worker Started
Look for these log lines:
```
[worker-XXXXXXX] ⚙️  Initializing worker...
[worker-XXXXXXX] ✅ Dedup cache warmed: XXXXX places
[worker-XXXXXXX] ✅ Pipeline queue initialized
[worker-XXXXXXX] 🚀 Worker ready, polling queue...
```

---

## STEP 4️⃣: Verify - Run Integration Tests (5 min)

### Quick Test (Local or SSH)
```bash
# From project root
bash scripts/test-integration.sh

# Or against production URL
bash scripts/test-integration.sh https://autoleads.railway.app
```

### Manual Test (Using curl)

**Test 1: Valid request returns jobId**
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Plumbing",
    "location": "São Paulo",
    "limit": 10
  }'
```
Expected response:
```json
{
  "searchId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing"
}
```
✅ **PASS**: Got 201 with jobId

**Test 2: SQL injection blocked**
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Plumbing; DROP TABLE leads; --",
    "location": "São Paulo",
    "limit": 10
  }'
```
Expected: `400` error  
✅ **PASS**: InputValidator blocked attack

**Test 3: XSS blocked**
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "category": "<script>alert(1)</script>",
    "location": "São Paulo",
    "limit": 10
  }'
```
Expected: `400` error  
✅ **PASS**: XSS blocked

### Database Verification
```sql
-- Check queue is working
SELECT COUNT(*) as job_count FROM pipeline_jobs WHERE status='pending';

-- Check no errors yet (first few minutes should be clean)
SELECT * FROM stage_errors ORDER BY timestamp DESC LIMIT 5;

-- Check dedup cache worked
SELECT COUNT(DISTINCT google_place_id) as cached_places FROM leads;
```

---

## ✅ Success Criteria

After all 4 steps, you're live when:

- [ ] Supabase migrations applied (3 tables visible)
- [ ] Railway deployment successful (status: Deployed)
- [ ] Worker process running (logs show "polling queue")
- [ ] Test requests return 201 with jobId
- [ ] Security tests pass (SQL/XSS/command injection blocked)
- [ ] No errors in first 5 minutes (stage_errors table empty)

---

## 📊 Monitor After Go-Live

### Key Metrics
```sql
-- Queue depth (should stay < 10)
SELECT COUNT(*) FROM pipeline_jobs WHERE status='pending';

-- Error rate (should be < 5%)
SELECT stage, COUNT(*) FROM stage_errors GROUP BY stage;

-- Processing time (should be 30-120s per search)
SELECT 
  search_id, 
  (completed_at - created_at) / 1000 as duration_sec 
FROM pipeline_jobs 
WHERE status='completed' 
ORDER BY completed_at DESC 
LIMIT 10;

-- Worker health (should show continuous polling)
SELECT * FROM logs WHERE source='worker' ORDER BY timestamp DESC LIMIT 20;
```

### Alert Thresholds
- **Queue depth** > 50 → Scale workers
- **Error rate** > 10% → Investigate stage_errors
- **Processing time** > 300s → Check API latency
- **No logs** for 5+ min → Worker may have crashed

---

## 🔧 Troubleshooting

### Worker not starting
```bash
# Check if node_modules installed
cd backend && npm install

# Check logs for errors
tail -f /var/log/railway/worker.log

# Manually restart
railway restart
```

### Queue backing up
```bash
# Scale workers (start 2-3 instances)
railway scale worker=3

# Check for errors
SELECT * FROM stage_errors WHERE created_at > NOW() - INTERVAL '5 min';

# Investigate slow stages
SELECT stage, AVG(error_count) FROM stage_errors GROUP BY stage;
```

### 404 on /api/search endpoint
- Worker might not be running
- Check InputValidator is imported in search.js
- Verify backend service deployed successfully

### SSE not streaming updates
- Check worker logs for "polling queue"
- Verify searchEvents module is working
- Check browser console for connection errors

---

## 🆘 Rollback Plan

If critical issues arise:

### Stop Worker (Immediate)
```bash
# SSH into Railway
railway shell

# Kill worker
ps aux | grep worker.js
kill <PID>
```

### Revert Code (if needed)
```bash
# Go back to previous working commit
git reset --hard <previous-commit>
git push -f origin production
```

### Drop Tables (if needed)
```sql
DROP TABLE IF EXISTS pipeline_jobs;
DROP TABLE IF EXISTS search_checkpoints;
DROP TABLE IF EXISTS stage_errors;
```

---

## 📞 Getting Help

### Check logs first
```bash
# Railway backend logs
railway logs -t backend

# Worker-specific logs
railway logs -t worker

# Follow live
railway logs --follow
```

### Common error messages
- `ECONNREFUSED` → Redis not available
- `column does not exist` → Migrations not applied
- `module not found` → npm install missing
- `Error: Cannot enqueue job` → Queue DB unavailable

---

## ✨ Timeline

| Step | Time | Action |
|------|------|--------|
| 1 | 5 min | Paste SQL in Supabase |
| 2 | 5-10 min | Wait for Railway auto-deploy |
| 3 | 2 min | Start worker via SSH/Procfile |
| 4 | 5 min | Run test-integration.sh |
| **Total** | **~20 min** | **🚀 Live!** |

---

## 🎉 You're Done!

When all 4 steps complete and tests pass:

✅ InputValidator is ACTIVE (blocking attacks)  
✅ Async queue is LIVE (processing in background)  
✅ Error logging is WORKING (debugging enabled)  
✅ Worker is RUNNING (enriching leads)  
✅ All 7 fixes DEPLOYED (production ready)

🚀 **AutoLeads is now running with enterprise-grade security and scalability!**

---

## 📝 Notes

- Worker will auto-retry failed jobs up to 3 times
- Cache is warmed on worker startup (takes ~2 min for 10k places)
- SSE updates stream in real-time as workers process
- All errors logged to `stage_errors` table for debugging

Questions? Check `DEPLOYMENT-SUMMARY.md` or `INTEGRATION-STATUS.md`
