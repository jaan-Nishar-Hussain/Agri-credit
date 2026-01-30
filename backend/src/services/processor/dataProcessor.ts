import { v4 as uuidv4 } from 'uuid';
import { memoryQueue } from '../queue/memoryQueue.js';
import { rollupEngine } from '../rollup/rollupEngine.js';
import type { ProcessedSensorData, DataBatch } from '../../types/index.js';

/**
 * Data Processor Service
 * Processes incoming sensor data batches and triggers rollup
 */
class DataProcessor {
    private isProcessing: boolean = false;

    constructor() {
        this.initialize();
    }

    /**
     * Initialize processor by subscribing to queue events
     */
    initialize(): void {
        memoryQueue.on('batch-ready', async (batchData: ProcessedSensorData[]) => {
            await this.processBatch(batchData);
        });

        console.log('[Processor] Data processor initialized');
    }

    /**
     * Process a batch of sensor data
     */
    async processBatch(data: ProcessedSensorData[]): Promise<void> {
        if (this.isProcessing) {
            console.log('[Processor] Already processing, skipping...');
            return;
        }

        this.isProcessing = true;
        const startTime = Date.now();

        try {
            console.log(`[Processor] Processing batch of ${data.length} items`);

            // 1. Normalize and validate data
            const normalizedData = this.normalizeData(data);

            // 2. Enrich data with additional metadata
            const enrichedData = this.enrichData(normalizedData);

            // 3. Create batch object
            const batch: DataBatch = {
                batchId: uuidv4(),
                data: enrichedData,
                createdAt: Date.now(),
            };

            // 4. Send to rollup engine
            await rollupEngine.processRollup(batch);

            console.log(`[Processor] Batch ${batch.batchId} processed in ${Date.now() - startTime}ms`);

        } catch (error) {
            console.error('[Processor] Error processing batch:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Normalize sensor data (standardize formats, units, etc.)
     */
    private normalizeData(data: ProcessedSensorData[]): ProcessedSensorData[] {
        return data.map(item => {
            const normalized = { ...item };

            // Normalize readings
            if (normalized.readings) {
                // Clamp humidity to 0-100
                if (normalized.readings.humidity !== undefined) {
                    normalized.readings.humidity = Math.max(0, Math.min(100, normalized.readings.humidity));
                }

                // Clamp soil moisture to 0-100
                if (normalized.readings.soilMoisture !== undefined) {
                    normalized.readings.soilMoisture = Math.max(0, Math.min(100, normalized.readings.soilMoisture));
                }

                // Clamp soil pH to 0-14
                if (normalized.readings.soilPH !== undefined) {
                    normalized.readings.soilPH = Math.max(0, Math.min(14, normalized.readings.soilPH));
                }
            }

            return normalized;
        });
    }

    /**
     * Enrich data with additional computed fields
     */
    private enrichData(data: ProcessedSensorData[]): ProcessedSensorData[] {
        return data.map(item => {
            return {
                ...item,
                // Add any additional computed fields here
                // e.g., quality scores, anomaly flags, etc.
            };
        });
    }
}

// Export singleton instance
export const dataProcessor = new DataProcessor();
