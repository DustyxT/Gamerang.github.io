# 🚀 Deploy Gamerang to Netlify

## 🌟 **Why Netlify?**
- ✅ Drag & drop deployment
- ✅ Free custom domains
- ✅ Automatic HTTPS
- ✅ Form handling
- ✅ Split testing

## 📋 **Quick Setup (2 minutes)**

### **Method 1: GitHub Integration**
1. Go to [netlify.com](https://netlify.com)
2. Sign up with **GitHub**
3. Click **"New site from Git"**
4. Choose **GitHub** → Select `Gamerang` repository
5. Build settings:
   ```
   Build command: (leave empty)
   Publish directory: public
   ```

### **Method 2: Drag & Drop**
1. Zip your `public` folder
2. Go to [netlify.com](https://netlify.com)
3. Drag the zip file to the deploy area
4. Done! Your site is live

---

## 🔧 **Create netlify.toml Configuration**

Create `netlify.toml` in repository root:

```toml
[build]
  publish = "public"

[[redirects]]
  from = "/forum"
  to = "/forum.html"
  status = 200

[[redirects]]
  from = "/games"
  to = "/games.html"
  status = 200

[[redirects]]
  from = "/submit"
  to = "/gamesubmit.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"

[[headers]]
  for = "/js/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000"

[[headers]]
  for = "/css/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000"
```

---

## 🌐 **Custom Domain Setup**

1. In Netlify dashboard → **Domain settings**
2. Add custom domain: `gamerang.com`
3. Update DNS records:
   ```
   Type: CNAME
   Name: www
   Value: your-site.netlify.app
   
   Type: A
   Name: @
   Value: 75.2.60.5
   ```

---

## 📊 **Your Site URLs**

- **Netlify URL**: `https://gamerang.netlify.app`
- **Custom Domain**: `https://gamerang.com` 