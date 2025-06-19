# 🚀 Deploy Gamerang to Vercel (Recommended)

## 🌟 **Why Vercel?**
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Custom domains included
- ✅ Automatic deployments from GitHub
- ✅ Better performance than GitHub Pages

## 📋 **Quick Setup (3 minutes)**

### **Step 1: Connect GitHub to Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Sign up with your **GitHub account**
3. Click **"New Project"**
4. **Import** your `Gamerang` repository

### **Step 2: Configure Build Settings**
```json
{
  "buildCommand": "",
  "outputDirectory": "public",
  "installCommand": "",
  "framework": "other"
}
```

### **Step 3: Add Custom Domain**
1. In Vercel dashboard → **Domains**
2. Add your domain: `gamerang.com`
3. Update your domain's DNS settings:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   
   Type: A
   Name: @
   Value: 76.76.19.61
   ```

---

## 🔧 **Create vercel.json Configuration**

Create `vercel.json` in your repository root:

```json
{
  "version": 2,
  "public": true,
  "github": {
    "silent": true
  },
  "cleanUrls": true,
  "trailingSlash": false,
  "routes": [
    {
      "src": "/",
      "dest": "/public/index.html"
    },
    {
      "src": "/forum",
      "dest": "/public/forum.html"
    },
    {
      "src": "/games",
      "dest": "/public/games.html"
    },
    {
      "src": "/submit",
      "dest": "/public/gamesubmit.html"
    },
    {
      "src": "/public/(.*)",
      "dest": "/public/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

---

## 🌐 **Environment Variables**

In Vercel dashboard → **Settings** → **Environment Variables**:

```
VITE_SUPABASE_URL=https://pjlzzuoplxrftrqbhbfl.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## ⚡ **Auto-Deploy Setup**

Vercel automatically deploys when you push to GitHub:

1. **Production**: Push to `main` branch
2. **Preview**: Push to any other branch
3. **Pull Requests**: Automatic preview deployments

---

## 🎯 **Your Site URLs**

- **Vercel URL**: `https://gamerang.vercel.app`
- **Custom Domain**: `https://gamerang.com`
- **Preview**: `https://gamerang-git-[branch].vercel.app` 