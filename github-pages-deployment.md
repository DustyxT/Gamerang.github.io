# 🚀 Deploy Gamerang to GitHub Pages

## 📋 **Quick Setup (5 minutes)**

### **Step 1: Prepare Repository**
```bash
# Make sure you're on the main branch
git checkout main

# Move all files from /public to root (GitHub Pages serves from root)
git mv public/* .
git mv public/.* . 2>/dev/null || true
rmdir public

# Commit changes
git add .
git commit -m "🚀 Prepare for GitHub Pages deployment"
git push origin main
```

### **Step 2: Enable GitHub Pages**
1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll to **Pages** section (left sidebar)
4. Under **Source**, select **"Deploy from a branch"**
5. Choose **"main"** branch and **"/ (root)"** folder
6. Click **Save**

### **Step 3: Custom Domain (Optional)**
1. In the **Pages** section, add your custom domain
2. Enable **"Enforce HTTPS"**
3. GitHub will provide SSL certificate automatically

---

## 🌐 **Your Site URLs**

- **GitHub URL**: `https://dustyxt.github.io/Gamerang/`
- **Custom Domain**: `https://yourdomain.com` (if configured)

---

## ⚡ **Auto-Deploy with GitHub Actions**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## 🔧 **File Structure After Move**

Your repository root should look like:
```
/
├── index.html          (moved from public/)
├── forum.html          (moved from public/)
├── games.html          (moved from public/)
├── js/                 (moved from public/js/)
├── css/                (moved from public/css/)
├── images/             (moved from public/images/)
└── .github/workflows/deploy.yml
``` 