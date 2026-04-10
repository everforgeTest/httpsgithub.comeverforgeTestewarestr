const HotPocket = require('hotpocket-js-client');

async function connectClient(url, keypair = null) {
  const kp = keypair || await HotPocket.generateKeys();
  const client = await HotPocket.createClient([url], kp);
  const outputs = [];

  await client.connect();

  client.on(HotPocket.events.contractOutput, (r) => {
    r.outputs.forEach((o) => {
      try { outputs.push(JSON.parse(o)); } catch (e) {}
    });
  });

  return { client, kp, outputs };
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${msg} | expected=${expected}, actual=${actual}`);
  }
}

function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

module.exports = { connectClient, assertEqual, delay };
