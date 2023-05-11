import { Sequelize, DataTypes } from "sequelize";
import * as dotenv from "dotenv";
import { extendSequelize } from "../src/sequelize/extended";

dotenv.config();

describe("Bulk Create", () => {
  let mockedSequelize: any;

  beforeAll(async () => {
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
  });

  afterEach(async () => {
    await mockedSequelize.drop();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mockedSequelize.close();
  });
  it("Should bulkCreate and return records", async () => {
    const User = mockedSequelize.define("User", {
      name: DataTypes.STRING,
      age: DataTypes.INTEGER,
    });

    await mockedSequelize.sync();

    await User.bulkCreate([
      {
        name: "Justin",
        age: 33,
      },
      {
        name: "Kevin",
        age: 32,
      },
    ]);

    const users = await User.findAll();

    expect(users).toHaveLength(2);
    expect(users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Justin",
          age: 33,
        }),
        expect.objectContaining({
          name: "Kevin",
          age: 32,
        }),
      ])
    );
  });
  /* 
  it("Should create records associated through hasOne", async () => {
    const User = mockedSequelize.define("User", {
      name: DataTypes.STRING,
      age: DataTypes.INTEGER,
    });

    const Skill = mockedSequelize.define("Skill", {
      name: DataTypes.STRING,
    });

    User.hasOne(Skill, { as: "skill" });
    Skill.belongsTo(User);

    await mockedSequelize.sync();

    await User.create({
      name: "Roy",
      age: 32,
      skill: { name: "Programming" },
    });

    const users = await User.findAll({ include: ["skill"] });
    const skills = await Skill.findAll();

    expect(users[0].skill).toEqual(
      expect.objectContaining({ name: "Programming" })
    );
    expect(skills).toHaveLength(1);
  });
  it("Should create records associated through hasMany", async () => {
    const User = mockedSequelize.define("User", {
      name: DataTypes.STRING,
      age: DataTypes.INTEGER,
    });

    const Skill = mockedSequelize.define("Skill", {
      name: DataTypes.STRING,
    });

    User.hasMany(Skill, {
      as: "skills",
    });

    Skill.belongsTo(User);

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

  it("Should create table and records associated through belongsToMany", async () => {
    const User = mockedSequelize.define("User", {
      name: DataTypes.STRING,
      age: DataTypes.INTEGER,
    });

    const Skill = mockedSequelize.define("Skill", {
      name: DataTypes.STRING,
    });

    const User_Skill = mockedSequelize.define(
      "User_Skill",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        selfGranted: DataTypes.BOOLEAN,
      },
      { timestamps: false }
    );

    User.belongsToMany(Skill, { as: "skills", through: User_Skill });
    Skill.belongsToMany(User, { through: User_Skill });

    await mockedSequelize.sync();

    await User.create({
      name: "Roy",
      age: 33,
      skills: [{ name: "Programming" }, { name: "Cooking" }],
    });

    const users = await User.findAll({ include: ["skills"] });
    const skills = await Skill.findAll();
    const userSkill = await User_Skill.findAll();

    expect(skills).toHaveLength(2);
    expect(userSkill).toHaveLength(2);
    expect(mockedSequelize.models).toHaveProperty("User_Skill");
    expect(users[0].skills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Programming" }),
        expect.objectContaining({ name: "Cooking" }),
      ])
    );
    expect(userSkill).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ UserId: 1, SkillId: 2 }),
        expect.objectContaining({ UserId: 1, SkillId: 2 }),
      ])
    );
  }); */
});
