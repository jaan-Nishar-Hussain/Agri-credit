import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import keccak256 from 'keccak256';
import { sensorDataPayloadSchema } from '../middleware/validation.js';
import { memoryQueue } from '../../services/queue/memoryQueue.js';
import type { ApiResponse, ProcessedSensorData, SensorDataPayload } from '../../types/index.js';

const router = Router();

/**
 * POST /api/webhook/sensor-data
 * 
 * Receives sensor data from physical devices via the API Gateway.
 * Validates the payload, creates a hash, and enqueues for processing.
 */
router.post('/sensor-data', async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        // 1. Validate incoming payload
        const validationResult = sensorDataPayloadSchema.safeParse(req.body);

        if (!validationResult.success) {
            const response: ApiResponse = {
                success: false,
                error: `Validation failed: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
                timestamp: Date.now(),
            };
            return res.status(400).json(response);
        }

        const payload: SensorDataPayload = validationResult.data;

        // 2. Verify device signature (placeholder - implement actual signature verification)
        const isValidSignature = verifyDeviceSignature(payload);
        if (!isValidSignature) {
            const response: ApiResponse = {
                success: false,
                error: 'Invalid device signature',
                timestamp: Date.now(),
            };
            return res.status(401).json(response);
        }

        // 3. Create data hash for integrity
        const dataHash = createDataHash(payload);

        // 4. Create processed data object
        const processedData: ProcessedSensorData = {
            id: uuidv4(),
            serialNumber: payload.serialNumber,
            sensorId: payload.sensorId,
            timestamp: payload.timestamp,
            readings: payload.readings,
            receivedAt: Date.now(),
            dataHash,
        };

        // 5. Enqueue for processing
        await memoryQueue.enqueue(processedData);

        // 6. Return success response
        const response: ApiResponse<{ id: string; dataHash: string; queuePosition: number }> = {
            success: true,
            data: {
                id: processedData.id,
                dataHash,
                queuePosition: memoryQueue.size(),
            },
            timestamp: Date.now(),
        };

        console.log(`[Webhook] Received sensor data from ${payload.sensorId} in ${Date.now() - startTime}ms`);
        return res.status(202).json(response);

    } catch (error) {
        console.error('[Webhook] Error processing sensor data:', error);
        const response: ApiResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error',
            timestamp: Date.now(),
        };
        return res.status(500).json(response);
    }
});

/**
 * Verify device signature
 * TODO: Implement actual ECDSA signature verification using the device's public key
 */
function verifyDeviceSignature(payload: SensorDataPayload): boolean {
    // For now, accept all signatures in development mode
    // In production, this should verify the signature against:
    // 1. The device's registered public key
    // 2. The payload data hash
    if (!payload.deviceSignature || payload.deviceSignature.length < 10) {
        return false;
    }
    return true;
}

/**
 * Create a keccak256 hash of the sensor data for integrity verification
 */
function createDataHash(payload: SensorDataPayload): string {
    const dataString = JSON.stringify({
        serialNumber: payload.serialNumber,
        sensorId: payload.sensorId,
        timestamp: payload.timestamp,
        readings: payload.readings,
    });

    const hash = keccak256(dataString);
    return '0x' + hash.toString('hex');
}

/**
 * GET /api/webhook/health
 * Health check endpoint for the webhook service
 */
router.get('/health', (_req: Request, res: Response) => {
    const response: ApiResponse<{ status: string; queueSize: number }> = {
        success: true,
        data: {
            status: 'healthy',
            queueSize: memoryQueue.size(),
        },
        timestamp: Date.now(),
    };
    return res.status(200).json(response);
});

export default router;
