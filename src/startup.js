const HotPocket = require('hotpocket-nodejs-contract');
const { Controller } = require('./controller');
const { DBInitializer } = require('./Data.Deploy/initDB');
const bson = require('bson');
const { SharedService } = require('./Services/Common.Services/SharedService');
const Tables = require('./Constants/Tables');
const settings = require('./settings.json').settings;
const dbModule = require('./Services/Common.Services/dbHandler');
const { SqliteDatabase } = dbModule.default;

const contract = async (ctx) => {
  console.log('Students contract is running.');
  SharedService.context = ctx;
  const isReadOnly = ctx.readonly;

  try {
    await DBInitializer.init();
  } catch (e) {
    console.error('DB init error:', e);
  }

  const dbContext = new SqliteDatabase(settings.dbPath);
  try {
    dbContext.open();
    let row = await dbContext.getLastRecord(Tables.CONTRACTVERSION);
    row = row || { Version: 1.0 };
    console.log('Current contract version:', row.Version);
  } catch (e) {
    console.error('Error reading contract version', e);
  } finally {
    dbContext.close();
  }

  const controller = new Controller();

  for (const user of ctx.users.list()) {
    for (const input of user.inputs) {
      const buf = await ctx.users.read(input);
      let message = null;
      try {
        message = JSON.parse(buf);
      } catch (e) {
        try {
          message = bson.deserialize(buf);
        } catch (err) {
          await user.send({ error: { code: 400, message: 'Invalid payload format.' } });
          continue;
        }
      }
      if (message.Data && !message.data) message.data = message.Data;
      await controller.handleRequest(user, message, isReadOnly);
    }
  }
};

const hpc = new HotPocket.Contract();
hpc.init(contract, HotPocket.clientProtocols.JSON, true);
