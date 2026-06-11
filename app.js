// app.js - Macro-Thematic Investing Simulation Engine

// Global App State
const state = {
    // Macro Liquidity Variables
    cbExpansion: 4.2,   // % per week
    repoSpread: 0.12,   // bps
    yieldVelocity: 0.15, // bps/month
    
    // Calculated MDP Weights
    lambdaF: 0.050,     // Transaction cost friction
    gammaT: 0.250,      // Risk aversion penalty
    maxBeta: 1.20,      // Max portfolio equity beta
    maxLeverage: 1.50,  // Max leverage multiplier
    
    // Allocations
    allocations: {
        equities: 55,
        commodities: 25,
        cash: 20
    },

    // Active View
    currentView: 'dashboard',
    
    // NLP 10-K pipeline step
    nlpStep: 1,
    
    // Pilot Trades
    pilotTrades: []
};

// SVG data assets
const bipartiteGraphData = {
    managers: [
        { id: 'appaloosa', name: 'Appaloosa L.P.', cik: '0001003007', centrality: '0.88', coeff: '0.42', y: 40, cap: '$8.4B' },
        { id: 'duquesne', name: 'Duquesne Family Office', cik: '0001494530', centrality: '0.94', coeff: '0.38', y: 120, cap: '$3.2B' },
        { id: 'soros', name: 'Soros Fund Mgmt', cik: '0001029160', centrality: '0.81', coeff: '0.49', y: 200, cap: '$6.5B' },
        { id: 'elliott', name: 'Elliott Investment Mgmt', cik: '0001048477', centrality: '0.78', coeff: '0.31', y: 280, cap: '$14.2B' }
    ],
    equities: [
        { id: 'asml', name: 'ASML Holding (ASML)', cusip: '00206R102', value: '$840M', sector: 'Semiconductors', y: 30 },
        { id: 'tsm', name: 'TSMC (TSM)', cusip: '874039100', value: '$1.2B', sector: 'Semiconductors', y: 100 },
        { id: 'gld', name: 'SPDR Gold Shares (GLD)', cusip: '78463V101', value: '$450M', sector: 'Precious Metals', y: 170 },
        { id: 'nvda', name: 'NVIDIA Corp (NVDA)', cusip: '67066G104', value: '$1.8B', sector: 'AI Compute', y: 245 },
        { id: 'eqt', name: 'EQT Resources (EQT)', cusip: '26884L109', value: '$310M', sector: 'Energy Infrastructure', y: 305 }
    ],
    links: [
        { manager: 'appaloosa', equity: 'tsm', val: 4 },
        { manager: 'appaloosa', equity: 'nvda', val: 5 },
        { manager: 'duquesne', equity: 'asml', val: 5 },
        { manager: 'duquesne', equity: 'tsm', val: 3 },
        { manager: 'duquesne', equity: 'gld', val: 2 },
        { manager: 'soros', equity: 'gld', val: 4 },
        { manager: 'soros', equity: 'eqt', val: 3 },
        { manager: 'elliott', equity: 'nvda', val: 6 },
        { manager: 'elliott', equity: 'eqt', val: 4 }
    ]
};

const supplyChainData = {
    nodes: [
        { id: 'theme', name: 'AI Infrastructure', category: 'theme', x: 50, y: 160 },
        
        { id: 'nvda', name: 'NVIDIA (NVDA)', category: 'primary', x: 170, y: 80, ticker: 'NVDA', val: 'Primary Beneficiary' },
        { id: 'aapl', name: 'Apple (AAPL)', category: 'primary', x: 170, y: 240, ticker: 'AAPL', val: 'Primary Beneficiary' },
        
        { id: 'tsm', name: 'TSMC (TSM)', category: 'vendor', x: 300, y: 160, ticker: 'TSM', val: 'Tier-1 Silicon Vendor' },
        
        { id: 'euv', name: 'EUV Lithography', category: 'bottleneck', x: 420, y: 90, ticker: 'N/A', val: 'Hardware Bottleneck' },
        { id: 'power', name: 'Power Grid Gridlocks', category: 'bottleneck', x: 420, y: 230, ticker: 'N/A', val: 'Utility/Grid Bottleneck' },
        
        { id: 'asml', name: 'ASML Holding (ASML)', category: 'secondary-winner', x: 540, y: 90, ticker: 'ASML', val: 'Secondary Winner (Monopoly)' },
        { id: 'eqt', name: 'EQT Resources (EQT)', category: 'secondary-winner', x: 540, y: 230, ticker: 'EQT', val: 'Secondary Winner (Midstream)' }
    ],
    links: [
        { source: 'theme', target: 'nvda', type: 'REQUIRES' },
        { source: 'theme', target: 'aapl', type: 'REQUIRES' },
        { source: 'nvda', target: 'tsm', type: 'DEPENDS_ON' },
        { source: 'aapl', target: 'tsm', type: 'DEPENDS_ON' },
        
        { source: 'tsm', target: 'euv', type: 'HAS_BOTTLENECK' },
        { source: 'tsm', target: 'power', type: 'HAS_BOTTLENECK' },
        
        { source: 'euv', target: 'asml', type: 'SUPPLIED_BY' },
        { source: 'power', target: 'eqt', type: 'SUPPLIED_BY' }
    ]
};

