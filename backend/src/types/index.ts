// ============================================
// Type Definitions for Agri-Credit System
// ============================================

/**
 * Sensor reading data from physical devices
 */
export interface SensorReading {
    temperature?: number;
    humidity?: number;
    soilMoisture?: number;
    soilPH?: number;
    lightIntensity?: number;
    rainfall?: number;
    windSpeed?: number;
    co2Level?: number;
    [key: string]: number | undefined;
}

/**
 * Incoming webhook payload from sensor devices
 */
export interface SensorDataPayload {
    serialNumber: string;
    sensorId: string;
    deviceSignature: string;
    timestamp: number;
    readings: SensorReading;
}

/**
 * Processed sensor data with metadata
 */
export interface ProcessedSensorData {
    id: string;
    serialNumber: string;
    sensorId: string;
    timestamp: number;
    readings: SensorReading;
    receivedAt: number;
    dataHash: string;
}

/**
 * Data batch for rollup processing
 */
export interface DataBatch {
    batchId: string;
    data: ProcessedSensorData[];
    createdAt: number;
    merkleRoot?: string;
    merkleProofs?: Map<string, string[]>;
}

/**
 * Blockchain transaction result
 */
export interface BlockchainTransaction {
    txHash: string;
    batchId: string;
    merkleRoot: string;
    blockNumber: number;
    timestamp: number;
    gasUsed: string;
}

/**
 * Verification result from blockchain
 */
export interface VerificationResult {
    isValid: boolean;
    batchId: string;
    dataHash: string;
    onChainMerkleRoot: string;
    proofValid: boolean;
}

/**
 * Queue item for processing
 */
export interface QueueItem {
    id: string;
    data: ProcessedSensorData;
    addedAt: number;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: number;
}

/**
 * Relayer configuration
 */
export interface RelayerConfig {
    rpcUrl: string;
    privateKey: string;
    contractAddress: string;
    chainId: number;
}

/**
 * Batch registry entry (for time-series storage)
 */
export interface BatchRegistryEntry {
    batchId: string;
    merkleRoot: string;
    txHash: string;
    dataCount: number;
    createdAt: number;
    submittedAt: number;
}
