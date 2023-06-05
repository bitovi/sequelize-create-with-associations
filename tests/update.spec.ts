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

describe("Update", () => {
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

  it("Should update a record", async () => {
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

    await User.update({ name: "Nau", age: 53 }, { where: { id: user.id } });

    const [updatedUser] = await User.findAll();

    expect(user).toEqual(expect.objectContaining({ name: "Roy", age: 33 }));

    expect(updatedUser).toEqual(
      expect.objectContaining({ name: "Nau", age: 53 })
    );
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

    User.hasOne(Skill);
    Skill.belongsTo(User);

    await sequelize.sync();

    const user = await User.create({
      name: "Roy",
      age: 32,
      skill: { name: "Programming" },
    });

    await User.update(
      { name: "Nau", age: 53, skill: { name: "Testing" } },
      { where: { id: user.id } }
    );

    const users = await User.findAll({ include: ["Skill"] });
    const skills = await Skill.findAll();

    expect(users[0]).toEqual(expect.objectContaining({ name: "Nau", age: 53 }));
    expect(users[0].Skill).toEqual(
      expect.objectContaining({ name: "Testing" })
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

    const user = await User.create({
      name: "Roy",
      age: 33,
      skills: [
        { name: "Acting" },
        { name: "Cooking" },
        { name: "Programming" },
      ],
    });

    const [cooking, programming, testing] = await Promise.all([
      Skill.findOne({
        where: { name: "Cooking" },
      }),
      Skill.findOne({
        where: { name: "Programming" },
      }),
      Skill.create({
        name: "Testing",
      }),
    ]);

    await User.update(
      {
        name: "Nau",
        age: 53,
        skills: [
          { id: cooking?.id },
          { id: programming?.id },
          { id: testing.id },
        ],
      },
      { where: { id: user.id } }
    );

    const [updatedUser] = await User.findAll({ include: ["skills"] });
    const skills = await Skill.findAll();

    expect(updatedUser).toEqual(
      expect.objectContaining({ name: "Nau", age: 53 })
    );
    expect(updatedUser.skills?.map((skill) => skill.name).sort()).toEqual([
      "Cooking",
      "Programming",
      "Testing",
    ]);
    expect(skills).toHaveLength(4);
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
      { timestamps: false }
    );

    User.belongsToMany(Skill, { as: "skills", through: User_Skill });
    Skill.belongsToMany(User, { through: User_Skill });

    await sequelize.sync();

    const user = await User.create({
      name: "Roy",
      age: 33,
      skills: [
        { name: "Acting" },
        { name: "Cooking" },
        { name: "Programming" },
      ],
    });

    const [cooking, programming, testing] = await Promise.all([
      Skill.findOne({
        where: { name: "Cooking" },
      }),
      Skill.findOne({
        where: { name: "Programming" },
      }),
      Skill.create({
        name: "Testing",
      }),
    ]);

    await User.update(
      {
        name: "Nau",
        age: 53,
        skills: [
          { id: programming?.id },
          { id: cooking?.id },
          { id: testing.id },
        ],
      },
      { where: { id: user.id } }
    );

    const [updatedUser] = await User.findAll({ include: ["skills"] });
    const skills = await Skill.findAll();
    const userSkill = await User_Skill.findAll({ where: { UserId: 1 } });

    expect(skills).toHaveLength(4);
    expect(userSkill).toHaveLength(3);
    expect(sequelize.models).toHaveProperty("User_Skill");
    expect(updatedUser.skills?.map((skill) => skill.name).sort()).toEqual([
      "Cooking",
      "Programming",
      "Testing",
    ]);
    expect(userSkill.map((skill) => skill.SkillId).sort()).toEqual(
      [cooking?.id, programming?.id, testing.id].sort()
    );
  });
});
