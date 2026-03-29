import { state } from '../state.js';

class TypingArea extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        // Core typing state is handled in state.js
    }

    connectedCallback() {
        this.render();
        this.setupTypingEngines();
    }

    setupTypingEngines() {
        // Will migrate the core typing logic here from the monolithic HTML
        const display = this.shadowRoot.getElementById('typed-display');
        
        document.addEventListener('keydown', (e) => {
            if (state.mode !== 'instant') return;
            // Typing logic simulation (will be fully ported later)
            // e.g. state.update('instant', { ... }) updates the global wpm state
            if (e.key.length === 1) {
               // handle typing
            }
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                @import url('static/css/global.css');
                :host {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 100%;
                }
                .main-wrap {
                    width: 95%; max-width: 850px;
                    display: flex; flex-direction: column;
                    gap: 0.4rem; padding-top: 2rem;
                }
                .inst-typing-area {
                    font-size: 1.25rem;
                    line-height: 1.8;
                    color: var(--text);
                    background: transparent;
                    padding: 1rem;
                    min-height: 200px;
                }
                .cursor {
                    border-bottom: 2px solid var(--cursor);
                    animation: blink 1s step-end infinite;
                }
                @keyframes blink { 50% { border-color: transparent; } }
            </style>
            
            <div class="main-wrap">
                <slot name="stats"></slot>
                <div class="inst-typing-area" id="typed-display">
                    Just start typing... <span class="cursor"></span>
                </div>
                <slot name="keyboard"></slot>
            </div>
        `;
    }
}

customElements.define('typing-area', TypingArea);
