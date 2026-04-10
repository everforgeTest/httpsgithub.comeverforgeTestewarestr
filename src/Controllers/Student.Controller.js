const { StudentService } = require("../Services/Domain.Services/Student.service");

class StudentController {
  constructor(message) {
    this.message = message;
    this.service = new StudentService(message);
  }

  async handleRequest() {
    try {
      switch (this.message.Action) {
        case "CreateStudent":
          return await this.service.createStudent();
        case "GetStudentById":
          return await this.service.getStudentById();
        case "GetAllStudents":
          return await this.service.getAllStudents();
        case "UpdateStudent":
          return await this.service.updateStudent();
        case "DeleteStudent":
          return await this.service.deleteStudent();
        default:
          return { error: { code: 400, message: "Invalid action." } };
      }
    } catch (error) {
      return { error: { code: 500, message: error.message || "Internal error" } };
    }
  }
}

module.exports = { StudentController };
