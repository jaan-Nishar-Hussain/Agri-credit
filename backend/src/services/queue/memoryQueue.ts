import { EventEmitter } from 'events';
import type { ProcessedSensorData, QueueItem } from '../../types/index.js';
import { config } from '../../config/index.js';

/**
 * In-memory queue for sensor data batching
 * Implements event-driven processing with configurable batch size and flush intervals
 */
class MemoryQueue extends EventEmitter {
    private queue: QueueItem[] = [];
    private batchSize: number;
    private flushIntervalMs: number;
    private flushTimer: NodeJS.Timeout | null = null;

    constructor() {
        super();
        this.batchSize = config.rollup.batchSize;
        this.flushIntervalMs = config.rollup.batchIntervalMs;
        this.startFlushTimer();
    }

    /**
     * Add data to the queue
     */
    async enqueue(data: ProcessedSensorData): Promise<void> {
        const queueItem: QueueItem = {
            id: data.id,
            data,
            addedAt: Date.now(),
        };

        this.queue.push(queueItem);
        console.log(`[Queue] Enqueued item ${data.id}, queue size: ${this.queue.length}`);

        // Check if batch size reached
        if (this.queue.length >= this.batchSize) {
            await this.flush();
        }
    }

    /**
     * Flush the queue and emit batch-ready event
     */
    async flush(): Promise<void> {
        if (this.queue.length === 0) {
            return;
        }

        const batch = this.queue.splice(0, this.batchSize);
        const batchData = batch.map(item => item.data);

        console.log(`[Queue] Flushing batch of ${batch.length} items`);

        // Emit event for processor to handle
        this.emit('batch-ready', batchData);
    }

    /**
     * Get current queue size
     */
    size(): number {
        return this.queue.length;
    }

    /**
     * Start the periodic flush timer
     */
    private startFlushTimer(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }

        this.flushTimer = setInterval(async () => {
            if (this.queue.length > 0) {
                console.log('[Queue] Timer triggered flush');
                await this.flush();
            }
        }, this.flushIntervalMs);
    }

    /**
     * Stop the flush timer (for cleanup)
     */
    stopFlushTimer(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
    }

    /**
     * Clear the queue
     */
    clear(): void {
        this.queue = [];
    }

    /**
     * Get all items in queue (for debugging)
     */
    getAll(): QueueItem[] {
        return [...this.queue];
    }
}

// Export singleton instance
export const memoryQueue = new MemoryQueue();
