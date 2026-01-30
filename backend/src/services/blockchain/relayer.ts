import { ethers } from 'ethers';
import { config } from '../../config/index.js';
import type { RelayerConfig } from '../../types/index.js';

// ABI for the AgriDataRegistry contract
const AGRI_DATA_REGISTRY_ABI = [
    'function registerDataBatch(bytes32 batchId, bytes32 merkleRoot) external',
    'function verifyDataInclusion(bytes32 batchId, bytes32 leaf, bytes32[] calldata proof) external view returns (bool)',
    'function getBatchRoot(bytes32 batchId) external view returns (bytes32)',
    'function getBatchTimestamp(bytes32 batchId) external view returns (uint256)',
    'event BatchRegistered(bytes32 indexed batchId, bytes32 merkleRoot, uint256 timestamp)',
];

/**
 * Sepolia Testnet Relayer
 * Handles all blockchain interactions for submitting and verifying Merkle roots
 */
class SepoliaRelayer {
    private provider: ethers.JsonRpcProvider | null = null;
    private wallet: ethers.Wallet | null = null;
    private contract: ethers.Contract | null = null;
    private isInitialized: boolean = false;
    private relayerConfig: RelayerConfig;

    constructor() {
        this.relayerConfig = {
            rpcUrl: config.blockchain.rpcUrl,
            privateKey: config.blockchain.privateKey,
            contractAddress: config.blockchain.contractAddress,
            chainId: config.blockchain.chainId,
        };
    }

    /**
     * Initialize the relayer with blockchain connection
     */
    async initialize(): Promise<boolean> {
        try {
            // Check if private key is configured
            if (!this.relayerConfig.privateKey || this.relayerConfig.privateKey === '') {
                console.warn('[Relayer] No private key configured, running in read-only mode');
                this.provider = new ethers.JsonRpcProvider(this.relayerConfig.rpcUrl);
                this.isInitialized = true;
                return true;
            }

            // Create provider for Sepolia
            this.provider = new ethers.JsonRpcProvider(this.relayerConfig.rpcUrl);

            // Verify network connection
            const network = await this.provider.getNetwork();
            console.log(`[Relayer] Connected to network: ${network.name} (chainId: ${network.chainId})`);

            // Verify chain ID
            if (Number(network.chainId) !== this.relayerConfig.chainId) {
                console.warn(`[Relayer] Warning: Expected chainId ${this.relayerConfig.chainId}, got ${network.chainId}`);
            }

            // Create wallet
            this.wallet = new ethers.Wallet(this.relayerConfig.privateKey, this.provider);
            console.log(`[Relayer] Wallet address: ${this.wallet.address}`);

            // Check wallet balance
            const balance = await this.provider.getBalance(this.wallet.address);
            const balanceInEth = ethers.formatEther(balance);
            console.log(`[Relayer] Wallet balance: ${balanceInEth} ETH`);

            if (balance === 0n) {
                console.warn('[Relayer] Warning: Wallet has no ETH. Get testnet tokens from https://sepoliafaucet.com/');
            }

            // Initialize contract if address is provided
            if (this.relayerConfig.contractAddress && this.relayerConfig.contractAddress !== 'to_be_deployed_after_contract_deployment') {
                this.contract = new ethers.Contract(
                    this.relayerConfig.contractAddress,
                    AGRI_DATA_REGISTRY_ABI,
                    this.wallet
                );
                console.log(`[Relayer] Contract initialized at: ${this.relayerConfig.contractAddress}`);
            } else {
                console.warn('[Relayer] No contract address configured. Deploy the contract and update CONTRACT_ADDRESS in .env');
            }

            this.isInitialized = true;
            return true;

        } catch (error) {
            console.error('[Relayer] Failed to initialize:', error);
            return false;
        }
    }

