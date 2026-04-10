const { FileService } = require("./FileService");
const { SharedService } = require("./SharedService");
const Tables = require("../../Constants/Tables");
const settings = require("../../settings.json").settings;
const dbModule = require("./dbHandler");
const { SqliteDatabase } = dbModule.default;

class UpgradeService {
  constructor(message) {
    this.message = message;
    this.dbPath = settings.dbPath;
    this.dbContext = new SqliteDatabase(this.dbPath);
  }

  async upgradeContract() {
    const resObj = {};
    try {
      const zipData = this.message.data;
      this.dbContext.open();
      let row = await this.dbContext.getLastRecord(Tables.CONTRACTVERSION);
      if (!row) row = { Version: 1.0 };

      const version = parseFloat(zipData.version);
      const currentVersion = parseFloat(row.Version);
      if (!(version > currentVersion)) {
        resObj.error = { code: 403, message: "Contract version must be greater than current version." };
        return resObj;
      }

      FileService.writeFile(settings.newContractZipFileName, Buffer.from(zipData.content));

      const shellScriptContent = `#!/bin/bash\
\
echo \"Running post-execution deployment script...\"\
\
! command -v unzip &>/dev/null && apt-get update && apt-get install --no-install-recommends -y unzip\
\
zip_file=\"${settings.newContractZipFileName}\"\
\
unzip -o -d ./ \"$zip_file\" >>/dev/null\
\
echo \"Unzipped '$zip_file' successfully.\"\
\
rm \"$zip_file\" >>/dev/null\
`;

      FileService.writeFile(settings.postExecutionScriptName, shellScriptContent);
      FileService.changeMode(settings.postExecutionScriptName, 0o777);

      const data = {
        Description: zipData.description || "",
        LastUpdatedOn: SharedService.context.timestamp,
        Version: version,
        CreatedOn: SharedService.context.timestamp
      };
      const res = await this.dbContext.insertValue(Tables.CONTRACTVERSION, data);
      resObj.success = { message: "Contract upgraded", id: res.lastId };
      return resObj;
    } catch (error) {
      resObj.error = { code: 500, message: error.message || "Failed to upgrade contract." };
      return resObj;
    } finally {
      this.dbContext.close();
    }
  }
}

module.exports = { UpgradeService };
