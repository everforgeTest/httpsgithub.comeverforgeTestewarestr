const HotPocket = require('hotpocket-js-client');

class ContractService {
  constructor(servers, keypair) {
    this.servers = servers;
    this.userKeyPair = keypair;
    this.client = null;
    this.isConnected = false;
    this.promiseMap = new Map();
  }

  async init() {
    if (!this.userKeyPair) {
      this.userKeyPair = await HotPocket.generateKeys();
    }
    if (!this.client) {
      this.client = await HotPocket.createClient(this.servers, this.userKeyPair);
    }

    this.client.on(HotPocket.events.disconnect, () => {
      this.isConnected = false;
    });

    this.client.on(HotPocket.events.contractOutput, (r) => {
      r.outputs.forEach((o) => {
        try {
          const output = JSON.parse(o);
          const pId = output.promiseId;
          if (pId && this.promiseMap.has(pId)) {
            if (output.error) this.promiseMap.get(pId).rejecter(output.error);
            else this.promiseMap.get(pId).resolver(output.success || output);
            this.promiseMap.delete(pId);
          }
        } catch (e) {
          // ignore malformed outputs
        }
      });
    });

    if (!this.isConnected) {
      if (!(await this.client.connect())) {
        console.log('Connection failed.');
        return false;
      }
      this.isConnected = true;
    }
    return true;
  }

  async sign(buffer) {
    // Use hotpocket client to sign with the connected keypair
    const sig = await this.client.sign(buffer);
    return Buffer.from(sig).toString('hex');
  }

  submitInputWithPromise(payload) {
    const promiseId = this.#getPromiseId();
    const body = { promiseId, ...payload };
    const buf = Buffer.from(JSON.stringify(body));

    this.client.submitContractInput(buf).then((input) => {
      input?.submissionStatus?.then((s) => {
        if (s.status !== 'accepted') {
          console.log(`Ledger_Rejection: ${s.reason}`);
        }
      });
    });

    return new Promise((resolve, reject) => {
      this.promiseMap.set(promiseId, { resolver: resolve, rejecter: reject });
      // Fallback timeout
      setTimeout(() => {
        if (this.promiseMap.has(promiseId)) {
          this.promiseMap.delete(promiseId);
          reject({ code: 504, message: 'Timeout waiting for contract output.' });
        }
      }, 10000);
    });
  }

  #getPromiseId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

module.exports = ContractService;
