import dotenv from 'dotenv';
dotenv.config();

export const config = {
    // Server
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Sepolia Testnet
    blockchain: {
        rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo',
        privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY || '',
        contractAddress: process.env.CONTRACT_ADDRESS || '',
        chainId: 11155111, // Sepolia testnet chain ID
    },

    // Rollup Configuration
    rollup: {
        batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
        batchIntervalMs: parseInt(process.env.BATCH_INTERVAL_MS || '60000', 10),
    },

    // Database
    databaseUrl: process.env.DATABASE_URL || '',
} as const;

export type Config = typeof config;
