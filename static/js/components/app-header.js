import { state } from '../state.js';

class AppHeader extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.themes = ['tokyo-night', 'dracula', 'catppuccin-mocha', 'nord', 'gruvbox-dark', 'neon-green', 'neon-blue', 'neon-red', 'neon-orange', 'neon-purple', 'neon-pink', 'atom-one-light', 'rosepine-dawn', 'everforest', 'github-dark', 'oceanic'];
    }

    connectedCallback() {
        this.render();
        this.setupListeners();
        
        // Listen for api connection changes
        state.subscribe((key, value) => {
            if (key === 'apiConnected') {
                this.updateApiBadge(value);
            }
        });
    }

    setupListeners() {
        // Theme Dropdown Toggle
        const themeBtn = this.shadowRoot.querySelector('.theme-btn');
        const dropdown = this.shadowRoot.querySelector('.theme-dropdown');
        themeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown.classList.remove('open');
        });

        // Theme selection
        const options = this.shadowRoot.querySelectorAll('.theme-option');
        options.forEach(opt => {
            opt.addEventListener('click', (e) => {
                const theme = e.target.dataset.theme;
                state.update('theme', theme);
                options.forEach(o => o.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Mode Navigation
        const instTab = this.shadowRoot.querySelector('#nav-inst');
        const ytTab = this.shadowRoot.querySelector('#nav-yt');
        
        instTab.addEventListener('click', () => {
            state.update('mode', 'instant');
            instTab.classList.add('active');
            ytTab.classList.remove('active');
            document.dispatchEvent(new CustomEvent('mode-changed', { detail: 'instant' }));
        });

        ytTab.addEventListener('click', () => {
            state.update('mode', 'youtube');
            ytTab.classList.add('active');
            instTab.classList.remove('active');
            document.dispatchEvent(new CustomEvent('mode-changed', { detail: 'youtube' }));
        });
    }

    updateApiBadge(isConnected) {
        const badge = this.shadowRoot.querySelector('.api-badge');
        if (isConnected) {
            badge.classList.add('connected');
            badge.querySelector('span').textContent = 'API Connected';
        } else {
            badge.classList.remove('connected');
            badge.querySelector('span').textContent = 'API Offline';
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                @import url('static/css/global.css');
                :host {
                    display: block;
                    width: 100%;
                }
                .app-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.6rem 1.5rem;
                    background: var(--surface);
                    border-bottom: 1px solid var(--border);
                }
                .logo {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.9rem;
                    color: var(--accent);
                    font-weight: 700;
                }
                .mode-tabs {
                    display: flex;
                    gap: 4px;
                    background: var(--surface2);
                    border-radius: 8px;
                    padding: 3px;
                }
                .mode-tab {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.72rem;
                    padding: 4px 14px;
                    border-radius: 6px;
                    border: 1px solid var(--border);
                    cursor: pointer;
                    color: var(--text);
                    background: transparent;
                }
                .mode-tab.active {
                    background: var(--accent);
                    color: var(--bg);
                    border-color: var(--accent);
                }
                .mode-tab:hover:not(.active) {
                    border-color: var(--accent);
                }
                .header-right {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .theme-selector { position: relative; }
                .theme-btn {
                    background: var(--surface2);
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    padding: 6px 14px;
                    cursor: pointer;
                    color: var(--text);
                }
                .theme-dropdown {
                    position: absolute;
                    top: calc(100% + 8px);
                    right: 0;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 12px;
                    min-width: 180px;
                    display: none;
                }
                .theme-dropdown.open { display: block; }
                .theme-option {
                    width: 100%;
                    padding: 8px 10px;
                    background: transparent;
                    border: none;
                    color: var(--text);
                    text-align: left;
                    cursor: pointer;
                }
                .theme-option.active {
                    background: var(--accent);
                    color: var(--bg);
                }
                .api-badge {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.62rem;
                    padding: 2px 8px;
                    border-radius: 20px;
                    border: 1px solid var(--border);
                    color: var(--subtext);
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .api-badge .dot {
                    width: 6px; height: 6px;
                    border-radius: 50%;
                    background: var(--subtext);
                }
                .api-badge.connected {
                    border-color: var(--correct);
                    color: var(--correct);
                }
                .api-badge.connected .dot { background: var(--correct); }
            </style>
            
            <header class="app-header">
                <div class="logo">বাংলা_টাইপার</div>
                <div class="mode-tabs">
                    <button class="mode-tab active" id="nav-inst">Instant Mode</button>
                    <button class="mode-tab" id="nav-yt">YouTube Mode</button>
                </div>
                <div class="header-right">
                    <div class="api-badge" title="Backend Connection Status">
                        <div class="dot"></div>
                        <span>API Offline</span>
                    </div>
                    <div class="theme-selector">
                        <button class="theme-btn">🎨 Theme</button>
                        <div class="theme-dropdown">
                            ${this.themes.map(t => 
                                `<button class="theme-option ${state.theme === t ? 'active' : ''}" data-theme="${t}">${t.replace(/-/g, ' ')}</button>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            </header>
        `;
    }
}

customElements.define('app-header', AppHeader);
