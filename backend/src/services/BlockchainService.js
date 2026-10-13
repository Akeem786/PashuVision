const crypto = require('crypto');

/**
 * BlockchainService - Tamper-Evident Record Verification Architecture
 *
 * Implements a cryptographic audit chain for livestock records:
 * Animal Record -> Canonical JSON -> SHA-256 Hash -> Linked Block Hash -> Database Persistence
 *
 * Verification compares current live record hash with stored cryptographic hash
 * and validates the entire audit chain. Outputs: VERIFIED or TAMPERED.
 *
 * Note: This is an application-level cryptographic audit chain ensuring tamper-evidence.
 * It is not connected to a decentralized Ethereum/Polygon network unless the optional
 * external blockchain adapter is explicitly invoked.
 */
class BlockchainService {
  constructor() {
    this.GENESIS_HASH = '0'.repeat(64);
  }

  /**
   * Normalizes animal record attributes into a deterministic canonical object.
   * Strips dynamic ephemeral fields (like lastVerifiedAt, server timestamps, or volatile UI metadata)
   * while preserving all critical zootechnical, ownership, and identification attributes.
   */
  normalizeAnimalAttributes(animal) {
    if (!animal || typeof animal !== 'object') return {};

    return {
      id: String(animal.id || ''),
      earTag: animal.earTag ? String(animal.earTag).trim() : null,
      species: animal.species ? String(animal.species).trim().toLowerCase() : 'cattle',
      predictedBreed: animal.predictedBreed ? String(animal.predictedBreed).trim() : (animal.breed ? String(animal.breed).trim() : 'Unknown'),
      ownerName: animal.ownerName ? String(animal.ownerName).trim() : (animal.owner ? String(animal.owner).trim() : 'Unknown'),
      location: animal.location ? String(animal.location).trim() : '',
      ageMonths: animal.ageMonths !== undefined && animal.ageMonths !== null ? Number(animal.ageMonths) : null,
      gender: animal.gender ? String(animal.gender).trim().toLowerCase() : 'female',
      status: animal.status ? String(animal.status).trim().toLowerCase() : 'pending',
      healthStatus: animal.healthStatus ? String(animal.healthStatus).trim().toLowerCase() : 'healthy',
      vaccinationStatus: animal.vaccinationStatus ? String(animal.vaccinationStatus).trim().toLowerCase() : 'unknown',
      weight: animal.weight !== undefined && animal.weight !== null ? Number(animal.weight) : null
    };
  }

