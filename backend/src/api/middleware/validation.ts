import { z } from 'zod';

/**
 * Schema for sensor readings
 */
export const sensorReadingSchema = z.object({
    temperature: z.number().optional(),
    humidity: z.number().min(0).max(100).optional(),
    soilMoisture: z.number().min(0).max(100).optional(),
    soilPH: z.number().min(0).max(14).optional(),
    lightIntensity: z.number().min(0).optional(),
    rainfall: z.number().min(0).optional(),
    windSpeed: z.number().min(0).optional(),
    co2Level: z.number().min(0).optional(),
}).passthrough(); // Allow additional custom readings

/**
 * Schema for incoming webhook sensor data payload
 */
export const sensorDataPayloadSchema = z.object({
    serialNumber: z
        .string()
        .min(1, 'Serial number is required')
        .max(64, 'Serial number too long'),
    sensorId: z
        .string()
        .min(1, 'Sensor ID is required')
        .max(64, 'Sensor ID too long'),
    deviceSignature: z
        .string()
        .min(1, 'Device signature is required'),
    timestamp: z
        .number()
        .int()
        .positive('Timestamp must be positive'),
    readings: sensorReadingSchema,
});

export type ValidatedSensorDataPayload = z.infer<typeof sensorDataPayloadSchema>;

/**
 * Schema for query parameters
 */
export const queryParamsSchema = z.object({
    batchId: z.string().uuid('Invalid batch ID format'),
});

export const verifyParamsSchema = z.object({
    batchId: z.string().uuid('Invalid batch ID format'),
    dataHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid data hash format'),
});