// 10-K NLP Pipeline Mock Quotes
const nlpQuotes = [
    {
        stage: 1,
        quote: '"Our manufacturing lines face raw material delivery limits due to global optoelectronic component backlogs..."',
        taxonomy: 'Supply Chain Bottleneck &rarr; Component Delay',
        score: '0.96 / 1.0 (High Alignment)'
    },
    {
        stage: 2,
        quote: '"We are dependent on a limited number of suppliers for key equipment, including extreme ultraviolet lithography systems..."',
        taxonomy: 'Equipment Monopoly &rarr; Tool Constriction',
        score: '0.98 / 1.0 (Critical Risk)'
    },
    {
        stage: 3,
        quote: '"Delays in building connection lines to regional megawatt utilities could limit data center server deployments..."',
        taxonomy: 'Infrastructure BottleNeck &rarr; Grid capacity limit',
        score: '0.94 / 1.0 (Asymmetric Warning)'
    }
];

// FINSABER Backtest Data Simulation (2016-2026)
const backtestDates = Array.from({ length: 11 }, (_, i) => 2016 + i);
const backtestStrategyPoints = [100, 125, 160, 142, 210, 290, 275, 335, 410, 475, 512.5];
const backtestSp500Points = [100, 112, 134, 128, 155, 185, 172, 215, 248, 255, 264.2];

// Initialize on Load
window.addEventListener('DOMContentLoaded', () => {
    initRouter();
    initSliders();
    initBacktestChart();
    renderBipartiteNetwork();
    renderSupplyChainGraph();
    renderLynchScreener();
    startNLPPipelineLoop();
    startSimulationLoops();
    
    // Render initial states
    updateMDPCalculations();
});

// 1. Client-Side Hash Router
function initRouter() {
    const navigate = () => {
        const hash = window.location.hash || '#dashboard';
        const targetViewId = 'view-' + hash.substring(1);
        
        // Remove active class from all panels and nav items
        document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.bottom-nav-item').forEach(item => item.classList.remove('active'));
        
        // Active panel and nav link
        const targetPanel = document.getElementById(targetViewId);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
        
        const targetNav = document.getElementById('nav-' + hash.substring(1));
        if (targetNav) {
            targetNav.classList.add('active');
        }
        
        const targetBottomNav = document.getElementById('bottom-nav-' + hash.substring(1));
        if (targetBottomNav) {
            targetBottomNav.classList.add('active');
        }
        
        // Update header details
        const viewTitle = document.getElementById('view-title');
        const viewDesc = document.getElementById('view-description');
        
        state.currentView = hash.substring(1);
        
        switch (state.currentView) {
            case 'dashboard':
                viewTitle.innerText = "System Dashboard";
                viewDesc.innerText = "Global macro liquidity vector metrics & adaptive policy rules.";
                break;
            case 'agents':
                viewTitle.innerText = "Cognitive Agents Pod";
                viewDesc.innerText = "Multi-persona cognitive isolation. Review manager positions & qualitative screeners.";
                break;
            case 'supply-chain':
                viewTitle.innerText = "Supply Chain Graph Traversal";
                viewDesc.innerText = "Trace dependency vectors & target secondary bottlenecks.";
                break;
            case 'backtest':
                viewTitle.innerText = "FINSABER Compliance & Performance";
                viewDesc.innerText = "Multi-year validation engine with look-ahead bias filters.";
                // Force redraw of backtest chart
                initBacktestChart();
                break;
            case 'pilot':
                viewTitle.innerText = "Pilot Sizing Console";
                viewDesc.innerText = "Exploratory pilots and scaling execution guardrails.";
                break;
        }
    };
    
    window.addEventListener('hashchange', navigate);
    // Initial load check
    navigate();
}

