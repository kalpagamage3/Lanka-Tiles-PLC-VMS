# Lanka Tiles VMS (Visitor Management System) — GitHub Pages Deployment Guide

This repository contains the high-fidelity, polished, responsive Lanka Tiles PLC Visitor Management Web Application.

We have updated the project configuration (`vite.config.ts`) to use **relative base paths** (`base: './'`). This fixes the common "white screen" error on GitHub Pages by ensuring the browser correctly finds all compiled CSS and JavaScript assets under your repository's subfolder!

---

## 🚀 Deployment Options for GitHub

You can deploy this application to GitHub Pages using either of the two methods below.

### Option A: Fully Automated GitHub Actions Deployment (Easiest & Highly Recommended!)
We have pre-configured a top-tier **GitHub Actions Workflow** (`.github/workflows/deploy.yml`) in this repository. This means GitHub will automatically build your React+Vite app and deploy it for you in the cloud every time you upload your code!

To activate this in **2 simple clicks**:
1. Go to your GitHub repository in your web browser.
2. Click on **Settings** (the gear icon tab in the top navigation bar of your repo page).
3. On the left sidebar menu under "Code and automation", click on **Pages**.
4. In the **Build and deployment > Source** section, change the dropdown from **"Deploy from a branch"** to **"GitHub Actions"**.
5. **That is it!** Go to the **Actions** tab at the top of your repository to watch the deployment run. It will be live and fully functional in under 60 seconds with no command line required!

---

### Option B: The Standalone Single-File Version (Zero Build Tools Needed!)
If you just want a single, zero-dependency static HTML file to double-click locally or upload directly:
1. Locate the file **`/public/index-standalone.html`** in this repository.
2. Rename it to `index.html` and move it to the root of your folder.
3. Commit and push it directly to your GitHub repository or host it anywhere.
4. It works instantly using web-hosted CDNs for React, Babel, and Tailwind, persisting your database state locally inside your browser via HTML5 `localStorage`!

---

### Option C: Manual Command-Line Build & Deploy (For Developers)
If you prefer to compile and deploy the optimized production bundle manually from your local machine:

#### Step 1: Export the Code from AI Studio
1. Open the AI Studio project settings menu (the **Gear Icon ⚙️** at the top right of the screen).
2. Click **Export ZIP** or connect your **GitHub account** to push the repository automatically.

#### Step 2: Build the Application
If you downloaded the code as a ZIP, open your terminal in the extracted folder and run:
```bash
# Install dependencies
npm install

# Build static files
npm run build
```
This compilation outputs all optimized assets cleanly inside the **`dist/`** directory.

#### Step 3: Deploy `dist` to GitHub Pages
To publish the `dist/` directory to GitHub Pages, you can use the official `gh-pages` helper:
```bash
# Install the gh-pages tool
npm install -g gh-pages

# Publish the build directory
npx gh-pages -d dist
```

Alternatively, you can commit and push the contents of your `dist/` folder directly to a branch named `gh-pages` in your GitHub repository, and choose `gh-pages` as the source in your **Settings > Pages** UI!

---

Developed for **Lanka Tiles PLC**. Optimized for high-contrast manufacturing floor environments and client compliance audits.