  /**
   * Converts an object into deterministic canonical JSON (sorted keys, no extraneous whitespace).
   */
  toCanonicalJson(obj) {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map(item => this.toCanonicalJson(item)).join(',') + ']';
    }
    const sortedKeys = Object.keys(obj).sort();
    const keyPairs = sortedKeys.map(k => `${JSON.stringify(k)}:${this.toCanonicalJson(obj[k])}`);
    return '{' + keyPairs.join(',') + '}';
  }

  /**
   * Calculates the SHA-256 hash of a normalized animal record.
   */
  calculateRecordHash(animal) {
    const normalized = this.normalizeAnimalAttributes(animal);
    const canonicalJson = this.toCanonicalJson(normalized);
    return crypto.createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
  }

  /**
   * Computes the linked cryptographic chain hash:
   * chainHash = SHA-256(recordHash + previousHash + operation + timestamp + actorId)
   */
  calculateChainHash(recordHash, previousHash, operation, timestamp, actorId) {
    const payload = `${recordHash}:${previousHash || this.GENESIS_HASH}:${operation}:${timestamp}:${actorId}`;
    return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
  }

  /**
   * Records an immutable animal audit event in the database.
   *
   * @param {Object} db - DatabaseService instance
   * @param {Object} params - { animal, operation, actorId, metadata }
   * @returns {Promise<Object>} Created audit record
   */
  async recordAnimalEvent(db, { animal, operation = 'CREATE', actorId = 'system', metadata = {} }) {
    if (!animal || !animal.id) {
      throw new Error('Animal record with valid ID is required for audit event');
    }

    const normalizedSnapshot = this.normalizeAnimalAttributes(animal);
    const recordHash = this.calculateRecordHash(animal);
    const timestamp = new Date().toISOString();

    // Retrieve previous audit logs for this animal to link the chain
    let previousHash = this.GENESIS_HASH;
    try {
      if (db && typeof db.getAuditRecords === 'function') {
        const existingLogs = await db.getAuditRecords(String(animal.id));
        if (existingLogs && existingLogs.length > 0) {
          const lastLog = existingLogs[existingLogs.length - 1];
          previousHash = lastLog.chain_hash || lastLog.chainHash || this.GENESIS_HASH;
        }
      }
    } catch (err) {
      console.warn('⚠️  Could not fetch previous audit records, using genesis hash:', err.message);
    }

    const chainHash = this.calculateChainHash(recordHash, previousHash, operation, timestamp, actorId);

    const auditRecord = {
      id: crypto.randomUUID(),
      animal_id: String(animal.id),
      operation: String(operation).toUpperCase(),
      record_hash: recordHash,
      previous_hash: previousHash,
      chain_hash: chainHash,
      actor_id: String(actorId),
      timestamp,
      canonical_snapshot: normalizedSnapshot,
      metadata: metadata || {}
    };

    if (db && typeof db.appendAuditRecord === 'function') {
      try {
        await db.appendAuditRecord(auditRecord);
        console.log(`🔒 Cryptographic audit record appended: ${operation} on Animal ${animal.id} (Hash: ${recordHash.substring(0, 10)}...)`);
      } catch (err) {
        console.error('❌ Failed to persist audit record to database:', err.message);
      }
    }

    return auditRecord;
  }

  /**
   * Verifies the cryptographic integrity of an animal record.
   * Compares the live record hash with the latest stored audit hash and checks chain continuity.
   *
   * Output state:
   * - VERIFIED: Live record matches stored hash, chain valid.
   * - TAMPERED: Live record has been altered, or chain broken.
   */
  async verifyAnimalRecord(db, animalId) {
    if (!animalId) {
      return { status: 'INVALID', verified: false, error: 'Animal ID is required' };
    }

    // 1. Fetch live animal record from database
    let liveAnimal = null;
    try {
      if (db && typeof db.getAnimalById === 'function') {
        liveAnimal = await db.getAnimalById(animalId);
      } else if (db && typeof db.getAnimals === 'function') {
        const animals = await db.getAnimals();
        liveAnimal = animals.find(a => String(a.id) === String(animalId));
      }
    } catch (err) {
      return { status: 'ERROR', verified: false, error: `Failed to fetch live animal record: ${err.message}` };
    }

    if (!liveAnimal) {
      return { status: 'NOT_FOUND', verified: false, error: `Animal record ${animalId} not found in database` };
    }

    // 2. Compute current live canonical SHA-256 hash
    const currentNormalized = this.normalizeAnimalAttributes(liveAnimal);
    const currentHash = this.calculateRecordHash(liveAnimal);

    // 3. Fetch audit records for this animal
    let auditRecords = [];
    try {
      if (db && typeof db.getAuditRecords === 'function') {
        auditRecords = await db.getAuditRecords(String(animalId));
      }
    } catch (err) {
      return { status: 'ERROR', verified: false, error: `Failed to fetch audit records: ${err.message}` };
    }

    if (!auditRecords || auditRecords.length === 0) {
      return {
        status: 'UNAUDITED',
        verified: false,
        animalId,
        currentHash,
        storedHash: null,
        message: 'No cryptographic audit record has been anchored for this animal yet.'
      };
    }

    // 4. Validate internal chain integrity
    let chainValid = true;
    for (let i = 0; i < auditRecords.length; i++) {
      const record = auditRecords[i];
      const recHash = record.record_hash || record.recordHash;
      const prevHash = record.previous_hash || record.previousHash;
      const chHash = record.chain_hash || record.chainHash;
      const op = record.operation;
      const ts = record.timestamp;
      const actor = record.actor_id || record.actorId;

      const expectedChainHash = this.calculateChainHash(recHash, prevHash, op, ts, actor);
      if (chHash !== expectedChainHash) {
        chainValid = false;
        break;
      }

      if (i > 0) {
        const prevBlock = auditRecords[i - 1];
        const prevBlockChainHash = prevBlock.chain_hash || prevBlock.chainHash;
        if (prevHash !== prevBlockChainHash) {
          chainValid = false;
          break;
        }
      }
    }

    // 5. Compare live hash with latest stored record hash
    const latestAudit = auditRecords[auditRecords.length - 1];
    const storedHash = latestAudit.record_hash || latestAudit.recordHash;
    const storedSnapshot = latestAudit.canonical_snapshot || latestAudit.canonicalSnapshot || {};

    const hashesMatch = currentHash === storedHash;

    if (hashesMatch && chainValid) {
      return {
        status: 'VERIFIED',
        verified: true,
        animalId,
        currentHash,
        storedHash,
        chainValid: true,
        totalAuditRecords: auditRecords.length,
        lastOperation: latestAudit.operation,
        lastAuditedAt: latestAudit.timestamp,
        actorId: latestAudit.actor_id || latestAudit.actorId,
        verificationTimestamp: new Date().toISOString(),
        message: 'Cryptographic integrity confirmed. Record exactly matches the tamper-evident audit chain.'
      };
    }

    // Tamper detected! Perform attribute diff
    const modifiedFields = [];
    for (const key of Object.keys(currentNormalized)) {
      if (JSON.stringify(currentNormalized[key]) !== JSON.stringify(storedSnapshot[key])) {
        modifiedFields.push({
          field: key,
          storedValue: storedSnapshot[key] !== undefined ? storedSnapshot[key] : null,
          currentValue: currentNormalized[key] !== undefined ? currentNormalized[key] : null
        });
      }
    }

    return {
      status: 'TAMPERED',
      verified: false,
      animalId,
      currentHash,
      storedHash,
      chainValid,
      totalAuditRecords: auditRecords.length,
      lastOperation: latestAudit.operation,
      lastAuditedAt: latestAudit.timestamp,
      actorId: latestAudit.actor_id || latestAudit.actorId,
      verificationTimestamp: new Date().toISOString(),
      tamperDetails: {
        reason: !hashesMatch
          ? 'Record attributes have been altered without an authorized audit chain transaction'
          : 'Cryptographic block chain continuity broken',
        modifiedFields: modifiedFields
      },
      warning: 'SECURITY ALERT: This record failed tamper verification. Stored SHA-256 hash does not match current state.'
    };
  }

  /**
   * Retrieves complete chronological audit history for an animal.
   */
  async getAnimalHistory(db, animalId) {
    if (!animalId || !db || typeof db.getAuditRecords !== 'function') {
      return [];
    }
    const records = await db.getAuditRecords(String(animalId));
    return (records || []).map((r, index) => ({
      sequenceIndex: index + 1,
      id: r.id,
      animalId: r.animal_id || r.animalId,
      operation: r.operation,
      recordHash: r.record_hash || r.recordHash,
      previousHash: r.previous_hash || r.previousHash,
      chainHash: r.chain_hash || r.chainHash,
      actorId: r.actor_id || r.actorId,
      timestamp: r.timestamp,
      snapshot: r.canonical_snapshot || r.canonicalSnapshot,
      metadata: r.metadata
    }));
  }

  /**
   * Generates a tamper-evident cryptographic certificate of authenticity.
   */
  async generateCertificate(db, animalId) {
    const verification = await this.verifyAnimalRecord(db, animalId);

    if (!verification.verified) {
      throw new Error(`Cannot generate certificate for record in status: ${verification.status}`);
    }

    const history = await this.getAnimalHistory(db, animalId);
    const certificatePayload = {
      certificateId: crypto.randomUUID(),
      animalId,
      verifiedAt: new Date().toISOString(),
      recordHash: verification.currentHash,
      lastOperation: verification.lastOperation,
      totalAudits: history.length,
      auditChainTip: history.length > 0 ? history[history.length - 1].chainHash : null,
      verificationAuthority: 'PashuVision Cryptographic Verification Engine',
      hashAlgorithm: 'SHA-256'
    };

    const certificateSignature = crypto
      .createHash('sha256')
      .update(this.toCanonicalJson(certificatePayload), 'utf8')
      .digest('hex');

    return {
      ...certificatePayload,
      certificateSignature,
      verificationStatus: 'VERIFIED',
      history: history.map(h => ({
        operation: h.operation,
        timestamp: h.timestamp,
        chainHash: h.chainHash,
        actor: h.actorId
      }))
    };
  }

  /**
   * Returns system-wide audit verification statistics.
   */
  async getBlockchainStats(db) {
    let allRecords = [];
    if (db && typeof db.getAllAuditRecords === 'function') {
      allRecords = await db.getAllAuditRecords(1000, 0);
    }

    const uniqueAnimals = new Set(allRecords.map(r => r.animal_id || r.animalId)).size;
    const operationsCount = allRecords.reduce((acc, r) => {
      const op = r.operation || 'UNKNOWN';
      acc[op] = (acc[op] || 0) + 1;
      return acc;
    }, {});

    return {
      engine: 'Tamper-Evident Record Verification (Cryptographic SHA-256 Audit Chain)',
      architecture: 'Cryptographically linked immutable audit log stored in Supabase/PostgreSQL with SHA-256 canonical hashing',
      isPublicBlockchain: false,
      network: 'Local/Application Audit Chain (Polygon/Ethereum adapter available as optional plug-in)',
      totalAuditRecords: allRecords.length,
      uniqueAnimalsAudited: uniqueAnimals,
      operationsBreakdown: operationsCount,
      latestAuditHash: allRecords.length > 0 ? (allRecords[0].chain_hash || allRecords[0].chainHash) : null,
      supportedVerifications: ['CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'FLAG']
    };
  }

  // Legacy compatibility helpers for existing test code
  createAnimalRecord(animalData, ownerAddress) {
    const recordHash = this.calculateRecordHash(animalData);
    const chainHash = this.calculateChainHash(recordHash, this.GENESIS_HASH, 'CREATE', new Date().toISOString(), ownerAddress);
    return {
      transactionId: crypto.randomUUID(),
      recordHash,
      chainHash,
      data: { type: 'animal_record', animalId: animalData.id, ...animalData },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = BlockchainService;
