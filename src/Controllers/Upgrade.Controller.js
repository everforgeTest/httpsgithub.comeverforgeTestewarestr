const { UpgradeService } = require("../Services/Common.Services/Upgrade.Service");
const env = require("../Utils/Environment");
const nacl = require("tweetnacl");

function isMaintainer(userPubKeyHex) {
  const expected = (env.MAINTAINER_PUBKEY || "").toLowerCase();
  if (!expected || expected.length === 0) return false;
  return (userPubKeyHex || "").toLowerCase() === expected;
}

class UpgradeController {
  constructor(message) {
    this.message = message;
    this.service = new UpgradeService(message);
  }

  async handleRequest(user) {
    try {
      if (this.message.Action === "UpgradeContract") {
        const userPubKey = user && user.pubKey ? user.pubKey : null;
        if (!userPubKey || !isMaintainer(userPubKey)) {
          return { error: { code: 401, message: "Unauthorized" } };
        }

        const payload = this.message.data || {};
        const zipBase64 = payload.zipBase64;
        const zipSignatureHex = payload.zipSignatureHex;
        const version = payload.version;
        const description = payload.description || "";

        if (!zipBase64 || !zipSignatureHex || !version) {
          return { error: { code: 400, message: "Missing required fields for upgrade." } };
        }

        const zipBuffer = Buffer.from(zipBase64, "base64");
        const sig = Buffer.from(zipSignatureHex, "hex");
        const pubKeyBytes = Buffer.from(userPubKey, "hex");

        const ok = nacl.sign.detached.verify(new Uint8Array(zipBuffer), new Uint8Array(sig), new Uint8Array(pubKeyBytes));
        if (!ok) {
          return { error: { code: 401, message: "Signature verification failed." } };
        }

        this.message.data = { version, description, content: zipBuffer };
        return await this.service.upgradeContract();
      }

      return { error: { code: 400, message: "Invalid action." } };
    } catch (error) {
      return { error: { code: 500, message: error.message || "Upgrade failed." } };
    }
  }
}

module.exports = { UpgradeController };
