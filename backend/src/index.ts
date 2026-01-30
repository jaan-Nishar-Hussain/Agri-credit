import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import webhookRoutes from './api/routes/webhook.routes.js';
import queryRoutes from './api/routes/query.routes.js';
import { sepoliaRelayer } from './services/blockchain/relayer.js';
import { dataProcessor } from './services/processor/dataProcessor.js';

// Force import to initialize the processor
void dataProcessor;

const app = express();

// ============================================
// Middleware
// ============================================

// CORS configuration
app.use(cors({
    origin: '*', // Configure appropriately for production
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// JSON body parser
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, _res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// ============================================
// API Gateway - Routes
// ============================================

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        timestamp: Date.now(),
        version: '1.0.0',
    });
});

// Webhook routes (Ingestion Layer)
app.use('/api/webhook', webhookRoutes);

// Query routes (Query & Verification Layer)
app.use('/api/query', queryRoutes);

// Root endpoint
app.get('/', (_req, res) => {
    res.json({
        name: 'Agri-Credit Backend API',
        version: '1.0.0',
        description: 'Sensor data ingestion with Sepolia blockchain integration',
        endpoints: {
            health: 'GET /health',
            webhookHealth: 'GET /api/webhook/health',
            sensorData: 'POST /api/webhook/sensor-data',
            queryData: 'GET /api/query/data/:batchId',
            verifyData: 'GET /api/query/verify/:batchId/:dataHash',
            stats: 'GET /api/query/stats',
            batches: 'GET /api/query/batches',
        },
        blockchain: {
            network: 'Sepolia Testnet',
            chainId: 11155111,
            rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/your-api-key',
        },
    });
});

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        timestamp: Date.now(),
    });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server] Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: Date.now(),
    });
});

// ============================================
// Server Startup
// ============================================

async function startServer(): Promise<void> {
    try {
        console.log('=============================================');
        console.log('Agri-Credit Backend Server');
        console.log('=============================================');

        // Initialize blockchain relayer
        console.log('[Server] Initializing Sepolia relayer...');
        const relayerInitialized = await sepoliaRelayer.initialize();

        if (relayerInitialized) {
            const status = await sepoliaRelayer.getStatus();
            console.log('[Server] Blockchain relayer status:', status);
        }

        // Start HTTP server
        app.listen(config.port, () => {
            console.log('=============================================');
            console.log(`[Server] Running on http://localhost:${config.port}`);
            console.log(`[Server] Environment: ${config.nodeEnv}`);
            console.log('=============================================');
            console.log('[Server] Ready to receive sensor data!');
            console.log('');
            console.log('Example POST request:');
            console.log(`curl -X POST http://localhost:${config.port}/api/webhook/sensor-data \\`);
            console.log('  -H "Content-Type: application/json" \\');
            console.log('  -d \'{"serialNumber":"SN001","sensorId":"SENSOR001","deviceSignature":"sig123456","timestamp":1706489614,"readings":{"temperature":25.5,"humidity":60}}\'');
            console.log('');
        });

    } catch (error) {
        console.error('[Server] Failed to start:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('[Server] Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('[Server] Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer();
