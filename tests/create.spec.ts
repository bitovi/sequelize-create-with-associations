import { Sequelize, DataTypes } from "sequelize";
import * as dotenv from "dotenv";
import { extendSequelize } from "../src/sequelize/extended";

dotenv.config();

describe("Create", () => {
  let mockedSequelize: any; 

  beforeEach(async () => {
    await extendSequelize(Sequelize);

    mockedSequelize = new Sequelize({
      dialect: "postgres",
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT) ?? 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      logging: false,
    });

    await mockedSequelize.authenticate();
  });
  afterEach(async () => {
    await mockedSequelize.drop();
    await mockedSequelize.close();
    jest.clearAllMocks();
  });

  it("Should create records associated through hasMany", async () => {
    const User = mockedSequelize.define("User", {
      name: DataTypes.STRING,
      age: DataTypes.INTEGER,
    });

    const Skill = mockedSequelize.define("Skill", {
      name: DataTypes.STRING,
    });

    User.belongsToMany(Skill, {
      as: "skills",
      foreignKey: "user_id",
      through: "user_skills",
    });

    Skill.belongsToMany(User, {
      as: "users",
      foreignKey: "skill_id",
      through: "user_skills",
    });

    await mockedSequelize.sync();

    await User.create({
      name: "Roy",
      age: 33,
      skills: [{ name: "Programming" }, { name: "Cooking" }],
    });

    const users = await User.findAll({ include: ["skills"] });
    const skills = await Skill.findAll();

    expect(users[0].skills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Programming" }),
        expect.objectContaining({ name: "Cooking" }),
      ])
    );
    expect(skills).toHaveLength(2);
  });

  it("Should create and return record", async () => {
    const User = mockedSequelize.define("User", {
      name: DataTypes.STRING,
      age: DataTypes.INTEGER,
    });

    await mockedSequelize.sync();

    const user = await User.create({
      name: "Roy",
      age: 33,
    });

    const users = await User.findAll();

    expect(user).toEqual(expect.objectContaining({ name: "Roy", age: 33 }));
    expect(users[0]).toEqual(expect.objectContaining({ name: "Roy", age: 33 }));
  });
});
