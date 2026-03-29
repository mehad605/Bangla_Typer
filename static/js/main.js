import { state } from './state.js';
import { api } from './api.js';

// Component Imports
import './components/app-header.js';
import './components/typing-area.js';

document.addEventListener('DOMContentLoaded', () => {
    // Apply theme on load
    document.body.setAttribute('data-theme', state.theme);

    // Setup heartbeat
    setInterval(async () => {
        const isConnected = await api.getStatus();
        state.update('apiConnected', isConnected);
    }, 5000);

    // Initial heartbeat
    api.getStatus().then(status => state.update('apiConnected', status));
});

// Setup global theme listener
state.subscribe((key, value) => {
    if (key === 'theme') {
        document.body.setAttribute('data-theme', value);
        localStorage.setItem('theme', value);
    }
});
