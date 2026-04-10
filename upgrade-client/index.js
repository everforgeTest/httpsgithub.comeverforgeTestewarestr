const fs = require('fs');
const path = require('path');
const ContractService = require('./contract-service');

// Usage:
// node index.js <contractUrl> <zipFilePath> <privateKeyHex> <version> <description>

async function main() {
  const contractUrl = process.argv[2];
  const zipPath = process.argv[3];
  const privateKeyHex = process.argv[4];
  const version = process.argv[5];
  const description = process.argv[6] || '';

  if (!contractUrl || !zipPath || !privateKeyHex || !version) {
    console.log('Usage: node index.js <contractUrl> <zipFilePath> <privateKeyHex> <version> <description>');
    process.exit(1);
  }

  const fileName = path.basename(zipPath);
  const zipBuffer = fs.readFileSync(zipPath);

  // Construct keypair for HotPocket client from provided seed (32-byte hex)
  const seed = Buffer.from(privateKeyHex, 'hex');
  if (seed.length !== 32) {
    console.error('privateKeyHex must be a 32-byte Ed25519 seed in hex.');
    process.exit(1);
  }
  const keypair = await require('hotpocket-js-client').createKeysFromSeed(seed);

  const cs = new ContractService([contractUrl], keypair);
  const ok = await cs.init();
  if (!ok) process.exit(2);

  const signatureHex = await cs.sign(zipBuffer);
  const payload = {
    Service: 'Upgrade',
    Action: 'UpgradeContract',
    data: {
      version: parseFloat(version),
      description,
      zipBase64: zipBuffer.toString('base64'),
      zipSignatureHex: signatureHex
    }
  };

  console.log(`Uploading ${fileName} (${Math.round(zipBuffer.length / 1024)}KB)...`);
  try {
    const res = await cs.submitInputWithPromise(payload);
    console.log('Upgrade response:', res);
  } catch (e) {
    console.error('Upgrade failed:', e);
  } finally {
    process.exit();
  }
}

main();
