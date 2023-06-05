import { Sequelize, DataTypes } from "sequelize";
import * as dotenv from "dotenv";
import { extendSequelize } from "../src/sequelize/extended";
import type {
  SingleSkillUserModel,
  SkillModel,
  UserModel,
  UserSkillModel,
} from "./types";

dotenv.config();

describe("Create", () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    await extendSequelize(Sequelize);

    sequelize = new Sequelize("sqlite::memory:", {
      logging: false,
    });
  });

  afterEach(async () => {
    await sequelize.drop();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await sequelize.close();
  });
  it("Should create and return record", async () => {
    const User = sequelize.define<UserModel>("User", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: DataTypes.STRING,
      age: DataTypes.INTEGER,
    });

    await sequelize.sync();

    const user = await User.create({
      name: "Roy",
      age: 33,
    });

    const users = await User.findAll();

    expect(user).toEqual(expect.objectContaining({ name: "Roy", age: 33 }));
    expect(users[0]).toEqual(expect.objectContaining({ name: "Roy", age: 33 }));
  });

  it("Should create records associated through hasOne", async () => {
    const User = sequelize.define<SingleSkillUserModel>("User", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: DataTypes.STRING,
      age: DataTypes.INTEGER,
    });

    const Skill = sequelize.define<SkillModel>("Skill", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: DataTypes.STRING,
    });

    User.hasOne(Skill, { as: "skill" });
    Skill.belongsTo(User, { as: "user" });

    await sequelize.sync();

    await User.create({
      name: "Roy",
      age: 32,
      skill: { name: "Programming" },
    });

    const users = await User.findAll({ include: ["skill"] });
    const skills = await Skill.findAll({ include: ["user"] });

    expect(users[0].skill).toEqual(
      expect.objectContaining({ name: "Programming" }),
    );
    expect(skills).toHaveLength(1);
  });
  it("Should create records associated through hasMany", async () => {
    const User = sequelize.define<UserModel>("User", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: DataTypes.STRING,
      age: DataTypes.INTEGER,
    });

    const Skill = sequelize.define<SkillModel>("Skill", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: DataTypes.STRING,
    });

    User.hasMany(Skill, {
      as: "skills",
    });

    Skill.belongsTo(User);

    await sequelize.sync();

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
      ]),
    );
    expect(skills).toHaveLength(2);
  });

  it("Should create table and records associated through belongsToMany", async () => {
    const User = sequelize.define<UserModel>("User", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: DataTypes.STRING,
      age: DataTypes.INTEGER,
    });

    const Skill = sequelize.define<SkillModel>("Skill", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: DataTypes.STRING,
    });

    const User_Skill = sequelize.define<UserSkillModel>(
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
      { timestamps: false },
    );

    User.belongsToMany(Skill, { as: "skills", through: User_Skill });
    Skill.belongsToMany(User, { through: User_Skill });

    await sequelize.sync();

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
    expect(sequelize.models).toHaveProperty("User_Skill");
    expect(users[0].skills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Programming" }),
        expect.objectContaining({ name: "Cooking" }),
      ]),
    );
    expect(userSkill).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ UserId: 1, SkillId: 2 }),
        expect.objectContaining({ UserId: 1, SkillId: 2 }),
      ]),
    );
  });
});
