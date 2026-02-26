import pg from 'pg';
const { Pool } = pg;
import { config } from '../../config/index.js';
import type { ProcessedSensorData, BatchRegistryEntry } from '../../types/index.js';

/**
 * PostgreSQL Database Service
 * Stores batch data and metadata persistently
 */
class PGDatabase {
    private pool: pg.Pool;

    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });

        console.log('[PGDatabase] Initializing PostgreSQL connection pool...');
    }

    /**
     * Initialize the database schema
     */
    async initialize(): Promise<void> {
        const client = await this.pool.connect();
        try {
            console.log('[PGDatabase] Setting up database schema...');
            
            // Create batches table
            await client.query(`
                CREATE TABLE IF NOT EXISTS batches (
                    batch_id TEXT PRIMARY KEY,
                    merkle_root TEXT NOT NULL,
                    created_at BIGINT NOT NULL,
                    submitted_at BIGINT,
                    tx_hash TEXT,
                    status TEXT DEFAULT 'pending'
                )
            `);

            // Create sensor_data table
            await client.query(`
                CREATE TABLE IF NOT EXISTS sensor_data (
                    id SERIAL PRIMARY KEY,
                    batch_id TEXT REFERENCES batches(batch_id),
                    sensor_id TEXT NOT NULL,
                    serial_number TEXT NOT NULL,
                    device_signature TEXT NOT NULL,
                    timestamp BIGINT NOT NULL,
                    readings JSONB NOT NULL,
                    data_hash TEXT NOT NULL
                )
            `);

            // Create proofs table
            await client.query(`
                CREATE TABLE IF NOT EXISTS proofs (
                    id SERIAL PRIMARY KEY,
                    batch_id TEXT REFERENCES batches(batch_id),
                    data_hash TEXT NOT NULL,
                    proof TEXT[] NOT NULL
                )
            `);

            console.log('[PGDatabase] Database schema initialized successfully');
        } catch (error) {
            console.error('[PGDatabase] Failed to initialize database schema:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Save a batch with its data and proofs
     */
    async saveBatch(
        entry: BatchRegistryEntry,
        data: ProcessedSensorData[],
        merkleProofs?: Map<string, string[]>
    ): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Insert batch
            await client.query(
                'INSERT INTO batches (batch_id, merkle_root, created_at, status) VALUES ($1, $2, $3, $4) ON CONFLICT (batch_id) DO NOTHING',
                [entry.batchId, entry.merkleRoot, entry.createdAt, 'pending']
            );

            // Insert sensor data
            for (const item of data) {
                await client.query(
                    'INSERT INTO sensor_data (batch_id, sensor_id, serial_number, device_signature, timestamp, readings, data_hash) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [entry.batchId, item.sensorId, item.serialNumber, item.deviceSignature, item.timestamp, item.readings, item.dataHash]
                );

                // Insert proof if exists
                if (merkleProofs && merkleProofs.has(item.dataHash)) {
                    await client.query(
                        'INSERT INTO proofs (batch_id, data_hash, proof) VALUES ($1, $2, $3)',
                        [entry.batchId, item.dataHash, merkleProofs.get(item.dataHash)]
                    );
                }
            }

            await client.query('COMMIT');
            console.log(`[PGDatabase] Saved batch ${entry.batchId} with ${data.length} data points to PostgreSQL`);
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`[PGDatabase] Failed to save batch ${entry.batchId}:`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Update batch with transaction hash
     */
    async updateBatchTx(batchId: string, txHash: string): Promise<void> {
        try {
            await this.pool.query(
                'UPDATE batches SET tx_hash = $1, submitted_at = $2, status = $3 WHERE batch_id = $4',
                [txHash, Date.now(), 'submitted', batchId]
            );
            console.log(`[PGDatabase] Updated batch ${batchId} with txHash in PostgreSQL`);
        } catch (error) {
            console.error(`[PGDatabase] Failed to update batch ${batchId} txHash:`, error);
            throw error;
        }
    }

    /**
     * Get total number of data points
     */
    async getTotalDataPoints(): Promise<number> {
        try {
            const res = await this.pool.query('SELECT COUNT(*) FROM sensor_data');
            return parseInt(res.rows[0].count);
        } catch (error) {
            console.error('[PGDatabase] Failed to get total data points:', error);
            return 0;
        }
    }

    /**
     * Get total number of batches
     */
    async getBatchCount(): Promise<number> {
        try {
            const res = await this.pool.query('SELECT COUNT(*) FROM batches');
            return parseInt(res.rows[0].count);
        } catch (error) {
            console.error('[PGDatabase] Failed to get batch count:', error);
            return 0;
        }
    }

    /**
     * Close the connection pool
     */
    async close(): Promise<void> {
        await this.pool.end();
        console.log('[PGDatabase] Connection pool closed');
    }
}

// Export singleton instance
export const pgDatabase = new PGDatabase();