    /**
     * Submit a Merkle root to the blockchain
     */
    async submitMerkleRoot(merkleRoot: string, batchId: string): Promise<string> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.contract || !this.wallet) {
            console.warn('[Relayer] Contract not available, simulating transaction');
            return this.simulateTransaction(merkleRoot, batchId);
        }

        try {
            console.log(`[Relayer] Submitting Merkle root for batch ${batchId}`);
            console.log(`[Relayer] Merkle root: ${merkleRoot}`);

            // Convert batchId and merkleRoot to bytes32
            const batchIdBytes32 = ethers.id(batchId);
            const merkleRootBytes32 = merkleRoot;

            // Estimate gas
            const gasEstimate = await this.contract.registerDataBatch.estimateGas(
                batchIdBytes32,
                merkleRootBytes32
            );

            console.log(`[Relayer] Estimated gas: ${gasEstimate.toString()}`);

            // Send transaction
            const tx = await this.contract.registerDataBatch(
                batchIdBytes32,
                merkleRootBytes32,
                {
                    gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
                }
            );

            console.log(`[Relayer] Transaction sent: ${tx.hash}`);

            // Wait for confirmation
            const receipt = await tx.wait();

            console.log(`[Relayer] Transaction confirmed in block ${receipt.blockNumber}`);
            console.log(`[Relayer] Gas used: ${receipt.gasUsed.toString()}`);

            return tx.hash;

        } catch (error) {
            console.error('[Relayer] Failed to submit Merkle root:', error);
            throw error;
        }
    }

    /**
     * Simulate a transaction when contract is not deployed
     */
    private simulateTransaction(merkleRoot: string, batchId: string): string {
        // Generate a fake transaction hash for testing
        const fakeHash = ethers.id(`${batchId}-${merkleRoot}-${Date.now()}`);
        console.log(`[Relayer] SIMULATED transaction: ${fakeHash}`);
        console.log('[Relayer] Note: Deploy contract and configure CONTRACT_ADDRESS for real transactions');
        return fakeHash;
    }

    /**
     * Verify data inclusion on-chain
     */
    async verifyData(
        batchId: string,
        dataHash: string,
        proof: string[]
    ): Promise<{ isValid: boolean; merkleRoot: string }> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.contract) {
            console.warn('[Relayer] Contract not available, cannot verify on-chain');
            return { isValid: false, merkleRoot: '' };
        }

        try {
            const batchIdBytes32 = ethers.id(batchId);

            // Get stored Merkle root
            const storedRoot = await this.contract.getBatchRoot(batchIdBytes32);

            // Verify inclusion
            const isValid = await this.contract.verifyDataInclusion(
                batchIdBytes32,
                dataHash,
                proof
            );

            return {
                isValid,
                merkleRoot: storedRoot,
            };

        } catch (error) {
            console.error('[Relayer] Failed to verify data:', error);
            throw error;
        }
    }

    /**
     * Get batch root from blockchain
     */
    async getBatchRoot(batchId: string): Promise<string | null> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.contract) {
            return null;
        }

        try {
            const batchIdBytes32 = ethers.id(batchId);
            const root = await this.contract.getBatchRoot(batchIdBytes32);
            return root;
        } catch (error) {
            console.error('[Relayer] Failed to get batch root:', error);
            return null;
        }
    }

    /**
     * Get relayer status
     */
    async getStatus(): Promise<{
        connected: boolean;
        network: string | null;
        walletAddress: string | null;
        balance: string | null;
        contractDeployed: boolean;
    }> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            let network = null;
            let balance = null;

            if (this.provider) {
                const networkInfo = await this.provider.getNetwork();
                network = `${networkInfo.name} (${networkInfo.chainId})`;

                if (this.wallet) {
                    const balanceWei = await this.provider.getBalance(this.wallet.address);
                    balance = ethers.formatEther(balanceWei) + ' ETH';
                }
            }

            return {
                connected: this.isInitialized,
                network,
                walletAddress: this.wallet?.address || null,
                balance,
                contractDeployed: this.contract !== null,
            };

        } catch (error) {
            return {
                connected: false,
                network: null,
                walletAddress: null,
                balance: null,
                contractDeployed: false,
            };
        }
    }
}

// Export singleton instance
export const sepoliaRelayer = new SepoliaRelayer();
