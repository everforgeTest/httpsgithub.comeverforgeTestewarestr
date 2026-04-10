const ServiceTypes = require("./Constants/ServiceTypes");
const { StudentController } = require("./Controllers/Student.Controller");
const { UpgradeController } = require("./Controllers/Upgrade.Controller");

class Controller {
  async handleRequest(user, message, isReadOnly) {
    if (message.service && !message.Service) message.Service = message.service;

    let result = {};

    if (message.Service === ServiceTypes.UPGRADE) {
      const upgradeController = new UpgradeController(message);
      result = await upgradeController.handleRequest(user);
    } else if (message.Service === ServiceTypes.STUDENT) {
      const studentController = new StudentController(message);
      result = await studentController.handleRequest();
    } else {
      result = { error: { code: 400, message: "Unknown service." } };
    }

    if (isReadOnly) {
      await user.send(result);
    } else {
      await user.send(message.promiseId ? { promiseId: message.promiseId, ...result } : result);
    }
  }
}

module.exports = { Controller };
