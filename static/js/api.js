/**
 * API Service for Bangla Typer
 * 
 * Handles all API communication with retry logic and offline support.
 * 
 * Features:
 * - Automatic retry on failure (up to 3 attempts)
 * - Offline queue for failed requests (localStorage)
 * - Process queued requests on page load
 * 
 * @module ApiService
 * @version 1.0.0
 * @date 2026-04-06
 */

const API_CONFIG = {
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
    RETRY_QUEUE_KEY: 'inst_stats_retry_queue'
};

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
        for (let attempt = 1; attempt <= API_CONFIG.MAX_RETRIES; attempt++) {
            try {
                const res = await fetch(`${this.baseUrl}/inst_stats`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(statsPayload)
                });
                
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                
                const data = await res.json();
                
                if (data.status === 'db_error') {
                    throw new Error('Database error');
                }
                
                console.log('✓ Statistics saved successfully');
                return data;
                
            } catch (error) {
                console.error(`Save stats error (attempt ${attempt}/${API_CONFIG.MAX_RETRIES}):`, error);
                
                if (attempt === API_CONFIG.MAX_RETRIES) {
                    this.queueStatsForRetry(statsPayload);
                    throw error;
                }
                
                await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY_MS * attempt));
            }
        }
    }

    queueStatsForRetry(payload) {
        try {
            const queue = JSON.parse(localStorage.getItem(API_CONFIG.RETRY_QUEUE_KEY) || '[]');
            queue.push({ ...payload, queuedAt: Date.now() });
            localStorage.setItem(API_CONFIG.RETRY_QUEUE_KEY, JSON.stringify(queue));
            console.warn('Stats queued for later retry');
        } catch (e) {
            console.error('Failed to queue stats:', e);
        }
    }

    async processQueuedStats() {
        try {
            const queue = JSON.parse(localStorage.getItem(API_CONFIG.RETRY_QUEUE_KEY) || '[]');
            if (queue.length === 0) return;
            
            console.log(`Processing ${queue.length} queued stats...`);
            
            const successful = [];
            for (const payload of queue) {
                try {
                    await this.saveInstantStats(payload);
                    successful.push(payload);
                } catch (e) {
                    console.warn('Queued stat still failing');
                }
            }
            
            const failed = queue.filter(p => !successful.includes(p));
            if (failed.length > 0) {
                localStorage.setItem(API_CONFIG.RETRY_QUEUE_KEY, JSON.stringify(failed));
            } else {
                localStorage.removeItem(API_CONFIG.RETRY_QUEUE_KEY);
                console.log('✓ All queued stats processed');
            }
        } catch (e) {
            console.error('Error processing queued stats:', e);
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
        return new EventSource(`${this.baseUrl}/process?url=${encodeURIComponent(url)}`);
    }
}

const api = new ApiService();

if (typeof window !== 'undefined') {
    window.api = api;
}
