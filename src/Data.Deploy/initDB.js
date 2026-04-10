const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { SharedService } = require("../Services/Common.Services/SharedService");
const Tables = require("../Constants/Tables");
const settings = require("../settings.json").settings;

class DBInitializer {
  static #db = null;

  static async init() {
    if (!fs.existsSync(settings.dbPath)) {
      this.#db = new sqlite3.Database(settings.dbPath);
      await this.#runQuery("PRAGMA foreign_keys = ON");

      await this.#runQuery(`CREATE TABLE IF NOT EXISTS ${Tables.CONTRACTVERSION} (
        Id INTEGER,
        Version FLOAT NOT NULL,
        Description TEXT,
        CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
        LastUpdatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY("Id" AUTOINCREMENT)
      )`);

      await this.#runQuery(`CREATE TABLE IF NOT EXISTS ${Tables.SQLSCRIPTMIGRATIONS} (
        Id INTEGER,
        Sprint TEXT NOT NULL,
        ScriptName TEXT NOT NULL,
        ExecutedTimestamp TEXT,
        ConcurrencyKey TEXT CHECK (ConcurrencyKey LIKE '0x%' AND length(ConcurrencyKey) = 18),
        PRIMARY KEY("Id" AUTOINCREMENT)
      )`);

      await this.#runQuery(`CREATE TABLE IF NOT EXISTS ${Tables.STUDENT} (
        Id INTEGER,
        Name TEXT NOT NULL,
        Email TEXT NOT NULL UNIQUE,
        Age INTEGER,
        CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
        LastUpdatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
        ConcurrencyKey TEXT CHECK (ConcurrencyKey LIKE '0x%' AND length(ConcurrencyKey) = 18),
        PRIMARY KEY("Id" AUTOINCREMENT)
      )`);

      this.#db.close();
    }

    if (fs.existsSync(settings.dbPath)) {
      this.#db = new sqlite3.Database(settings.dbPath);

      const getLastExecutedSprintQuery = "SELECT Sprint FROM SqlScriptMigrations ORDER BY Sprint DESC LIMIT 1";
      let rc = await this.#getRecord(getLastExecutedSprintQuery);
      const lastExecutedSprint = rc ? rc.Sprint : "Sprint_00";

      const scriptFolders = fs
        .readdirSync(settings.dbScriptsFolderPath)
        .filter(folder => folder.startsWith("Sprint_") && folder >= lastExecutedSprint)
        .sort();

      for (const sprintFolder of scriptFolders) {
        const sprintFolderPath = path.join(settings.dbScriptsFolderPath, sprintFolder);
        const sqlFiles = fs
          .readdirSync(sprintFolderPath)
          .filter(file => file.match(/^\d+_.+\.sql$/))
          .sort();

        for (const sqlFile of sqlFiles) {
          const scriptPath = path.join(sprintFolderPath, sqlFile);
          const query = "SELECT * FROM SqlScriptMigrations WHERE Sprint = ? AND ScriptName = ?";
          const m = await this.#getRecord(query, [sprintFolder, sqlFile]);
          if (!m) {
            const sqlScript = fs.readFileSync(scriptPath, "utf8");
            const sqlStatements = sqlScript
              .split(";")
              .map(statement => statement.split("\
").map(line => line.trim().startsWith("--") ? "" : line).join("\
"))
              .filter(statement => statement.trim() !== "");
            for (const statement of sqlStatements) {
              try {
                await this.#runQuery(statement);
              } catch (err) {
                console.error("[MIGRATION] Error:", err);
              }
            }

            const insertQuery = "INSERT INTO SqlScriptMigrations (Sprint, ScriptName, ExecutedTimestamp) VALUES (?, ?, ?)";
            await this.#runQuery(insertQuery, [sprintFolder, sqlFile, SharedService.getCurrentTimestamp()]);
          }
        }
      }

      this.#db.close();
    }
  }

  static #runQuery(query, params = null) {
    return new Promise((resolve, reject) => {
      this.#db.run(query, params ? params : [], function (err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ lastId: this.lastID, changes: this.changes });
      });
    });
  }

  static #getRecord(query, filters = []) {
    return new Promise((resolve, reject) => {
      if (filters.length > 0) {
        this.#db.get(query, filters, (err, row) => {
          if (err) reject(err.message);
          else resolve(row);
        });
      } else {
        this.#db.get(query, (err, row) => {
          if (err) reject(err.message);
          else resolve(row);
        });
      }
    });
  }
}

module.exports = { DBInitializer };
