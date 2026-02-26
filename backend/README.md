# Agri-Credit Backend

Sensor data ingestion backend with **Blockchain** integration for data integrity verification. This system implements a rollup-style architecture to batch sensor readings and anchor their Merkle roots on-chain.

## 🏗 Architecture

The backend implements a modular architecture for high-throughput sensor data processing:

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   Sensor Layer  │ → │ Network Layer   │ → │ Processing Layer│ → │Blockchain Layer │
│  (IoT Devices)  │   │ (API Gateway)   │   │ (Rollup Engine) │   │ (Smart Contract)│
└─────────────────┘   └─────────────────┘   └─────────────────┘   └─────────────────┘
                                                    │
                                                    ↓
                                           ┌─────────────────┐
                                           │  Query Layer    │
                                           │ (Verification)  │
                                           └─────────────────┘
```

## ✨ Features

- **Webhook API**: High-performance endpoint for receiving sensor data.
- **Data Validation**: Robust Zod schema validation for all incoming payloads.
- **Automated Rollups**: In-memory queue that batches data and builds Merkle trees.
- **Blockchain Anchoring**: Submits Merkle roots to Ethereum (Sepolia) or local Anvil node.
- **PostgreSQL Integration**: Persistent storage for batches, sensor data, and proofs.
- **Verification Engine**: API to verify data integrity against on-chain proofs.

## 🚀 Local Setup

Follow these steps to get the project running locally.

### 1. Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) & Docker Compose
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (for local blockchain and smart contracts)

### 2. Clone and Install

```bash
cd backend
npm install
```

### 3. Environment Configuration

Copy the example environment file and update the values:

```bash
cp .env.example .env
```

Key variables in `.env`:
- `PORT`: Server port (default: 3000)
- `DATABASE_URL`: PostgreSQL connection string
- `SEPOLIA_RPC_URL`: RPC URL for blockchain (use `http://localhost:8545` for local Anvil)
- `BLOCKCHAIN_PRIVATE_KEY`: Private key for transactions
- `CONTRACT_ADDRESS`: Deployed `AgriDataRegistry` contract address

### 4. Database Setup

The project uses PostgreSQL. You can start it easily using Docker Compose:

```bash
docker-compose up -d
```

The server will automatically initialize the necessary tables (`batches`, `sensor_data`, `proofs`) upon startup.

### 5. Smart Contract Setup (Foundry)

To run a local blockchain and deploy contracts:

```bash
# Start a local Ethereum node (Anvil)
anvil

# In a new terminal, build and deploy the contract
cd contracts
forge build

# Deploy to local Anvil (replace <PRIVATE_KEY> with one from Anvil output)
forge create --rpc-url http://localhost:8545 \
  --private-key <PRIVATE_KEY> \
  src/AgriDataRegistry.sol:AgriDataRegistry
```

Update your `.env` with the `CONTRACT_ADDRESS` returned after deployment.

### 6. Run the Backend

```bash
# Development mode with hot-reload
npm run dev
```

## 📁 Project Structure

- `src/api`: Express routes and controllers.
- `src/services`: Core logic (Rollup Engine, Blockchain Relayer, Database).
- `src/config`: Environment and app configuration.
- `contracts/`: Solidity smart contracts and Foundry setup.
- `docker-compose.yml`: PostgreSQL container definition.

## 🛠 API Usage Example

### Submit Sensor Data
```bash
curl -X POST http://localhost:3000/api/webhook/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "serialNumber": "SN001",
    "sensorId": "SENSOR001",
    "deviceSignature": "sig123456",
    "timestamp": 1706489614,
    "readings": {
      "temperature": 25.5,
      "humidity": 60
    }
  }'
```

### Check System Stats
```bash
curl http://localhost:3000/api/query/stats
```

## 📄 License

MIT
