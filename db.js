// povezivanje s MySQL bazom i definicija modela (Sequelize)
const { Sequelize, DataTypes } = require("sequelize");

// Podaci iz postavke spirale: baza wt26, korisnik root, šifra password.
// Mogu se zaobići varijablama okruženja (DB_NAME, DB_USER, DB_PASSWORD, DB_HOST).
const sequelize = new Sequelize(
  process.env.DB_NAME || "wt26",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "password",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
    logging: false,
    define: { timestamps: false }, // bez automatskih createdAt/updatedAt kolona
  }
);

const Scenario = sequelize.define("Scenario", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
});

const Line = sequelize.define(
  "Line",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    lineId: { type: DataTypes.INTEGER, allowNull: false },
    text: { type: DataTypes.TEXT, allowNull: false },
    nextLineId: { type: DataTypes.INTEGER, allowNull: true },
    scenarioId: { type: DataTypes.INTEGER, allowNull: false },
  },
  { indexes: [{ unique: true, fields: ["scenarioId", "lineId"] }] } // lineId je jedinstven unutar scenarija
);

const Delta = sequelize.define("Delta", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  scenarioId: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false }, // "line_update" ili "char_rename"
  lineId: { type: DataTypes.INTEGER, allowNull: true },
  nextLineId: { type: DataTypes.INTEGER, allowNull: true },
  content: { type: DataTypes.TEXT, allowNull: true },
  oldName: { type: DataTypes.STRING, allowNull: true },
  newName: { type: DataTypes.STRING, allowNull: true },
  timestamp: { type: DataTypes.INTEGER, allowNull: false },
});

const Checkpoint = sequelize.define("Checkpoint", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  scenarioId: { type: DataTypes.INTEGER, allowNull: false },
  timestamp: { type: DataTypes.INTEGER, allowNull: false },
});

// Relacije: jedan scenarij ima više linija, delti i checkpointa
[Line, Delta, Checkpoint].forEach((Model) => {
  Scenario.hasMany(Model, { foreignKey: "scenarioId", onDelete: "CASCADE" });
  Model.belongsTo(Scenario, { foreignKey: "scenarioId" });
});

module.exports = { sequelize, Scenario, Line, Delta, Checkpoint };