// 2. Interactive Sliders & MDP State Calculations
function initSliders() {
    const cbSlider = document.getElementById('slider-cb-expansion');
    const repoSlider = document.getElementById('slider-repo-spread');
    const yieldSlider = document.getElementById('slider-yield-velocity');
    
    cbSlider.addEventListener('input', (e) => {
        state.cbExpansion = parseFloat(e.target.value);
        document.getElementById('val-cb-expansion').innerText = (state.cbExpansion >= 0 ? '+' : '') + state.cbExpansion.toFixed(1) + '% / wk';
        updateMDPCalculations();
    });
    
    repoSlider.addEventListener('input', (e) => {
        state.repoSpread = parseFloat(e.target.value);
        const repoValEl = document.getElementById('val-repo-spread');
        repoValEl.innerText = state.repoSpread.toFixed(2) + ' bps';
        if (state.repoSpread > 1.5) {
            repoValEl.className = 'val text-rose';
        } else if (state.repoSpread > 0.6) {
            repoValEl.className = 'val text-amber';
        } else {
            repoValEl.className = 'val text-emerald';
        }
        updateMDPCalculations();
    });
    
    yieldSlider.addEventListener('input', (e) => {
        state.yieldVelocity = parseFloat(e.target.value);
        document.getElementById('val-yield-velocity').innerText = (state.yieldVelocity >= 0 ? '+' : '') + state.yieldVelocity.toFixed(2) + ' bps/m';
        updateMDPCalculations();
    });
}

function updateMDPCalculations() {
    // Dynamic policy penalty calculations
    // Spike in repo spread raises risk aversion. CB expansion cushions it.
    state.gammaT = Math.max(0.05, 0.25 + (state.repoSpread * 0.35) - (state.cbExpansion * 0.04));
    
    // Leverage cap updates
    state.maxLeverage = Math.max(1.0, Math.min(2.0, 1.5 + (state.cbExpansion * 0.08) - (state.repoSpread * 0.22)));
    
    // Max target beta updates
    state.maxBeta = Math.max(0.40, Math.min(1.50, 1.20 + (state.cbExpansion * 0.05) - (state.repoSpread * 0.18)));
    
    // Update labels in UI
    document.getElementById('metric-gamma-t').innerText = state.gammaT.toFixed(3);
    document.getElementById('metric-max-beta').innerText = state.maxBeta.toFixed(2);
    document.getElementById('metric-max-leverage').innerText = state.maxLeverage.toFixed(2) + 'x';
    
    // Calculate allocations based on regime
    let eqAlloc = 55, commAlloc = 25, cashAlloc = 20;
    const regimeStatusEl = document.getElementById('mdp-regime-status');
    const policyBox = document.getElementById('policy-box');
    const policyIcon = document.getElementById('policy-icon');
    const policyTitle = document.getElementById('policy-title');
    const policyText = document.getElementById('policy-text');
    
    if (state.cbExpansion < -0.5 || state.repoSpread > 1.2) {
        // Contraction Regime (Risk-Off)
        regimeStatusEl.innerText = "Liquidity Contraction";
        regimeStatusEl.className = "val text-rose";
        
        policyBox.className = "policy-indicator-box contraction";
        policyIcon.innerText = "trending_down";
        policyIcon.className = "material-symbols-outlined text-rose";
        policyTitle.innerText = "DEFENSIVE REGIME ACTIVE";
        policyText.innerText = "Liquidity vectors contracting. Scaling back asset leverage, raising risk-aversion penalty weight (γ_t) to preserve capital.";
        
        // Reallocate capital to safe-havens
        eqAlloc = Math.max(15, Math.round(30 + (state.cbExpansion * 2.5) - (state.repoSpread * 6)));
        cashAlloc = Math.min(65, Math.round(40 - (state.cbExpansion * 3.5) + (state.repoSpread * 8)));
        commAlloc = 100 - eqAlloc - cashAlloc;
    } else {
        // Expansion Regime (Risk-On)
        regimeStatusEl.innerText = "Liquidity Expansion";
        regimeStatusEl.className = "val text-emerald";
        
        policyBox.className = "policy-indicator-box";
        policyIcon.innerText = "trending_up";
        policyIcon.className = "material-symbols-outlined text-emerald";
        policyTitle.innerText = "EXPANSIVE REGIME ACTIVE";
        policyText.innerText = "Systemic reserves are abundant. Scaling target beta and leverage caps upward to capture macro equity growth.";
        
        eqAlloc = Math.min(75, Math.round(55 + (state.cbExpansion * 2) - (state.repoSpread * 4)));
        commAlloc = Math.max(15, Math.round(25 + (state.yieldVelocity * 5)));
        cashAlloc = 100 - eqAlloc - commAlloc;
    }
    
    // Save allocations
    state.allocations.equities = eqAlloc;
    state.allocations.commodities = commAlloc;
    state.allocations.cash = cashAlloc;
    
    // Update progress bars
    document.getElementById('alloc-val-equities').innerText = eqAlloc + '%';
    document.getElementById('alloc-fill-equities').style.width = eqAlloc + '%';
    
    document.getElementById('alloc-val-commodities').innerText = commAlloc + '%';
    document.getElementById('alloc-fill-commodities').style.width = commAlloc + '%';
    
    document.getElementById('alloc-val-cash').innerText = cashAlloc + '%';
    document.getElementById('alloc-fill-cash').style.width = cashAlloc + '%';
    
    // Update warning alerts
    const alerts = [];
    if (state.cbExpansion < -3.0) {
        alerts.push({
            type: 'danger',
            title: 'Critical balance sheet contraction',
            desc: 'Fed winding down assets below target risk boundaries. Risk penalty scaling up.'
        });
    } else if (state.cbExpansion < 0) {
        alerts.push({
            type: 'warn',
            title: 'Minor reserve contraction underway',
            desc: 'Systemic liquidity pool shrinking. Tightening target allocations.'
        });
    }
    
    if (state.repoSpread > 1.8) {
        alerts.push({
            type: 'danger',
            title: 'Severe interbank funding stress',
            desc: 'Repo sensitivity spike indicates structural reserve shortage. Scale down equity beta.'
        });
    } else if (state.repoSpread > 0.8) {
        alerts.push({
            type: 'warn',
            title: 'Elevated funding rate volatility',
            desc: 'Interbank spread creeping up. Defensive positioning initiated.'
        });
    }
    
    if (state.yieldVelocity < -0.4) {
        alerts.push({
            type: 'warn',
            title: 'Yield curve inversion velocity',
            desc: 'Rapid flattening points to economic cooldown, warning flags up.'
        });
    }
    
    // Render Alerts
    const alertListEl = document.getElementById('radar-alert-list');
    alertListEl.innerHTML = '';
    
    if (alerts.length === 0) {
        alertListEl.innerHTML = `
            <li class="alert-item ok">
                <span class="material-symbols-outlined icon">check_circle</span>
                <div class="alert-content">
                    <strong>Central Bank reserves stable</strong>
                    <span>Weekly expansion above risk threshold.</span>
                </div>
            </li>
            <li class="alert-item ok">
                <span class="material-symbols-outlined icon">check_circle</span>
                <div class="alert-content">
                    <strong>Interbank spread minimal</strong>
                    <span>Repo spread below risk ceiling.</span>
                </div>
            </li>
        `;
    } else {
        alerts.forEach(al => {
            alertListEl.innerHTML += `
                <li class="alert-item ${al.type}">
                    <span class="material-symbols-outlined icon">${al.type === 'danger' ? 'report' : 'warning'}</span>
                    <div class="alert-content">
                        <strong>${al.title}</strong>
                        <span>${al.desc}</span>
                    </div>
                </li>
            `;
        });
    }
}

