# Lanka Tiles VMS (Visitor Management System) — GitHub Pages Deployment Guide

This repository contains the high-fidelity, polished, responsive Lanka Tiles PLC Visitor Management Web Application.

We have updated the project configuration (`vite.config.ts`) to use **relative base paths** (`base: './'`). This fixes the common "white screen" error on GitHub Pages by ensuring the browser correctly finds all compiled CSS and JavaScript assets under your repository's subfolder!

---

## 🚀 Deployment Options for GitHub

You can deploy this application to GitHub Pages using either of the two methods below.

### Option A: The Standalone Single-File Version (Easiest)
If you want to host the app instantly as a single `.html` file with zero build tools:
1. Locate `/public/index-standalone.html` in this project.
2. Rename it to `index.html`.
3. Upload it directly to your GitHub repository.
4. Enable **GitHub Pages** under repository **Settings > Pages** from the `main` or `master` branch.
5. Your application will load instantly with simulated local database persistence (utilizing HTML5 `localStorage` securely inside your browser)!

---

### Option B: Deploying the Standard React + Vite Build (Recommended)
This deploys the full-performance, optimized React bundle:

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
