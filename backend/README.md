# Agri-Credit Backend

Sensor data ingestion backend with **Avalanche Fuji blockchain** integration for data integrity verification.

## Architecture

This backend implements the following architecture:

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   Sensor Layer  │ → │ Network Layer   │ → │ Processing Layer│ → │Blockchain Layer │
│  (IoT Devices)  │   │ (API Gateway)   │   │ (Rollup Engine) │   │(Avalanche Fuji) │
└─────────────────┘   └─────────────────┘   └─────────────────┘   └─────────────────┘
                                                    │
                                                    ↓
                                           ┌─────────────────┐
                                           │  Query Layer    │
                                           │ (Verification)  │
                                           └─────────────────┘
```

## Features

- **Webhook API** - POST endpoint for receiving sensor data
- **Data Validation** - Zod schema validation for incoming payloads
- **Queue System** - In-memory queue with configurable batch size
- **Merkle Tree Builder** - Creates integrity proofs for data batches
- **Blockchain Relayer** - Submits Merkle roots to Avalanche Fuji testnet
- **Query API** - Retrieve and verify data against on-chain proofs

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Avalanche Fuji testnet AVAX (for blockchain transactions)

### Installation

```bash
cd backend
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Configure your environment variables:

```env
# Avalanche Fuji Testnet
AVALANCHE_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
BLOCKCHAIN_PRIVATE_KEY=your_private_key_here
CONTRACT_ADDRESS=deployed_contract_address

# Rollup Configuration
BATCH_SIZE=100
BATCH_INTERVAL_MS=60000
```

3. Get testnet AVAX from the [Avalanche Faucet](https://faucet.avax.network/)

### Running the Server

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

## API Endpoints

### Webhook Endpoints

#### POST `/api/webhook/sensor-data`

Receive sensor data from IoT devices.

**Request Body:**
```json
{
  "serialNumber": "SN001",
  "sensorId": "SENSOR001",
  "deviceSignature": "0x...",
  "timestamp": 1706489614,
  "readings": {
    "temperature": 25.5,
    "humidity": 60,
    "soilMoisture": 45
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "dataHash": "0x...",
    "queuePosition": 1
  },
  "timestamp": 1706489614000
}
```

#### GET `/api/webhook/health`

Health check for the webhook service.

### Query Endpoints

#### GET `/api/query/data/:batchId`

Retrieve data for a specific batch.

#### GET `/api/query/verify/:batchId/:dataHash`

Verify data inclusion on-chain using Merkle proof.

#### GET `/api/query/stats`

Get system statistics including blockchain status.

#### GET `/api/query/batches`

List all registered batches with pagination.

## Smart Contract

The `AgriDataRegistry.sol` contract is deployed on Avalanche Fuji testnet and provides:

- **registerDataBatch**: Store Merkle root for a batch
- **verifyDataInclusion**: Verify data is part of a registered batch
- **getBatchRoot**: Retrieve stored Merkle root
- **getBatchTimestamp**: Get registration timestamp

### Deploying the Contract

Use Foundry or Hardhat to deploy:

```bash
# Using Foundry
forge create --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
  --private-key $PRIVATE_KEY \
  contracts/AgriDataRegistry.sol:AgriDataRegistry
```

## Data Flow

1. **Sensor Device** sends data via POST to `/api/webhook/sensor-data`
2. **Validation Layer** validates payload schema and device signature
3. **Queue** batches incoming data based on size/time thresholds
4. **Processor** normalizes and enriches data
5. **Rollup Engine** builds Merkle tree from batch
6. **Blockchain Relayer** submits Merkle root to Avalanche Fuji
7. **Time-Series DB** stores batch data and proofs
8. **Query API** provides data retrieval and verification

## Testing

```bash
# Send test sensor data
curl -X POST http://localhost:3000/api/webhook/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "serialNumber": "SN001",
    "sensorId": "SENSOR001",
    "deviceSignature": "sig123456",
    "timestamp": 1706489614,
    "readings": {
      "temperature": 25.5,
      "humidity": 60,
      "soilMoisture": 45
    }
  }'

# Check health
curl http://localhost:3000/health

# Get stats
curl http://localhost:3000/api/query/stats
```

## License

MIT
