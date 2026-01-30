import type { ProcessedSensorData, BatchRegistryEntry } from '../../types/index.js';

/**
 * In-memory Time-Series Database
 * Stores batch data and proofs for query and verification
 * 
 * Note: This is an in-memory implementation for development.
 * In production, replace with InfluxDB, TimescaleDB, or similar.
 */
class TimeSeriesDB {
    // Batch registry
    private batches: Map<string, BatchRegistryEntry> = new Map();

    // Raw data by batch
    private batchData: Map<string, ProcessedSensorData[]> = new Map();

    // Merkle proofs by batch and data hash
    private proofs: Map<string, Map<string, string[]>> = new Map();

    // Total data points count
    private totalDataPoints: number = 0;

    constructor() {
        console.log('[TimeSeriesDB] In-memory database initialized');
    }

    /**
     * Save a batch with its data and proofs
     */
    async saveBatch(
        entry: BatchRegistryEntry,
        data: ProcessedSensorData[],
        merkleProofs?: Map<string, string[]>
    ): Promise<void> {
        // Store batch entry
        this.batches.set(entry.batchId, entry);

        // Store raw data
        this.batchData.set(entry.batchId, data);

        // Store proofs
        if (merkleProofs) {
            this.proofs.set(entry.batchId, merkleProofs);
        }

        // Update total data points
        this.totalDataPoints += data.length;

        console.log(`[TimeSeriesDB] Saved batch ${entry.batchId} with ${data.length} data points`);
    }

    /**
     * Update batch with transaction hash
     */
    async updateBatchTx(batchId: string, txHash: string): Promise<void> {
        const entry = this.batches.get(batchId);

        if (entry) {
            entry.txHash = txHash;
            entry.submittedAt = Date.now();
            this.batches.set(batchId, entry);
            console.log(`[TimeSeriesDB] Updated batch ${batchId} with txHash: ${txHash.substring(0, 18)}...`);
        }
    }

    /**
     * Get batch entry by ID
     */
    getBatch(batchId: string): BatchRegistryEntry | null {
        return this.batches.get(batchId) || null;
    }

    /**
     * Get batch data by ID
     */
    getBatchData(batchId: string): ProcessedSensorData[] | null {
        return this.batchData.get(batchId) || null;
    }

    /**
     * Get Merkle proof for a data hash in a batch
     */
    getProof(batchId: string, dataHash: string): string[] | null {
        const batchProofs = this.proofs.get(batchId);
        if (!batchProofs) {
            return null;
        }
        return batchProofs.get(dataHash) || null;
    }

    /**
     * Get total number of batches
     */
    getBatchCount(): number {
        return this.batches.size;
    }

    /**
     * Get total number of data points
     */
    getTotalDataPoints(): number {
        return this.totalDataPoints;
    }

    /**
     * Get the latest batch
     */
    getLatestBatch(): BatchRegistryEntry | null {
        let latest: BatchRegistryEntry | null = null;

        for (const entry of this.batches.values()) {
            if (!latest || entry.createdAt > latest.createdAt) {
                latest = entry;
            }
        }

        return latest;
    }

    /**
     * List batches with pagination
     */
    listBatches(limit: number = 10, offset: number = 0): BatchRegistryEntry[] {
        const allBatches = Array.from(this.batches.values());

        // Sort by creation time (newest first)
        allBatches.sort((a, b) => b.createdAt - a.createdAt);

        return allBatches.slice(offset, offset + limit);
    }

    /**
     * Query data by sensor ID
     */
    queryBySensor(sensorId: string): ProcessedSensorData[] {
        const results: ProcessedSensorData[] = [];

        for (const data of this.batchData.values()) {
            for (const item of data) {
                if (item.sensorId === sensorId) {
                    results.push(item);
                }
            }
        }

        return results.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Query data in time range
     */
    queryByTimeRange(startTime: number, endTime: number): ProcessedSensorData[] {
        const results: ProcessedSensorData[] = [];

        for (const data of this.batchData.values()) {
            for (const item of data) {
                if (item.timestamp >= startTime && item.timestamp <= endTime) {
                    results.push(item);
                }
            }
        }

        return results.sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Clear all data (for testing)
     */
    clear(): void {
        this.batches.clear();
        this.batchData.clear();
        this.proofs.clear();
        this.totalDataPoints = 0;
        console.log('[TimeSeriesDB] Database cleared');
    }
}

// Export singleton instance
export const timeseriesDB = new TimeSeriesDB();
