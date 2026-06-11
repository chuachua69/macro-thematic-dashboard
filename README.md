# Macro-Thematic Investing: Multi-Agent Simulation Dashboard

An interactive, high-fidelity Single-Page Application (SPA) dashboard that models and demonstrates the computational architecture for **Macro-Thematic Investing** and top-down systemic liquidity. Inspired by the investment principles of Stanley Druckenmiller, this application simulates a decoupled multi-agent workflow that scans institutional capital flows, filters equities based on Peter Lynch’s GARP criteria, extracts material risk factors from 10-K filings using NLP, traces supply chain networks for secondary winners, and executes trades within rigorous quantitative compliance guardrails.

---

## Key Features & Component Mappings

### 1. Systemic Liquidity Simulator (MDP Engine)
- **Mathematical Modeling**: Implements a unified Markov Decision Process (MDP) solver in JavaScript. Adjusting systemic liquidity sliders (Central Bank balance sheet expansion $\Delta CB_t$, repo rate volatility spread $\sigma_{repo}$, and sovereign yield curve velocity $\Delta Y$) recalculates the rolling risk-aversion penalty weight ($\gamma_t$), max target beta, and leverage parameters in real time.
- **Dynamic Asset Allocation**: Simulates capital rotation between **Equities**, **Macro Commodities**, and **Sovereign Fixed Income / Cash** depending on whether the system detects a Liquidity Expansion or Liquidity Contraction regime.

### 2. SEC 13F-HR Bipartite Network
- **Bipartite Topology**: Renders an interactive SVG-based graph illustrating the relationships between top asset managers (squares) and candidate equities (circles). 
- **XML Ingestion Stream**: Displays real-time logs simulating high-performance C-level XML parsing pipelines from SEC EDGAR.
- **Network Science Metrics**: Hovering over nodes dynamically calculates positioning metrics (centrality scores, clustering coefficients, value thresholds).

### 3. Algorithmic Filtering & 10-K NLP Pipeline
- **Peter Lynch GARP Screener**: Runs a scoring calculation across PEG, PE vs. Inflation (Lynch Rule of 20), and Debt/Equity metrics.
- **Multi-Stage Semantic Risk Extraction**: Visually steps through the three-stage NLP extraction pipeline (LLM extraction, embedding-based taxonomy vector mapping, and LLM-as-a-judge validation) of corporate risk factors.

### 4. Supply Chain Traversal & Bottleneck Mapping
- **Quintuplet Data Model**: Maps multi-hop relations ($Subject \rightarrow Object$) along withContext Qualifiers, Revenue Exposure ($>10\%$), and confidence levels.
- **Traversal Flow**: Highlights upstream bottlenecks (e.g., AI Compute hardware constraints leading to grid capacity delays, identifying ASML or Midstream Natural Gas as secondary winners).

### 5. FINSABER Backtesting Sandbox
- **Line Charts**: Interactive 10-year (2016-2026) equity curve comparison (Macro-Thematic Strategy vs. S&P 500) rendered on an HTML5 canvas.
- **Compliance Log Stream**: Demonstrates deterministic operational rules (45-day look-ahead disclosure lag filters, 20% sector exposure caps, and volume liquidity thresholds) filtering trade entries.

### 6. Exploratory Sizing Console
- **Pilot Trader**: Allows users to initiate exploratory pilot trades at 0.5% NAV.
- **Feedback Loops**: Simulates live price momentum feedback, allowing manual scaling up to 5% NAV or complete liquidation (Exit).

---

## How to Run Locally

Since this dashboard is built with vanilla HTML, CSS, and JavaScript, it requires **no dependencies, installation, or compilers**.

1. Double-click [index.html](file:///c:/Users/chuaz/OneDrive/Desktop/Antigravity%20Work%20Space/index.html) to open the dashboard directly in your browser.
2. Alternatively, run a simple local HTTP server from your workspace:
   ```bash
   npx serve .
   # or
   python -m http.server 8000
   ```
   Open `http://localhost:8000` or `http://localhost:3000` in your browser.

---

## How to Publish to GitHub & GitHub Pages

To save your code to GitHub and host this dashboard as a free public website, run the following commands in your shell:

### Step 1: Commit Your Changes Locally
Initialize your git repository (already done) and commit the codebase:
```bash
git add .
git commit -m "feat: Initial release of Macro-Thematic Investing Simulation Dashboard MVP"
```

### Step 2: Push to a New GitHub Repository
1. Go to [GitHub](https://github.com/) and create a new repository (e.g., `macro-thematic-dashboard`).
2. Do **not** initialize it with a README, gitignore, or license.
3. Link your local repository to GitHub and push:
```bash
# Replace with your actual GitHub username and repository name
git remote add origin https://github.com/YOUR_USERNAME/macro-thematic-dashboard.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy to GitHub Pages
To make the app live on the web:
1. In your GitHub repository, navigate to **Settings** &rarr; **Pages** (in the left sidebar).
2. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
3. Set **Branch** to `main` and path to `/ (root)`.
4. Click **Save**.
5. Within 1-2 minutes, GitHub will host your site at:
   `https://YOUR_USERNAME.github.io/macro-thematic-dashboard/`
