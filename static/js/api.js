import { state } from './state.js';

class ApiService {
    constructor() {
        this.baseUrl = '/api';
    }

    async getStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/heartbeat`, { method: 'POST' });
            return response.ok;
        } catch {
            return false;
        }
    }

    async saveInstantStats(statsPayload) {
        try {
            await fetch(`${this.baseUrl}/inst_stats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(statsPayload)
            });
        } catch (e) {
            console.error('Failed to save instant stats', e);
        }
    }

    async getVideos() {
        try {
            const res = await fetch(`${this.baseUrl}/videos`);
            return await res.json();
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    async processVideo(url) {
        // We will return the EventSource to the component that needs it
        return new EventSource(`${this.baseUrl}/process?url=${encodeURIComponent(url)}`);
    }
}

export const api = new ApiService();
