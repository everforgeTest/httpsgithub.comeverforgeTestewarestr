const Tables = require("../../Constants/Tables");
const settings = require("../../settings.json").settings;
const dbModule = require("../Common.Services/dbHandler");
const { SqliteDatabase } = dbModule.default;
const { SharedService } = require("../Common.Services/SharedService");

class StudentService {
  constructor(message) {
    this.message = message;
    this.dbPath = settings.dbPath;
    this.dbContext = new SqliteDatabase(this.dbPath);
  }

  async createStudent() {
    const resObj = {};
    try {
      this.dbContext.open();
      const data = this.message.data || {};
      const student = {
        Name: data.Name,
        Email: data.Email,
        Age: data.Age !== undefined ? data.Age : null,
        ConcurrencyKey: SharedService.generateConcurrencyKey()
      };
      const result = await this.dbContext.insertValue(Tables.STUDENT, student);
      resObj.success = { id: result.lastId };
      return resObj;
    } catch (error) {
      throw error;
    } finally {
      this.dbContext.close();
    }
  }

  async getStudentById() {
    const resObj = {};
    try {
      this.dbContext.open();
      const id = this.message.data && this.message.data.Id ? this.message.data.Id : this.message.data && this.message.data.id ? this.message.data.id : null;
      if (!id) throw new Error("Id is required.");
      const row = await this.dbContext.findById(Tables.STUDENT, id);
      if (!row) {
        resObj.error = { code: 404, message: "Student not found." };
        return resObj;
      }
      resObj.success = {
        Id: row.Id,
        Name: row.Name,
        Email: row.Email,
        Age: row.Age,
        CreatedOn: row.CreatedOn,
        LastUpdatedOn: row.LastUpdatedOn
      };
      return resObj;
    } catch (error) {
      throw error;
    } finally {
      this.dbContext.close();
    }
  }

  async getAllStudents() {
    const resObj = {};
    try {
      this.dbContext.open();
      const rows = await this.dbContext.getValues(Tables.STUDENT, {});
      resObj.success = rows.map(r => ({
        Id: r.Id,
        Name: r.Name,
        Email: r.Email,
        Age: r.Age,
        CreatedOn: r.CreatedOn,
        LastUpdatedOn: r.LastUpdatedOn
      }));
      return resObj;
    } catch (error) {
      throw error;
    } finally {
      this.dbContext.close();
    }
  }

  async updateStudent() {
    const resObj = {};
    try {
      this.dbContext.open();
      const data = this.message.data || {};
      const id = data.Id !== undefined ? data.Id : data.id;
      if (!id) throw new Error("Id is required.");

      const updateData = {};
      if (data.Name !== undefined) updateData.Name = data.Name;
      if (data.Email !== undefined) updateData.Email = data.Email;
      if (data.Age !== undefined) updateData.Age = data.Age;
      updateData.LastUpdatedOn = null; // Let DB default handle timestamp if needed; kept for compatibility

      const result = await this.dbContext.updateValue(Tables.STUDENT, updateData, { Id: id });
      resObj.success = { changes: result.changes };
      return resObj;
    } catch (error) {
      throw error;
    } finally {
      this.dbContext.close();
    }
  }

  async deleteStudent() {
    const resObj = {};
    try {
      this.dbContext.open();
      const data = this.message.data || {};
      const id = data.Id !== undefined ? data.Id : data.id;
      if (!id) throw new Error("Id is required.");
      const result = await this.dbContext.deleteValues(Tables.STUDENT, { Id: id });
      resObj.success = { changes: result.changes };
      return resObj;
    } catch (error) {
      throw error;
    } finally {
      this.dbContext.close();
    }
  }
}

module.exports = { StudentService };