// 3. Cognitive Agent Navigation Tabs & Subviews
function switchAgentTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.agent-tab-content').forEach(content => content.classList.remove('active'));
    
    if (tabName === 'flow') {
        event.target.classList.add('active');
        document.getElementById('agent-tab-flow').classList.add('active');
        renderBipartiteNetwork();
    } else if (tabName === 'fundamental') {
        event.target.classList.add('active');
        document.getElementById('agent-tab-fundamental').classList.add('active');
        renderLynchScreener();
    }
}

// 13F Bipartite SVG Topology Renderer
function renderBipartiteNetwork() {
    const svg = document.getElementById('bipartite-svg');
    if (!svg) return;
    
    svg.innerHTML = ''; // Clear SVG
    
    const infoPanel = document.getElementById('node-info-panel');
    
    // Draw links
    bipartiteGraphData.links.forEach(l => {
        const mgrNode = bipartiteGraphData.managers.find(m => m.id === l.manager);
        const eqNode = bipartiteGraphData.equities.find(e => e.id === l.equity);
        
        if (mgrNode && eqNode) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '90');
            line.setAttribute('y1', mgrNode.y + 15);
            line.setAttribute('x2', '510');
            line.setAttribute('y2', eqNode.y + 7);
            line.setAttribute('class', 'link');
            line.setAttribute('stroke-width', l.val);
            line.setAttribute('id', `link-${l.manager}-${l.equity}`);
            svg.appendChild(line);
        }
    });
    
    // Draw Manager Nodes (Left side, Squares)
    bipartiteGraphData.managers.forEach(m => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'node investor');
        g.setAttribute('transform', `translate(15, ${m.y})`);
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '75');
        rect.setAttribute('height', '30');
        rect.setAttribute('rx', '4');
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '8');
        text.setAttribute('y', '18');
        text.textContent = m.name.substring(0, 11) + '...';
        
        g.appendChild(rect);
        g.appendChild(text);
        
        // Hover events
        g.addEventListener('mouseenter', () => {
            highlightLinks(m.id, 'manager');
            infoPanel.innerHTML = `<strong>Manager Node: ${m.name}</strong> | CIK: ${m.cik} | Centrality Score: ${m.centrality} | Clustering Coeff: ${m.coeff} | AUM: ${m.cap}`;
        });
        
        g.addEventListener('mouseleave', () => {
            resetLinkHighlights();
            infoPanel.innerText = 'Hover over a node to analyze positioning metrics.';
        });
        
        svg.appendChild(g);
    });
    
    // Draw Equity Nodes (Right side, Circles)
    bipartiteGraphData.equities.forEach(e => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'node equity');
        g.setAttribute('transform', `translate(510, ${e.y})`);
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '8');
        circle.setAttribute('cy', '8');
        circle.setAttribute('r', '8');
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '-110');
        text.setAttribute('y', '12');
        text.setAttribute('text-anchor', 'start');
        text.textContent = e.name;
        
        g.appendChild(circle);
        g.appendChild(text);
        
        // Hover events
        g.addEventListener('mouseenter', () => {
            highlightLinks(e.id, 'equity');
            infoPanel.innerHTML = `<strong>Equity Node: ${e.name}</strong> | CUSIP: ${e.cusip} | Net Manager Position Value: ${e.value} | Sector: ${e.sector}`;
        });
        
        g.addEventListener('mouseleave', () => {
            resetLinkHighlights();
            infoPanel.innerText = 'Hover over a node to analyze positioning metrics.';
        });
        
        svg.appendChild(g);
    });
}

