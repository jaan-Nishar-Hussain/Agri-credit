# Agri-Credit Backend

Sensor data ingestion with Sepolia blockchain integration for agricultural credit verification.

## Deployment to Render

### Configuration

When deploying to Render, use these settings:

| Setting | Value |
|---------|-------|
| **Root Directory** | `backend` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Node Version** | `20` or `22` |

### Environment Variables

Set the following environment variables in Render dashboard:

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (Render sets this automatically) |
| `NODE_ENV` | Set to `production` |
| `SEPOLIA_RPC_URL` | Your Sepolia RPC endpoint (e.g., Alchemy, Infura) |
| `BLOCKCHAIN_PRIVATE_KEY` | Your wallet private key |
| `CONTRACT_ADDRESS` | Deployed contract address |

## Local Development

```bash
cd backend
npm install
npm run dev
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/webhook/health` - Webhook service health
- `POST /api/webhook/sensor-data` - Ingest sensor data
- `GET /api/query/stats` - Query statistics
- `GET /api/query/batches` - List all batches
