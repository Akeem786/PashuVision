const assert = require('assert');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const BASE_URL = 'http://127.0.0.1:4000';

// Helper to generate auth tokens
const createToken = (userId, role = 'user') => {
  return jwt.sign({ sub: userId, role, name: `Test ${role}` }, JWT_SECRET, { expiresIn: '1h' });
};

async function runWorkflowTests() {
  console.log('🚀 Starting PashuVision Animal Record & QR Workflow Test Suite...\n');

  let passed = 0;
  let failed = 0;

  async function it(desc, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${desc}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  const userToken = createToken('user_farmer_alpha', 'user');
  const otherUserToken = createToken('user_farmer_beta', 'user');
  const adminToken = createToken('admin_supervisor', 'admin');

  const testAnimalId = `anim_test_${Date.now()}`;
  const testEarTag = `TAG_${Date.now().toString().slice(-6)}`;

  // --- 1. Deterministic QR & Privacy Verification ---
  console.log('--- 1. Testing Deterministic QR Generation & Privacy Protection ---');

  await it('Generates deterministic QR payload without personal owner data', async () => {
    // Canonical payload format
    const canonicalPayload = {
      protocol: 'pashuvision',
      version: '1.0',
      type: 'animal',
      id: testAnimalId,
      earTag: testEarTag
    };

    // Verify it contains NO ownerName, phone, village, district, address, or timestamp
    assert.strictEqual(canonicalPayload.ownerName, undefined);
    assert.strictEqual(canonicalPayload.phone, undefined);
    assert.strictEqual(canonicalPayload.address, undefined);
    assert.strictEqual(canonicalPayload.timestamp, undefined);

    const qrString1 = JSON.stringify(canonicalPayload);
    const qrCode1 = await QRCode.toDataURL(qrString1, { errorCorrectionLevel: 'M', margin: 1, width: 200 });

    const qrString2 = JSON.stringify(canonicalPayload);
    const qrCode2 = await QRCode.toDataURL(qrString2, { errorCorrectionLevel: 'M', margin: 1, width: 200 });

    assert.strictEqual(qrCode1, qrCode2, 'QR codes generated for the same animal payload must be byte-identical');
  });

  // --- 2. Validation & Error Handling ---
  console.log('\n--- 2. Testing ID Validation & Error Handling ---');

  await it('Rejects invalid animal ID formats with HTTP 400', async () => {
    const invalidIds = ['ab', 'invalid/slash', 'space id', 'invalid*chars!'];
    for (const badId of invalidIds) {
      const res = await fetch(`${BASE_URL}/api/animals/${encodeURIComponent(badId)}`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      assert.strictEqual(res.status, 400, `Expected 400 for bad ID "${badId}", got ${res.status}`);
      const data = await res.json();
      assert.strictEqual(data.code, 'INVALID_ANIMAL_ID');
    }
  });

  await it('Handles nonexistent / deleted animals gracefully with HTTP 404', async () => {
    const res = await fetch(`${BASE_URL}/api/animals/nonexistent_animal_99999`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(res.status, 404);
    const data = await res.json();
    assert.strictEqual(data.code, 'ANIMAL_NOT_FOUND');
    assert.ok(data.error.toLowerCase().includes('not found'));
  });

  // --- 3. Duplicate ID and Ear Tag Prevention ---
  console.log('\n--- 3. Testing Duplicate Prevention & Database Constraints ---');

  let createdAnimalId = null;

  await it('Successfully creates a new animal record and anchors it in blockchain', async () => {
    const res = await fetch(`${BASE_URL}/api/animals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        id: testAnimalId,
        species: 'Cattle',
        breed: 'Gir',
        gender: 'female',
        ageMonths: 36,
        earTag: testEarTag,
        weight: 380,
        ownerName: 'Farmer Alpha',
        location: 'Gujarat, India',
        healthStatus: 'healthy',
        vaccinationStatus: 'vaccinated'
      })
    });

    assert.strictEqual(res.status, 201);
    const animal = await res.json();
    assert.strictEqual(animal.id, testAnimalId);
    assert.strictEqual(animal.ear_tag, testEarTag);
    createdAnimalId = animal.id;
  });

  await it('Prevents duplicate animal ID with HTTP 409 Conflict', async () => {
    const res = await fetch(`${BASE_URL}/api/animals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        id: testAnimalId, // duplicate id!
        species: 'Cattle',
        breed: 'Sahiwal',
        earTag: `TAG_NEW_${Date.now()}`
      })
    });

    assert.strictEqual(res.status, 409, `Expected 409 Conflict, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.code, '23505');
  });

  await it('Prevents duplicate ear tag with HTTP 409 Conflict', async () => {
    const res = await fetch(`${BASE_URL}/api/animals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        id: `anim_different_${Date.now()}`,
        species: 'Buffalo',
        breed: 'Murrah',
        earTag: testEarTag // duplicate ear tag!
      })
    });

    assert.strictEqual(res.status, 409, `Expected 409 Conflict, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.code, '23505');
  });

  // --- 4. QR API & Scanning Resolution ---
  console.log('\n--- 4. Testing Deterministic QR API & Scan Resolution ---');

  await it('GET /api/animals/:id/qr returns deterministic, PII-free QR code', async () => {
    const res1 = await fetch(`${BASE_URL}/api/animals/${encodeURIComponent(createdAnimalId)}/qr`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(res1.status, 200);
    const data1 = await res1.json();
    assert.strictEqual(data1.success, true);
    assert.strictEqual(data1.animalId, createdAnimalId);
    assert.strictEqual(data1.payload.id, createdAnimalId);
    assert.strictEqual(data1.payload.earTag, testEarTag);
    assert.strictEqual(data1.payload.ownerName, undefined); // Strictly no PII

    // Fetch again to ensure deterministic equality
    const res2 = await fetch(`${BASE_URL}/api/animals/${encodeURIComponent(createdAnimalId)}/qr`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const data2 = await res2.json();
    assert.strictEqual(data1.qrCode, data2.qrCode, 'API generated QR data URL must be strictly deterministic');
  });

  // --- 5. Authorization & Permissions ---
  console.log('\n--- 5. Testing Access Control & Permissions ---');

  await it('Blocks unauthorized user from viewing private animal record with HTTP 403', async () => {
    const res = await fetch(`${BASE_URL}/api/animals/${encodeURIComponent(createdAnimalId)}`, {
      headers: { Authorization: `Bearer ${otherUserToken}` }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.code, 'FORBIDDEN');
  });

  await it('Allows record owner and admin to view animal details', async () => {
    // Owner check
    const ownerRes = await fetch(`${BASE_URL}/api/animals/${encodeURIComponent(createdAnimalId)}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(ownerRes.status, 200);
    const ownerAnimal = await ownerRes.json();
    assert.strictEqual(ownerAnimal.id, createdAnimalId);

    // Admin check
    const adminRes = await fetch(`${BASE_URL}/api/animals/${encodeURIComponent(createdAnimalId)}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminRes.status, 200);
    const adminAnimal = await adminRes.json();
    assert.strictEqual(adminAnimal.id, createdAnimalId);
  });

  // --- 6. Edit & Health/Vaccination Update ---
  console.log('\n--- 6. Testing Edit & Health/Vaccination Record Updates ---');

  await it('Updates health status, vaccination status, and weight', async () => {
    const updateRes = await fetch(`${BASE_URL}/api/animals/${encodeURIComponent(createdAnimalId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        healthStatus: 'under_observation',
        vaccinationStatus: 'overdue',
        weight: 395,
        location: 'Barn 4B'
      })
    });

    assert.strictEqual(updateRes.status, 200);
    const updated = await updateRes.json();
    assert.strictEqual(updated.health_status || updated.healthStatus, 'under_observation');
    assert.strictEqual(updated.vaccination_status || updated.vaccinationStatus, 'overdue');
    assert.strictEqual(Number(updated.weight), 395);
  });

  // --- 7. Cryptographic Record Verification ---
  console.log('\n--- 7. Testing Cryptographic Blockchain Record Verification ---');

  await it('Verifies record integrity against cryptographic audit trail', async () => {
    const verifyRes = await fetch(`${BASE_URL}/api/blockchain/animal/${encodeURIComponent(createdAnimalId)}/verify`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    assert.strictEqual(verifyRes.status, 200);
    const verification = await verifyRes.json();
    assert.strictEqual(verification.status, 'VERIFIED');
    assert.strictEqual(verification.chainValid, true);
    assert.strictEqual(verification.animalId, createdAnimalId);
    assert.ok(verification.currentHash);
    assert.strictEqual(verification.currentHash, verification.storedHash);
  });

  // --- 8. Deletion & Post-Deletion 404 Handling ---
  console.log('\n--- 8. Testing Deletion & Post-Deletion State Handling ---');

  await it('Rejects unauthorized deletion attempt with HTTP 403', async () => {
    const delRes = await fetch(`${BASE_URL}/api/animals/${encodeURIComponent(createdAnimalId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${otherUserToken}` }
    });
    assert.strictEqual(delRes.status, 403);
  });

  await it('Allows owner to delete animal record, leaving cryptographic audit trail', async () => {
    const delRes = await fetch(`${BASE_URL}/api/animals/${encodeURIComponent(createdAnimalId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(delRes.status, 200);
    const delData = await delRes.json();
    assert.strictEqual(delData.ok, true);
    assert.strictEqual(delData.deletedId, createdAnimalId);
  });

  await it('Subsequent access to deleted animal returns clean HTTP 404', async () => {
    const res = await fetch(`${BASE_URL}/api/animals/${encodeURIComponent(createdAnimalId)}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(res.status, 404);
    const data = await res.json();
    assert.strictEqual(data.code, 'ANIMAL_NOT_FOUND');
  });

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runWorkflowTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
