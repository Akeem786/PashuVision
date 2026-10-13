const assert = require('assert');
const BlockchainService = require('../src/services/BlockchainService');

// Mock in-memory database service for testing
class MockDatabaseService {
  constructor() {
    this.animals = new Map();
    this.auditLogs = new Map();
  }

  async getAnimalById(id) {
    return this.animals.get(String(id)) || null;
  }

  async getAnimals() {
    return Array.from(this.animals.values());
  }

  async setAnimal(animal) {
    this.animals.set(String(animal.id), JSON.parse(JSON.stringify(animal)));
  }

  async appendAuditRecord(record) {
    const list = this.auditLogs.get(String(record.animal_id)) || [];
    list.push(JSON.parse(JSON.stringify(record)));
    this.auditLogs.set(String(record.animal_id), list);
    return record;
  }

  async getAuditRecords(animalId) {
    return this.auditLogs.get(String(animalId)) || [];
  }

  async getAllAuditRecords() {
    let all = [];
    for (const logs of this.auditLogs.values()) {
      all = all.concat(logs);
    }
    return all;
  }
}

async function runTests() {
  console.log('🧪 Running Tamper-Evident Record Verification Test Suite...\n');
  const blockchain = new BlockchainService();
  const db = new MockDatabaseService();

  // ----------------------------------------------------
  // Test 1: Canonical JSON Determinism (Key Order Invariance)
  // ----------------------------------------------------
  console.log('1. Testing Canonical JSON Determinism...');
  const objA = { id: 'ANIMAL-001', predictedBreed: 'Gir', ownerName: 'Ramesh Patel', location: 'Gujarat' };
  const objB = { location: 'Gujarat', ownerName: 'Ramesh Patel', id: 'ANIMAL-001', predictedBreed: 'Gir' };

  const hashA = blockchain.calculateRecordHash(objA);
  const hashB = blockchain.calculateRecordHash(objB);

  assert.strictEqual(hashA, hashB, 'Different key order must produce identical canonical SHA-256 hash');
  console.log(`   ✅ Invariant SHA-256 Hash: ${hashA.substring(0, 16)}...`);

  // ----------------------------------------------------
  // Test 2: Record Creation & Audit Anchoring
  // ----------------------------------------------------
  console.log('2. Testing Record Creation & Initial Audit Anchoring...');
  const testAnimal = {
    id: 'PV-TEST-101',
    earTag: 'TAG-9821',
    species: 'cattle',
    predictedBreed: 'Gir',
    ownerName: 'Sunita Sharma',
    location: 'Anand, Gujarat',
    ageMonths: 36,
    gender: 'female',
    status: 'pending',
    healthStatus: 'healthy',
    vaccinationStatus: 'up_to_date',
    weight: 420.5
  };

  await db.setAnimal(testAnimal);

  const initialAudit = await blockchain.recordAnimalEvent(db, {
    animal: testAnimal,
    operation: 'CREATE',
    actorId: 'user-farmer-1'
  });

  assert.strictEqual(initialAudit.operation, 'CREATE');
  assert.strictEqual(initialAudit.previous_hash, blockchain.GENESIS_HASH);
  assert.ok(initialAudit.record_hash, 'Must have record hash');
  assert.ok(initialAudit.chain_hash, 'Must have chain hash');
  console.log(`   ✅ Genesis block created with Chain Hash: ${initialAudit.chain_hash.substring(0, 16)}...`);

  // ----------------------------------------------------
  // Test 3: Verification of Untampered Record
  // ----------------------------------------------------
  console.log('3. Testing Verification of Untampered Record...');
  const verifyResult1 = await blockchain.verifyAnimalRecord(db, testAnimal.id);

  assert.strictEqual(verifyResult1.status, 'VERIFIED', 'Untampered record must be VERIFIED');
  assert.strictEqual(verifyResult1.verified, true);
  assert.strictEqual(verifyResult1.chainValid, true);
  assert.strictEqual(verifyResult1.totalAuditRecords, 1);
  assert.strictEqual(verifyResult1.currentHash, verifyResult1.storedHash);
  console.log('   ✅ Record Verified: Live SHA-256 matches stored audit hash.');

  // ----------------------------------------------------
  // Test 4: Tamper Detection (Direct Database Modification)
  // ----------------------------------------------------
  console.log('4. Testing Tamper Detection on Unauthorized Data Alteration...');
  // Simulate attacker modifying database directly bypassing the audit chain
  const tamperedAnimal = JSON.parse(JSON.stringify(testAnimal));
  tamperedAnimal.ownerName = 'Malicious Actor';
  tamperedAnimal.predictedBreed = 'Sahiwal';
  await db.setAnimal(tamperedAnimal);

  const verifyTampered = await blockchain.verifyAnimalRecord(db, testAnimal.id);

  assert.strictEqual(verifyTampered.status, 'TAMPERED', 'Modified record must be flagged as TAMPERED');
  assert.strictEqual(verifyTampered.verified, false);
  assert.notStrictEqual(verifyTampered.currentHash, verifyTampered.storedHash);
  assert.ok(verifyTampered.tamperDetails, 'Must provide tamper details');
  assert.ok(verifyTampered.tamperDetails.modifiedFields.length >= 2, 'Must identify modified fields');

  const modifiedFieldNames = verifyTampered.tamperDetails.modifiedFields.map(f => f.field);
  assert.ok(modifiedFieldNames.includes('ownerName'), 'Must detect ownerName modification');
  assert.ok(modifiedFieldNames.includes('predictedBreed'), 'Must detect predictedBreed modification');
  console.log(`   🚨 Tamper Detected: ${verifyTampered.status} with fields: ${modifiedFieldNames.join(', ')}`);

  // ----------------------------------------------------
  // Test 5: Authorized Update & Chain Linking
  // ----------------------------------------------------
  console.log('5. Testing Authorized Update with Chain Continuity...');
  // Legitimate update applied through audit engine
  const legitimateUpdate = JSON.parse(JSON.stringify(testAnimal));
  legitimateUpdate.status = 'approved';
  legitimateUpdate.weight = 435.0;
  await db.setAnimal(legitimateUpdate);

  const updateAudit = await blockchain.recordAnimalEvent(db, {
    animal: legitimateUpdate,
    operation: 'APPROVE',
    actorId: 'admin-vet-1',
    metadata: { reason: 'Veterinary verification approved' }
  });

  assert.strictEqual(updateAudit.operation, 'APPROVE');
  assert.strictEqual(updateAudit.previous_hash, initialAudit.chain_hash, 'Next block previous_hash must equal preceding chain_hash');

  const verifyApproved = await blockchain.verifyAnimalRecord(db, testAnimal.id);
  assert.strictEqual(verifyApproved.status, 'VERIFIED', 'Authorized update must restore VERIFIED state');
  assert.strictEqual(verifyApproved.verified, true);
  assert.strictEqual(verifyApproved.totalAuditRecords, 2);
  assert.strictEqual(verifyApproved.lastOperation, 'APPROVE');
  console.log('   ✅ Chain Block 2 Linked. Continuity Verified.');

  // ----------------------------------------------------
  // Test 6: Certificate Generation
  // ----------------------------------------------------
  console.log('6. Testing Cryptographic Certificate Generation...');
  const certificate = await blockchain.generateCertificate(db, testAnimal.id);

  assert.strictEqual(certificate.verificationStatus, 'VERIFIED');
  assert.strictEqual(certificate.animalId, testAnimal.id);
  assert.ok(certificate.certificateSignature, 'Must contain cryptographic certificate signature');
  assert.strictEqual(certificate.totalAudits, 2);
  console.log(`   ✅ Cryptographic Certificate Issued: Signature ${certificate.certificateSignature.substring(0, 16)}...`);

  // ----------------------------------------------------
  // Test 7: System-wide Stats
  // ----------------------------------------------------
  console.log('7. Testing System Verification Stats...');
  const stats = await blockchain.getBlockchainStats(db);
  assert.strictEqual(stats.totalAuditRecords, 2);
  assert.strictEqual(stats.uniqueAnimalsAudited, 1);
  assert.strictEqual(stats.isPublicBlockchain, false);
  console.log('   ✅ Stats Verified (Honest non-public blockchain disclosure confirmed).');

  console.log('\n🎉 ALL 7 AUDIT & VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
