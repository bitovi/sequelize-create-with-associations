import { Sequelize, DataTypes } from "sequelize";
import * as dotenv from "dotenv";
import { extendSequelize } from "../src/sequelize/extended";
import type { SingleSkillUserModel, SkillModel, UserModel } from "./types";

dotenv.config();

describe("Bulk Create", () => {
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
  it("Should bulkCreate and return records", async () => {
    const User = sequelize.define<UserModel>("User", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: DataTypes.STRING,
      age: DataTypes.INTEGER,
    });

    await sequelize.sync();

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

    User.hasOne(Skill, { as: "skill", foreignKey: "userId" });
    Skill.belongsTo(User, { as: "user" });

    await sequelize.sync();

    await User.bulkCreate([
      {
        name: "Kevin",
        age: 25,
        skill: { name: "Dancing" },
      },
      {
        name: "Justin",
        age: 26,
        skill: { name: "JiuJitsu" },
      },
    ]);

    const users = await User.findAll({ include: ["skill"] });
    const skills = await Skill.findAll({ include: "user" });

    expect(users).toHaveLength(2);
    expect(skills).toHaveLength(2);
    expect(users[0].skill).toEqual(
      expect.objectContaining({ name: "Dancing" })
    );
    expect(users[1].skill).toEqual(
      expect.objectContaining({ name: "JiuJitsu" })
    );
    expect(skills[0].user).toEqual(
      expect.objectContaining({ name: "Kevin", age: 25 })
    );
    expect(skills[1].user).toEqual(
      expect.objectContaining({ name: "Justin", age: 26 })
    );
  });
});
