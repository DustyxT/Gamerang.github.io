# 🚀 Gamerang Production Environment Setup

## 🌐 **Production Deployment Checklist**

### **IMMEDIATE ACTION: Database Cleanup**
**Run these commands in your Supabase SQL Editor FIRST:**

```sql
-- Remove conflicting get_thread_list functions
DROP FUNCTION IF EXISTS public.get_thread_list(integer, integer, text, text);
DROP FUNCTION IF EXISTS public.get_thread_list(integer, integer, uuid, text);

-- Verify only one function remains
SELECT proname, pronargs, proargtypes::regtype[] 
FROM pg_proc 
WHERE proname = 'get_thread_list';
```

Expected result: Only one function with `[0:3]={integer,integer,text,uuid}` should remain.

---

### **Phase 4.1: Environment Configuration**

#### **Required Environment Variables**
```env
# Production Supabase Configuration
VITE_SUPABASE_URL=your-production-supabase-url
VITE_SUPABASE_ANON_KEY=your-production-anon-key

# File Upload Limits
MAX_FILE_SIZE=52428800
MAX_FILES_PER_UPLOAD=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
NODE_ENV=production
LOG_LEVEL=warn
```

### **Phase 4.2: Database Optimization**

#### **Performance Indexes**
```sql
-- Add these indexes for better performance
CREATE INDEX IF NOT EXISTS idx_threads_category_created ON threads(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_pinned_created ON threads(is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thread_replies_thread_created ON thread_replies(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_games_genre_created ON games(genre, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
```

### **Phase 4.3: Security Headers**

#### **Add to your web server configuration:**
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### **Phase 4.4: Performance Optimization**

#### **Static File Caching**
```nginx
location /public/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    gzip on;
}
```

---

## ✅ **Production Launch Checklist**

**Critical (Must Do):**
- [ ] Database RPC functions cleaned up ⚠️ **URGENT**
- [ ] SSL certificate installed
- [ ] Environment variables configured
- [ ] Security headers added

**Important (Should Do):**
- [ ] Database indexes created
- [ ] Performance monitoring setup
- [ ] Error tracking configured
- [ ] Backup strategy implemented

**Nice to Have:**
- [ ] Load testing completed
- [ ] Advanced monitoring alerts
- [ ] CDN configuration

---

## 🚀 **Quick Deploy Steps**

1. **Fix database** (run SQL commands above)
2. **Configure environment variables**
3. **Add security headers**
4. **Test thoroughly**
5. **Launch! 🎉**

**Your Gamerang platform is incredibly close to production ready!** 