function highlightLinks(nodeId, type) {
    bipartiteGraphData.links.forEach(l => {
        const linkEl = document.getElementById(`link-${l.manager}-${l.equity}`);
        if (!linkEl) return;
        
        if (type === 'manager' && l.manager === nodeId) {
            linkEl.classList.add('active');
        } else if (type === 'equity' && l.equity === nodeId) {
            linkEl.classList.add('active');
        } else {
            linkEl.style.opacity = '0.05';
        }
    });
}

function resetLinkHighlights() {
    bipartiteGraphData.links.forEach(l => {
        const linkEl = document.getElementById(`link-${l.manager}-${l.equity}`);
        if (linkEl) {
            linkEl.classList.remove('active');
            linkEl.style.opacity = '';
        }
    });
}

// Peter Lynch Screener Table Renderer
function renderLynchScreener() {
    const tableBody = document.getElementById('lynch-screener-body');
    if (!tableBody) return;
    
    const candidates = [
        { ticker: 'ASML', pe: 28.5, peg: 0.95, rule20: 30.5, de: 0.18, cash: 1, pass: true },
        { ticker: 'TSM', pe: 21.2, peg: 0.85, rule20: 23.2, de: 0.32, cash: 1, pass: true },
        { ticker: 'GLD', pe: 'N/A', peg: 'N/A', rule20: 'N/A', de: 0.00, cash: 0, pass: false },
        { ticker: 'NVDA', pe: 54.0, peg: 2.10, rule20: 56.0, de: 0.12, cash: 1, pass: false },
        { ticker: 'EQT', pe: 14.8, peg: 1.15, rule20: 16.8, de: 0.38, cash: 1, pass: true }
    ];
    
    tableBody.innerHTML = '';
    
    candidates.forEach(c => {
        let score = 0;
        if (c.ticker === 'GLD') {
            score = 0;
        } else {
            if (c.peg <= 1.2) score++;
            if (c.rule20 <= 20) score++;
            if (c.de <= 0.4) score++;
            if (c.cash > 0) score++;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${c.ticker}</strong></td>
            <td>${c.pe}</td>
            <td class="${c.peg <= 1.2 ? 'text-emerald' : 'text-rose'}">${c.peg}</td>
            <td class="${c.rule20 <= 20 ? 'text-emerald' : 'text-rose'}">${c.rule20}</td>
            <td class="${c.de <= 0.4 ? 'text-emerald' : 'text-rose'}">${c.de}</td>
            <td class="font-mono">${score} / 4</td>
            <td>
                <span class="badge ${score >= 3 ? 'badge-accent' : ''}">${score >= 3 ? 'PROMOTED' : 'REJECTED'}</span>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 4. Supply Chain Graph Traversal Renderer
function renderSupplyChainGraph() {
    const svg = document.getElementById('supply-chain-svg');
    if (!svg) return;
    
    svg.innerHTML = ''; // Clear SVG
    
    const infoPanel = document.getElementById('sc-node-info');
    
    // Draw Links
    supplyChainData.links.forEach(l => {
        const sourceNode = supplyChainData.nodes.find(n => n.id === l.source);
        const targetNode = supplyChainData.nodes.find(n => n.id === l.target);
        
        if (sourceNode && targetNode) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', sourceNode.x);
            line.setAttribute('y1', sourceNode.y);
            line.setAttribute('x2', targetNode.x);
            line.setAttribute('y2', targetNode.y);
            line.setAttribute('class', 'link');
            line.setAttribute('stroke-width', '1.5');
            line.setAttribute('id', `sc-link-${l.source}-${l.target}`);
            svg.appendChild(line);
        }
    });
    
    // Draw Nodes
    supplyChainData.nodes.forEach(n => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', `node ${n.category}`);
        g.setAttribute('transform', `translate(${n.x}, ${n.y})`);
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', n.category === 'theme' ? '12' : '8');
        circle.setAttribute('cx', '0');
        circle.setAttribute('cy', '0');
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '0');
        text.setAttribute('y', n.category === 'theme' ? '22' : '18');
        text.setAttribute('text-anchor', 'middle');
        text.textContent = n.name.split(' (')[0];
        
        g.appendChild(circle);
        g.appendChild(text);
        
        // Hover/Click events
        g.addEventListener('mouseenter', () => {
            highlightSCPath(n.id);
            if (n.category === 'theme') {
                infoPanel.innerHTML = `<strong>Theme Node: ${n.name}</strong> | Global Top-down Thesis`;
            } else {
                infoPanel.innerHTML = `<strong>Node: ${n.name}</strong> | Type: ${n.val} | Target Ticker: ${n.ticker}`;
            }
        });
        
        g.addEventListener('mouseleave', () => {
            resetSCLinks();
            infoPanel.innerText = 'Hover/click on nodes to traverse relational links.';
        });
        
        svg.appendChild(g);
    });
}

function highlightSCPath(nodeId) {
    // Highlight links connected to the hovered node
    supplyChainData.links.forEach(l => {
        const linkEl = document.getElementById(`sc-link-${l.source}-${l.target}`);
        if (!linkEl) return;
        
        if (l.source === nodeId || l.target === nodeId) {
            linkEl.style.opacity = '1.0';
            if (l.type === 'SUPPLIED_BY') {
                linkEl.classList.add('supplies-active');
            } else if (l.type === 'HAS_BOTTLENECK') {
                linkEl.classList.add('bottleneck-active');
            } else {
                linkEl.classList.add('active');
            }
        } else {
            linkEl.style.opacity = '0.05';
        }
    });
}

function resetSCLinks() {
    supplyChainData.links.forEach(l => {
        const linkEl = document.getElementById(`sc-link-${l.source}-${l.target}`);
        if (linkEl) {
            linkEl.style.opacity = '';
            linkEl.className.baseVal = 'link'; // Reset svg classes
        }
    });
}

// 5. Canvas-Based Backtest Chart Renderer
let backtestChartInitialized = false;

function initBacktestChart() {
    const canvas = document.getElementById('backtest-canvas');
    if (!canvas) return;
    
    const wrapper = canvas.parentElement;
    const rect = wrapper.getBoundingClientRect();
    
    // Set internal canvas resolution to match parent container width
    canvas.width = rect.width;
    canvas.height = rect.height || 240; // Default to 240 if height is 0
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Margins
    const margin = { top: 20, right: 30, bottom: 30, left: 45 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    
    // Draw Grid Lines & Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    const yGridCount = 4;
    for (let i = 0; i <= yGridCount; i++) {
        const y = margin.top + (plotHeight / yGridCount) * i;
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(width - margin.right, y);
        ctx.stroke();
        
        // Y-axis labels
        const val = 100 + ((512.5 - 100) / yGridCount) * (yGridCount - i);
        ctx.fillStyle = '#64748b';
        ctx.font = '8px JetBrains Mono';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(val) + '%', margin.left - 8, y + 3);
    }
    
    // X-axis years
    const xStep = plotWidth / (backtestDates.length - 1);
    backtestDates.forEach((year, index) => {
        const x = margin.left + xStep * index;
        ctx.beginPath();
        ctx.moveTo(x, margin.top);
        ctx.lineTo(x, height - margin.bottom);
        ctx.stroke();
        
        ctx.fillStyle = '#64748b';
        ctx.font = '8.5px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText(year, x, height - 12);
    });
    
    // Function to map data to pixel coordinates
    const mapCoords = (yVal, index) => {
        const x = margin.left + xStep * index;
        // map 100 to 512.5 onto plotHeight
        const y = margin.top + plotHeight - ((yVal - 100) / (512.5 - 100)) * plotHeight;
        return { x, y };
    };
    
    // Draw S&P 500 curve
    ctx.beginPath();
    backtestSp500Points.forEach((val, idx) => {
        const coords = mapCoords(val, idx);
        if (idx === 0) ctx.moveTo(coords.x, coords.y);
        else ctx.lineTo(coords.x, coords.y);
    });
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Draw Strategy curve (Neon Cyan)
    ctx.beginPath();
    backtestStrategyPoints.forEach((val, idx) => {
        const coords = mapCoords(val, idx);
        if (idx === 0) ctx.moveTo(coords.x, coords.y);
        else ctx.lineTo(coords.x, coords.y);
    });
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(6, 182, 212, 0.4)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    
    // Reset shadow values for next draw calls
    ctx.shadowBlur = 0;
    
    // Label keys on the top right
    ctx.font = '9px Outfit';
    ctx.textAlign = 'right';
    
    ctx.fillStyle = '#06b6d4';
    ctx.fillText('Macro-Thematic Strategy (+412.5%)', width - margin.right, margin.top + 10);
    
    ctx.fillStyle = '#64748b';
    ctx.fillText('S&P 500 Index (+164.2%)', width - margin.right, margin.top + 22);
}

// 6. Interactive Pilot Sizing Console
function launchPilotTrade() {
    const tickerSelect = document.getElementById('pilot-ticker');
    const ticker = tickerSelect.value;
    const tickerName = tickerSelect.options[tickerSelect.selectedIndex].text;
    
    // Check if pilot already exists
    if (state.pilotTrades.find(t => t.ticker === ticker)) {
        addPilotLog(`[ERROR] Pilot trade for ${ticker} is already active.`);
        return;
    }
    
    const tradeVal = 500000; // $500k standard pilot
    const newTrade = {
        ticker,
        name: tickerName,
        size: '0.5% NAV',
        val: '$500,000',
        momentum: 'Neutral',
        thesis: 'Awaiting data...',
        rawSize: 0.5
    };
    
    state.pilotTrades.push(newTrade);
    addPilotLog(`[PILOT] Initiating exploratory pilot order for ${tickerName}...`);
    addPilotLog(`[COMPLIANCE] Verification successful. Explo-sizing limit 0.5% NAV satisfied.`);
    addPilotLog(`[EXECUTION] Filled 0.5% NAV in ${ticker} @ market. Entry logged.`);
    
    renderPilotTable();
}

function renderPilotTable() {
    const tableBody = document.getElementById('pilot-positions-body');
    if (!tableBody) return;
    
    if (state.pilotTrades.length === 0) {
        tableBody.innerHTML = `
            <tr id="empty-pilot-row">
                <td colspan="6" class="text-center text-zinc-500">No active pilot trades. Deploy one above to start the feedback loop.</td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    state.pilotTrades.forEach(t => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${t.ticker}</strong></td>
            <td>${t.size}</td>
            <td>${t.val}</td>
            <td id="mom-${t.ticker}">${t.momentum}</td>
            <td id="thesis-${t.ticker}">${t.thesis}</td>
            <td>
                <button class="btn btn-action btn-success mr-2" onclick="scalePilot('${t.ticker}')">Scale Up</button>
                <button class="btn btn-action btn-danger" onclick="exitPilot('${t.ticker}')">Exit</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function scalePilot(ticker) {
    const trade = state.pilotTrades.find(t => t.ticker === ticker);
    if (!trade) return;
    
    if (trade.rawSize >= 5.0) {
        addPilotLog(`[LIMIT] Ticker ${ticker} already scaled to maximum target size (5.0% NAV).`);
        return;
    }
    
    trade.size = '5.0% NAV';
    trade.val = '$5,000,000';
    trade.rawSize = 5.0;
    
    addPilotLog(`[DECISION] Upstream bottleneck confirmed. Scaling position size for ${ticker} from 0.5% to 5.0% NAV.`);
    addPilotLog(`[EXECUTION] Limit orders filled for ${ticker}. Position updated to $5.0M.`);
    
    renderPilotTable();
}

function exitPilot(ticker) {
    state.pilotTrades = state.pilotTrades.filter(t => t.ticker !== ticker);
    
    addPilotLog(`[LIQUIDATE] Closing out positions for ${ticker}. Stop-loss or target met.`);
    addPilotLog(`[EXECUTION] Sold all remaining shares in ${ticker} @ market. Cash balance restored.`);
    
    renderPilotTable();
}

function addPilotLog(msg) {
    const logsEl = document.getElementById('pilot-stream-logs');
    if (!logsEl) return;
    
    // Remove default placeholder text if present
    const placeholder = logsEl.querySelector('.text-zinc-500');
    if (placeholder) {
        logsEl.removeChild(placeholder);
    }
    
    const line = document.createElement('span');
    line.className = 'log-line';
    if (msg.includes('[PILOT]')) line.className += ' text-cyan';
    if (msg.includes('[EXECUTION]')) line.className += ' text-emerald';
    if (msg.includes('[LIMIT]') || msg.includes('[ERROR]')) line.className += ' text-rose';
    if (msg.includes('[DECISION]')) line.className += ' text-violet';
    
    line.innerText = msg;
    logsEl.appendChild(line);
    logsEl.scrollTop = logsEl.scrollHeight;
}

// 7. Background Loop Simulations (Simulating streaming metrics & updates)
function startNLPPipelineLoop() {
    setInterval(() => {
        if (state.currentView !== 'agents') return;
        
        state.nlpStep = (state.nlpStep % 3) + 1;
        
        // Reset active state classes on steps
        document.querySelectorAll('.nlp-step').forEach(el => el.classList.remove('active'));
        document.getElementById(`nlp-step-${state.nlpStep}`).classList.add('active');
        
        // Update Quote Box content
        const data = nlpQuotes[state.nlpStep - 1];
        document.getElementById('nlp-assert-quote').innerText = data.quote;
        document.getElementById('nlp-assert-tax').innerHTML = `Taxonomy Match: <strong>${data.taxonomy}</strong>`;
        document.getElementById('nlp-assert-score').innerHTML = `Judge Conf. Score: <strong>${data.score}</strong>`;
        
    }, 4000);
}

function startSimulationLoops() {
    // 13F parsing log generator
    setInterval(() => {
        if (state.currentView !== 'agents') return;
        
        const logsEl = document.getElementById('xml-stream-logs');
        if (!logsEl) return;
        
        const firms = ['Elliott Management', 'Soros Fund', 'Duquesne Family Office', 'Appaloosa L.P.'];
        const randomFirm = firms[Math.floor(Math.random() * firms.length)];
        const randomT = Math.floor(Math.random() * 400) + 100;
        
        const lines = [
            `[POLL] Checking EDGAR feed updates...`,
            `[FETCH] New 13F-HR filings parsed for: ${randomFirm}`,
            `[PARSE] Completed C-level XML stream in ${(Math.random() * 8 + 4).toFixed(1)}ms.`,
            `[OK] Merged holdings network topologies.`
        ];
        
        lines.forEach((l, idx) => {
            setTimeout(() => {
                const span = document.createElement('span');
                span.className = 'log-line';
                if (l.includes('[OK]')) span.className += ' text-emerald';
                if (l.includes('[FETCH]')) span.className += ' text-cyan';
                span.innerText = l;
                
                logsEl.appendChild(span);
                // Maintain maximum 30 logs in buffer
                if (logsEl.children.length > 30) {
                    logsEl.removeChild(logsEl.firstChild);
                }
                logsEl.scrollTop = logsEl.scrollHeight;
            }, idx * 600);
        });
        
    }, 12000);

    // Compliance logs simulator
    setInterval(() => {
        if (state.currentView !== 'backtest') return;
        
        const logsEl = document.getElementById('compliance-logs');
        if (!logsEl) return;
        
        const complianceMessages = [
            `[FILTER] Re-evaluating 45-day look-ahead disclosure lag...`,
            `[OK] Compliance confirmed. Transaction date aligned with Form 13F reporting window.`,
            `[CHECK] Validating portfolio beta weights against MDP bounds (Max Beta: ${state.maxBeta.toFixed(2)})...`,
            `[PASS] Core portfolio beta is at ${(state.maxBeta * 0.82).toFixed(2)}, satisfying the risk boundaries.`,
            `[CHECK] Assessing sector allocations (Max Cap: 20%)...`,
            `[PASS] No sector limits breached. Current highest: AI Compute at 18.2%.`,
            `[FILTER] Running volume liquidity filter on candidate lists...`,
            `[REJECT] Scanned ticker rejected due to low average daily trading volume.`
        ];
        
        const rIndex = Math.floor(Math.random() * complianceMessages.length);
        const span = document.createElement('span');
        span.className = 'log-line';
        const msg = complianceMessages[rIndex];
        
        if (msg.includes('[OK]') || msg.includes('[PASS]')) span.className += ' text-emerald';
        if (msg.includes('[REJECT]')) span.className += ' text-rose';
        if (msg.includes('[FILTER]')) span.className += ' text-cyan';
        
        span.innerText = msg;
        logsEl.appendChild(span);
        
        if (logsEl.children.length > 25) {
            logsEl.removeChild(logsEl.firstChild);
        }
        logsEl.scrollTop = logsEl.scrollHeight;
        
    }, 5000);

    // Active pilot momentum updater
    setInterval(() => {
        state.pilotTrades.forEach(t => {
            const momEl = document.getElementById(`mom-${t.ticker}`);
            const thesisEl = document.getElementById(`thesis-${t.ticker}`);
            if (!momEl || !thesisEl) return;
            
            // Randomly update momentum and thesis validation
            const momentums = ['Bullish', 'Bearish', 'Consolidating', 'Highly Bullish'];
            const randomMom = momentums[Math.floor(Math.random() * momentums.length)];
            
            t.momentum = randomMom;
            momEl.innerText = randomMom;
            if (randomMom.includes('Bullish')) {
                momEl.className = 'text-emerald';
                t.thesis = 'Thesis Validated. Upstream bottleneck active.';
            } else if (randomMom === 'Bearish') {
                momEl.className = 'text-rose';
                t.thesis = 'Warning: Momentum break. Re-evaluate exposure.';
            } else {
                momEl.className = 'text-amber';
                t.thesis = 'Consolidating. Awaiting earnings report.';
            }
            thesisEl.innerText = t.thesis;
        });
    }, 4500);
}

// Add window resize listener to redraw backtest chart responsively
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (state.currentView === 'backtest') {
            initBacktestChart();
        }
    }, 250);
});

