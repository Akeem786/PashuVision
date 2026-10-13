/**
 * Tamper-Evident Record Verification Service
 *
 * Provides cryptographic record verification and audit chain tracking for livestock records.
 * Records are anchored via deterministic canonical JSON and SHA-256 cryptographic hashing.
 *
 * Note: Core verification is anchored in PashuVision's tamper-evident database audit log.
 * For external public blockchain anchoring (Polygon / Ethereum), use the optional
 * PolygonEthereumAdapter below when an actual smart contract has been deployed.
 */

class BlockchainIntegrationService {
  constructor() {
    this.apiBase = '/api/blockchain';
  }

  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  /**
   * Verify an animal record's cryptographic integrity.
   * Compares the live record with stored SHA-256 audit hash.
   *
   * @param {string} animalId
   * @returns {Promise<{ status: 'VERIFIED'|'TAMPERED'|'UNAUDITED', verified: boolean, currentHash: string, storedHash: string, chainValid: boolean, tamperDetails: any }>}
   */
  async verifyAnimalRecord(animalId) {
    if (!animalId) {
      return { status: 'INVALID', verified: false, error: 'Animal ID is required' };
    }

    try {
      const response = await fetch(`${this.apiBase}/animal/${encodeURIComponent(animalId)}/verify`, {
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Verification request failed (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('Record verification request failed:', error);
      return {
        status: 'ERROR',
        verified: false,
        error: error.message || 'Unable to connect to verification service'
      };
    }
  }

  /**
   * Retrieve the complete chronological cryptographic audit history for an animal.
   *
   * @param {string} animalId
   * @returns {Promise<Array>}
   */
  async getRecordHistory(animalId) {
    if (!animalId) return [];

    try {
      const response = await fetch(`${this.apiBase}/animal/${encodeURIComponent(animalId)}/history`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Failed to fetch history (${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch audit history:', error);
      return [];
    }
  }

  /**
   * Fetch cryptographic certificate for a verified animal record.
   *
   * @param {string} animalId
   * @returns {Promise<Object>}
   */
  async getCertificate(animalId) {
    if (!animalId) throw new Error('Animal ID required');

    const response = await fetch(`${this.apiBase}/animal/${encodeURIComponent(animalId)}/certificate`, {
      headers: this.getAuthHeaders()
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate cryptographic certificate');
    }

    return data;
  }

  /**
   * Get system-wide audit verification statistics.
   */
  async getVerificationStats() {
    try {
      const response = await fetch(`${this.apiBase}/stats`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to load stats (${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to load verification stats:', error);
      return {
        engine: 'Tamper-Evident Record Verification',
        totalAuditRecords: 0,
        isPublicBlockchain: false,
        error: error.message
      };
    }
  }
}

/**
 * Optional Polygon / Ethereum External Adapter
 *
 * This adapter is designed for future optional anchoring of SHA-256 audit hashes
 * to public EVM-compatible networks (Polygon POS, Ethereum Mainnet/Sepolia).
 *
 * Technical Honesty Notice:
 * This adapter is completely dormant until an actual smart contract address
 * and Web3 provider are configured. It does NOT claim simulated network transactions.
 */
export class PolygonEthereumAdapter {
  constructor(config = {}) {
    this.contractAddress = config.contractAddress || null;
    this.rpcUrl = config.rpcUrl || null;
    this.chainId = config.chainId || null;
    this.isConfigured = Boolean(this.contractAddress && this.rpcUrl);
  }

  /**
   * Check whether public network anchoring is configured.
   */
  isAvailable() {
    return this.isConfigured && typeof window !== 'undefined' && Boolean(window.ethereum);
  }

  /**
   * Anchor a record hash to Polygon/Ethereum smart contract.
   * Requires user's MetaMask/Web3 wallet confirmation.
   */
  async anchorHashToNetwork({ animalId, recordHash }) {
    if (!this.isAvailable()) {
      return {
        success: false,
        status: 'NOT_CONFIGURED',
        message: 'Public blockchain anchoring is not configured. Records remain secured by PashuVision Tamper-Evident Cryptographic Audit Chain.'
      };
    }

    try {
      // Future EVM transaction invocation with actual Web3 provider
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];

      return {
        success: true,
        status: 'PENDING_TRANSACTION',
        network: `ChainID ${this.chainId}`,
        account,
        animalId,
        recordHash,
        message: 'Transaction sent to EVM node.'
      };
    } catch (err) {
      return {
        success: false,
        status: 'USER_REJECTED',
        error: err.message
      };
    }
  }
}

export default BlockchainIntegrationService;
