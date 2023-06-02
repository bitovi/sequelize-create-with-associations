import { Sequelize, DataTypes } from "sequelize";
import * as dotenv from "dotenv";
import { extendSequelize } from "../src/sequelize/extended";

dotenv.config();

describe("Create", () => {
  let mockedSequelize: Sequelize;

  beforeAll(async () => {
    await extendSequelize(Sequelize);

    mockedSequelize = new Sequelize("sqlite::memory:", {
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

  it("Should create records associated through hasOne", async () => {
    const User = mockedSequelize.define("User", {
      name: DataTypes.STRING,
      age: DataTypes.INTEGER,
    });

    const Skill = mockedSequelize.define("Skill", {
      name: DataTypes.STRING,
    });

    User.hasOne(Skill, { as: "skill" });
    Skill.belongsTo(User, { as: "user" });

    await mockedSequelize.sync();

    await User.create({
      name: "Roy",
      age: 32,
      skill: { name: "Programming" },
    });

    const users = await User.findAll({ include: ["skill"] });
    const skills = await Skill.findAll({ include: ["user"] });

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
  });
});
