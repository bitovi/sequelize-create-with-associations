import { randomUUID } from "crypto";
import { Sequelize, DataTypes } from "sequelize";
import * as dotenv from "dotenv";
import { extendSequelize } from "../src/sequelize/extended";
import type {
  SingleSkillUserModel,
  SkillModel,
  UserModel,
  UserSkillModel,
} from "./types";
import { NotFoundError, UnexpectedValueError } from "../src/sequelize/types";

dotenv.config();

describe("Update", () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    extendSequelize(Sequelize);

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

  it("Should update a record with no associations", async () => {
    const User = sequelize.define<UserModel>(
      "User",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    await sequelize.sync();

    const user = await User.create({
      name: "Justin",
      age: 33,
    });

    expect(user).toEqual(expect.objectContaining({ name: "Justin", age: 33 }));

    const [updatedCount] = await User.update(
      { age: 32 },
      { where: { id: user.id } },
    );

    expect(updatedCount).toEqual(1);

    const updatedUser = await User.findByPk(user.id);

    expect(updatedUser).toEqual(
      expect.objectContaining({ name: "Justin", age: 32 }),
    );
  });

  it("Should update records associated through hasOne", async () => {
    const User = sequelize.define<SingleSkillUserModel>(
      "User",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    const Skill = sequelize.define<SkillModel>(
      "Skill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        userId: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    User.hasOne(Skill, {
      as: "skill",
      foreignKey: "userId",
    });

    Skill.belongsTo(User, {
      as: "user",
      foreignKey: "userId",
    });

    await sequelize.sync();

    const justin = await User.create({
      name: "Justin",
      age: 33,
      skill: { name: "Programming" },
    });

    const cooking = await Skill.create({ id: 10, name: "Cooking" });

    const [updatedCount] = await User.update(
      { age: 32, skill: { id: cooking.id } },
      { where: { id: justin.id } },
    );

    expect(updatedCount).toEqual(1);

    const updatedUser = await User.findByPk(justin.id, { include: ["skill"] });

    expect(updatedUser).toEqual(
      expect.objectContaining({
        name: "Justin",
        age: 32,
        skill: expect.objectContaining({ name: "Cooking" }),
      }),
    );

    expect(await Skill.count()).toEqual(2);
  });

  it("Should update records associated through hasOne - non-default Id", async () => {
    const User = sequelize.define<SingleSkillUserModel>(
      "User",
      {
        nonDefaultUserId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    const Skill = sequelize.define<SkillModel>(
      "Skill",
      {
        nonDefaultSkillId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: DataTypes.STRING,
        userId: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    User.hasOne(Skill, {
      as: "skill",
      foreignKey: "userId",
    });

    Skill.belongsTo(User, {
      as: "user",
      foreignKey: "userId",
    });

    await sequelize.sync();

    const justin = await User.create({
      name: "Justin",
      age: 33,
      skill: { name: "Programming" },
    });

    const cooking = await Skill.create({
      nonDefaultSkillId: 10,
      name: "Cooking",
    });

    const [updatedCount] = await User.update(
      { age: 32, skill: { nonDefaultSkillId: cooking.nonDefaultSkillId } },
      { where: { nonDefaultUserId: justin.nonDefaultUserId } },
    );

    expect(updatedCount).toEqual(1);

    const updatedUser = await User.findByPk(justin.nonDefaultUserId, {
      include: ["skill"],
    });

    expect(updatedUser).toEqual(
      expect.objectContaining({
        name: "Justin",
        age: 32,
        skill: expect.objectContaining({ name: "Cooking" }),
      }),
    );

    expect(await Skill.count()).toEqual(2);
  });

  it("Should update records associated through hasOne - inverse", async () => {
    const User = sequelize.define<SingleSkillUserModel>(
      "User",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    const Skill = sequelize.define<SkillModel>(
      "Skill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        userId: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    User.hasOne(Skill, {
      as: "skill",
      foreignKey: "userId",
    });

    Skill.belongsTo(User, {
      as: "user",
      foreignKey: "userId",
    });

    await sequelize.sync();

    const justin = await User.create({
      name: "Justin",
      age: 33,
    });

    const cooking = await Skill.create({
      id: 10,
      name: "Cooking",
      user: { name: "Kevin", age: 32 },
    });

    const [updatedCount] = await Skill.update(
      { name: "Running", user: { id: justin.id } },
      { where: { id: cooking.id } },
    );

    expect(updatedCount).toEqual(1);

    const updatedUser = await User.findByPk(justin.id, { include: ["skill"] });

    expect(updatedUser).toEqual(
      expect.objectContaining({
        name: "Justin",
        age: 33,
        skill: expect.objectContaining({ name: "Running" }),
      }),
    );

    expect(await Skill.count()).toEqual(1);
  });

  it("Should disassociate records associated through hasOne", async () => {
    const User = sequelize.define<SingleSkillUserModel>(
      "User",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    const Skill = sequelize.define<SkillModel>(
      "Skill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        userId: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    User.hasOne(Skill, {
      as: "skill",
      foreignKey: "userId",
    });

    Skill.belongsTo(User, {
      as: "user",
      foreignKey: "userId",
    });

    await sequelize.sync();

    const justin = await User.create({
      name: "Justin",
      age: 33,
      skill: { name: "Programming" },
    });

    const [updatedCount] = await User.update(
      { age: 32, skill: null },
      { where: { id: justin.id } },
    );

    expect(updatedCount).toEqual(1);

    const updatedUser = await User.findByPk(justin.id, { include: ["skill"] });

    expect(updatedUser).toEqual(
      expect.objectContaining({
        name: "Justin",
        age: 32,
        skill: null,
      }),
    );

    expect(await Skill.count()).toEqual(1);
  });

  it("Should throw with non-existing IDs through hasOne", async () => {
    const User = sequelize.define<SingleSkillUserModel>(
      "User",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    const Skill = sequelize.define<SkillModel>(
      "Skill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        userId: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    User.hasOne(Skill, {
      as: "skill",
      foreignKey: "userId",
    });

    Skill.belongsTo(User, {
      as: "user",
      foreignKey: "userId",
    });

    await sequelize.sync();

    const justin = await User.create({
      name: "Justin",
      age: 33,
      skill: { name: "Programming" },
    });

    await expect(
      User.update({ age: 32, skill: { id: -1 } }, { where: { id: justin.id } }),
    ).rejects.toEqualErrors([
      new NotFoundError({
        detail: "Payload must include an ID of an existing 'Skill'.",
        pointer: "/data/relationships/skill/data/id",
      }),
    ]);
  });

  it("Should update records associated through hasMany", async () => {
    const User = sequelize.define<UserModel>(
      "User",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    const Skill = sequelize.define<SkillModel>(
      "Skill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        userId: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    User.hasMany(Skill, {
      as: "associatedSkills",
      foreignKey: "userId",
    });

    Skill.belongsTo(User, {
      as: "user",
      foreignKey: "userId",
    });

    await sequelize.sync();

    const user = await User.create({
      name: "Justin",
      age: 33,
      associatedSkills: [
        { name: "Acting" },
        { name: "Cooking" },
        { name: "Programming" },
      ],
    });

    const [cooking, programming, running] = await Promise.all([
      Skill.findOne({
        where: { name: "Cooking" },
      }),
      Skill.findOne({
        where: { name: "Programming" },
      }),
      Skill.create({
        name: "Running",
      }),
    ]);

    await User.update(
      {
        name: "Kevin",
        age: 32,
        associatedSkills: [
          { id: cooking?.id },
          { id: programming?.id },
          { id: running?.id },
        ],
      },
      { where: { id: user.id } },
    );

    const updatedUser = await User.findByPk(user.id, {
      include: ["associatedSkills"],
    });
    const associatedSkills = await Skill.findAll();

    expect(updatedUser).toEqual(
      expect.objectContaining({ name: "Kevin", age: 32 }),
    );
    expect(
      updatedUser?.associatedSkills?.map((skill) => skill.name).sort(),
    ).toEqual(["Cooking", "Programming", "Running"]);
    expect(associatedSkills).toHaveLength(4);
  });

  it("Should update records associated through hasMany - non-default Id", async () => {
    const User = sequelize.define<UserModel>(
      "User",
      {
        nonDefaultUserId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    const Skill = sequelize.define<SkillModel>(
      "Skill",
      {
        nonDefaultSkillId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: DataTypes.STRING,
        userId: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    User.hasMany(Skill, {
      as: "associatedSkills",
      foreignKey: "userId",
    });

    Skill.belongsTo(User, {
      as: "user",
      foreignKey: "userId",
    });

    await sequelize.sync();

    const user = await User.create({
      name: "Justin",
      age: 33,
      associatedSkills: [
        { name: "Acting" },
        { name: "Cooking" },
        { name: "Programming" },
      ],
    });

    const [cooking, programming, running] = await Promise.all([
      Skill.findOne({
        where: { name: "Cooking" },
      }),
      Skill.findOne({
        where: { name: "Programming" },
      }),
      Skill.create({
        name: "Running",
      }),
    ]);

    await User.update(
      {
        name: "Kevin",
        age: 32,
        associatedSkills: [
          { nonDefaultSkillId: cooking?.nonDefaultSkillId },
          { nonDefaultSkillId: programming?.nonDefaultSkillId },
          { nonDefaultSkillId: running?.nonDefaultSkillId },
        ],
      },
      { where: { nonDefaultUserId: user.nonDefaultUserId } },
    );

    const updatedUser = await User.findByPk(user.nonDefaultUserId, {
      include: ["associatedSkills"],
    });
    const associatedSkills = await Skill.findAll();

    expect(updatedUser).toEqual(
      expect.objectContaining({ name: "Kevin", age: 32 }),
    );
    expect(
      updatedUser?.associatedSkills?.map((skill) => skill.name).sort(),
    ).toEqual(["Cooking", "Programming", "Running"]);
    expect(associatedSkills).toHaveLength(4);
  });

  it("Should update records associated through hasMany - inverse", async () => {
    const User = sequelize.define<UserModel>(
      "User",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    const Skill = sequelize.define<SkillModel>(
      "Skill",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: DataTypes.STRING,
        userId: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    User.hasMany(Skill, {
      as: "skills",
      foreignKey: "userId",
    });

    Skill.belongsTo(User, {
      as: "user",
      foreignKey: "userId",
    });

    await sequelize.sync();

    const [justin, kevin] = await User.bulkCreate([
      {
        name: "Justin",
        age: 33,
        skills: [{ name: "Acting" }, { name: "Cooking" }],
      },
      {
        name: "Kevin",
        age: 32,
        skills: [{ name: "Programming" }],
      },
    ]);

    const cookingId = (
      await Skill.findOne({
        where: { name: "Cooking" },
      })
    )?.id;

    await Skill.update(
      {
        name: "Running",
        user: { id: kevin.id },
      },
      { where: { id: cookingId } },
    );

    const [updatedJustin, updatedKevin] = await Promise.all([
      User.findByPk(justin.id, {
        include: ["skills"],
      }),
      User.findByPk(kevin.id, {
        include: ["skills"],
      }),
    ]);

    expect(updatedJustin).toEqual(
      expect.objectContaining({ name: "Justin", age: 33 }),
    );
    expect(updatedKevin).toEqual(
      expect.objectContaining({ name: "Kevin", age: 32 }),
    );
    expect(updatedJustin?.skills?.map((skill) => skill.name)).toEqual([
      "Acting",
    ]);
    expect(updatedKevin?.skills?.map((skill) => skill.name).sort()).toEqual([
      "Programming",
      "Running",
    ]);

    expect(await Skill.count()).toEqual(3);
  });

  it("Should disassociate records associated through hasMany", async () => {
    const User = sequelize.define<UserModel>(
      "User",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    const Skill = sequelize.define<SkillModel>(
      "Skill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        userId: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    User.hasMany(Skill, {
      as: "skills",
      foreignKey: "userId",
    });

    Skill.belongsTo(User, {
      as: "user",
      foreignKey: "userId",
    });

    await sequelize.sync();

    const user = await User.create({
      name: "Justin",
      age: 33,
      skills: [
        { name: "Acting" },
        { name: "Cooking" },
        { name: "Programming" },
      ],
    });

    await User.update(
      {
        name: "Kevin",
        age: 32,
        skills: [],
      },
      { where: { id: user.id } },
    );

    const updatedUser = await User.findByPk(user.id, { include: ["skills"] });
    const skills = await Skill.findAll();

    expect(updatedUser).toEqual(
      expect.objectContaining({ name: "Kevin", age: 32 }),
    );
    expect(updatedUser?.skills).toEqual([]);
    expect(skills).toHaveLength(3);
  });

  it("Should throw with non-existing IDs through hasMany", async () => {
    const User = sequelize.define<UserModel>(
      "User",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    const Skill = sequelize.define<SkillModel>(
      "Skill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        userId: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    User.hasMany(Skill, {
      as: "skills",
      foreignKey: "userId",
    });

    Skill.belongsTo(User, {
      as: "user",
      foreignKey: "userId",
    });

    await sequelize.sync();

    const user = await User.create({
      name: "Justin",
      age: 33,
      skills: [
        { name: "Acting" },
        { name: "Cooking" },
        { name: "Programming" },
      ],
    });

    await expect(
      User.update(
        {
          name: "Kevin",
          age: 32,
          skills: [{ id: -1 }, { id: -2 }],
        },
        { where: { id: user.id } },
      ),
    ).rejects.toEqualErrors([
      new NotFoundError({
        detail: "Payload must include an ID of an existing 'Skill'.",
        pointer: "/data/relationships/skills/data/0/id",
      }),
      new NotFoundError({
        detail: "Payload must include an ID of an existing 'Skill'.",
        pointer: "/data/relationships/skills/data/1/id",
      }),
    ]);
  });

  it("Should update records associated through belongsToMany", async () => {
    const User = sequelize.define<UserModel>(
      "User",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    const Skill = sequelize.define<SkillModel>(
      "Skill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
      },
      { timestamps: false },
    );

    const UserSkill = sequelize.define<UserSkillModel>(
      "UserSkill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId: DataTypes.INTEGER,
        skillId: DataTypes.INTEGER,
        selfGranted: DataTypes.BOOLEAN,
      },
      { timestamps: false },
    );

    User.belongsToMany(Skill, {
      as: "skills",
      foreignKey: "userId",
      through: UserSkill,
    });

    Skill.belongsToMany(User, {
      as: "users",
      foreignKey: "skillId",
      through: UserSkill,
    });

    await sequelize.sync();

    const user = await User.create({
      name: "Justin",
      age: 33,
      skills: [
        { name: "Acting", through: { selfGranted: true } },
        { name: "Cooking" },
        { name: "Programming", through: { selfGranted: false } },
      ],
    });

    const [cooking, programming, running] = await Promise.all([
      Skill.findOne({
        where: { name: "Cooking" },
      }),
      Skill.findOne({
        where: { name: "Programming" },
      }),
      Skill.create({
        name: "Running",
      }),
    ]);

    await User.update(
      {
        age: 32,
        skills: [
          { id: programming?.id },
          { id: cooking?.id },
          { id: running?.id },
        ],
      },
      { where: { id: user.id } },
    );

    const updatedUser = await User.findByPk(user.id, { include: ["skills"] });

    expect(sequelize.models).toHaveProperty("UserSkill");
    expect(updatedUser?.skills?.map((skill) => skill.name).sort()).toEqual([
      "Cooking",
      "Programming",
      "Running",
    ]);

    const userSkill = await UserSkill.findAll({
      attributes: ["skillId"],
      where: { userId: user.id },
    });

    expect(userSkill.map(({ skillId }) => skillId).sort()).toEqual(
      [cooking?.id, programming?.id, running?.id].sort(),
    );

    expect(await Skill.count()).toEqual(4);
  });

  it("Should update records associated through belongsToMany - inverse", async () => {
    const User = sequelize.define<UserModel>(
      "User",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    const Skill = sequelize.define<SkillModel>(
      "Skill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
      },
      { timestamps: false },
    );

    const UserSkill = sequelize.define<UserSkillModel>(
      "UserSkill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId: DataTypes.INTEGER,
        skillId: DataTypes.INTEGER,
        selfGranted: DataTypes.BOOLEAN,
      },
      { timestamps: false },
    );

    User.belongsToMany(Skill, {
      as: "skills",
      foreignKey: "userId",
      through: UserSkill,
    });

    Skill.belongsToMany(User, {
      as: "users",
      foreignKey: "skillId",
      through: UserSkill,
    });

    await sequelize.sync();

    const programming = await Skill.create({
      name: "Programming",
      users: [
        {
          name: "Justin",
          age: 33,
          through: { selfGranted: false },
        } as UserModel,
        {
          name: "Kevin",
          age: 32,
        } as UserModel,
      ],
    });

    const [justin] = await Promise.all([
      User.findOne({
        where: { name: "Justin", age: 33 },
      }),
      User.findOne({
        where: { name: "Kevin", age: 32 },
      }),
    ]);

    await Skill.update(
      {
        name: "Cooking",
        users: [{ id: justin?.id } as UserModel],
      },
      { where: { id: programming.id } },
    );

    const updatedSkill = await Skill.findByPk(programming.id, {
      include: ["users"],
    });

    expect(sequelize.models).toHaveProperty("UserSkill");
    expect(updatedSkill?.users?.map((user) => user?.name).sort()).toEqual([
      "Justin",
    ]);

    const userSkill = await UserSkill.findAll({
      attributes: ["skillId"],
      where: { userId: programming.id },
    });

    expect(userSkill.map(({ skillId }) => skillId)).toEqual([justin?.id]);

    expect(await Skill.count()).toEqual(1);
  });

  it("Should update records associated through belongsToMany - custom keys", async () => {
    const User = sequelize.define<UserModel>(
      "User",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        id1: { type: DataTypes.UUID, unique: true, defaultValue: randomUUID },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    const Skill = sequelize.define<SkillModel>(
      "Skill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        id2: { type: DataTypes.UUID, unique: true, defaultValue: randomUUID },
        name: DataTypes.STRING,
      },
      { timestamps: false },
    );

    const UserSkill = sequelize.define<UserSkillModel>(
      "UserSkill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        id3: DataTypes.UUID,
        id4: DataTypes.UUID,
        selfGranted: DataTypes.BOOLEAN,
      },
      { timestamps: false },
    );

    User.belongsToMany(Skill, {
      as: "skills",
      sourceKey: "id1",
      targetKey: "id2",
      foreignKey: "id3",
      otherKey: "id4",
      through: UserSkill,
    });

    Skill.belongsToMany(User, {
      as: "users",
      sourceKey: "id2",
      targetKey: "id1",
      foreignKey: "id4",
      otherKey: "id3",
      through: UserSkill,
    });

    await sequelize.sync();

    const user = await User.create({
      name: "Justin",
      age: 33,
      skills: [
        { name: "Acting", through: { selfGranted: true } },
        { name: "Cooking" },
        { name: "Programming", through: { selfGranted: false } },
      ],
    });

    const [cooking, programming, running] = await Promise.all([
      Skill.findOne({
        where: { name: "Cooking" },
      }),
      Skill.findOne({
        where: { name: "Programming" },
      }),
      Skill.create({
        name: "Running",
      }),
    ]);

    await User.update(
      {
        age: 32,
        skills: [
          { id2: programming?.id2 },
          { id2: cooking?.id2 },
          { id2: running?.id2 },
        ],
      },
      { where: { id: user.id } },
    );

    const updatedUser = await User.findByPk(user.id, { include: ["skills"] });

    expect(sequelize.models).toHaveProperty("UserSkill");
    expect(updatedUser?.skills?.map((skill) => skill.name).sort()).toEqual([
      "Cooking",
      "Programming",
      "Running",
    ]);

    const userSkill = await UserSkill.findAll({
      attributes: ["id4"],
      where: { id3: user.id1 },
    });

    expect(userSkill.map(({ id4 }) => id4).sort()).toEqual(
      [cooking?.id2, programming?.id2, running?.id2].sort(),
    );

    expect(await Skill.count()).toEqual(4);
  });

  it("Should disassociate records associated through belongsToMany", async () => {
    const User = sequelize.define<UserModel>(
      "User",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    const Skill = sequelize.define<SkillModel>(
      "Skill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
      },
      { timestamps: false },
    );

    const UserSkill = sequelize.define<UserSkillModel>(
      "UserSkill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId: DataTypes.INTEGER,
        skillId: DataTypes.INTEGER,
        selfGranted: DataTypes.BOOLEAN,
      },
      { timestamps: false },
    );

    User.belongsToMany(Skill, {
      as: "skills",
      foreignKey: "userId",
      through: UserSkill,
    });

    Skill.belongsToMany(User, {
      as: "users",
      foreignKey: "skillId",
      through: UserSkill,
    });

    await sequelize.sync();

    const user = await User.create({
      name: "Justin",
      age: 33,
      skills: [
        { name: "Acting", through: { selfGranted: true } },
        { name: "Cooking" },
        { name: "Programming", through: { selfGranted: false } },
      ],
    });

    await User.update(
      {
        age: 32,
        skills: [],
      },
      { where: { id: user.id } },
    );

    const updatedUser = await User.findByPk(user.id, { include: ["skills"] });

    expect(sequelize.models).toHaveProperty("UserSkill");
    expect(updatedUser?.skills).toEqual([]);

    const userSkill = await UserSkill.findAll({
      attributes: ["skillId"],
      where: { userId: user.id },
    });

    expect(userSkill).toEqual([]);

    expect(await Skill.count()).toEqual(3);
  });

  it("Should throw with non-existing IDs through belongsToMany", async () => {
    const User = sequelize.define<UserModel>(
      "User",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    const Skill = sequelize.define<SkillModel>(
      "Skill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
      },
      { timestamps: false },
    );

    const UserSkill = sequelize.define<UserSkillModel>(
      "UserSkill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId: DataTypes.INTEGER,
        skillId: DataTypes.INTEGER,
        selfGranted: DataTypes.BOOLEAN,
      },
      { timestamps: false },
    );

    User.belongsToMany(Skill, {
      as: "skills",
      foreignKey: "userId",
      through: UserSkill,
    });

    Skill.belongsToMany(User, {
      as: "users",
      foreignKey: "skillId",
      through: UserSkill,
    });

    await sequelize.sync();

    const user = await User.create({
      name: "Justin",
      age: 33,
      skills: [
        { name: "Acting", through: { selfGranted: true } },
        { name: "Cooking" },
        { name: "Programming", through: { selfGranted: false } },
      ],
    });

    await expect(
      User.update(
        {
          age: 32,
          skills: [{ id: -1 }, { id: -2 }],
        },
        { where: { id: user.id } },
      ),
    ).rejects.toEqualErrors([
      new NotFoundError({
        detail: "Payload must include an ID of an existing 'Skill'.",
        pointer: "/data/relationships/skills/data/0/id",
      }),
      new NotFoundError({
        detail: "Payload must include an ID of an existing 'Skill'.",
        pointer: "/data/relationships/skills/data/1/id",
      }),
    ]);
  });

  it("Should throw a proper error when trying to update without an ID through hasOne", async () => {
    const User = sequelize.define<SingleSkillUserModel>(
      "User",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    const Skill = sequelize.define<SkillModel>(
      "Skill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        userId: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    User.hasOne(Skill, {
      as: "skill",
      foreignKey: "userId",
    });

    Skill.belongsTo(User, {
      as: "user",
      foreignKey: "userId",
    });

    await sequelize.sync();

    const justin = await User.create({
      name: "Justin",
      age: 33,
      skill: { name: "Programming" },
    });

    const cooking = await Skill.create({ id: 10, name: "Cooking" });

    await expect(
      User.update(
        { age: 32, skill: { id: cooking.id } },
        { where: { name: justin.name } },
      ),
    ).rejects.toEqualErrors([
      new UnexpectedValueError({
        detail: "Only updating by the primary key is supported",
      }),
    ]);
  });

  it("Should throw a proper error when trying to update without an ID through hasMany", async () => {
    const User = sequelize.define<UserModel>(
      "User",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    const Skill = sequelize.define<SkillModel>(
      "Skill",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: DataTypes.STRING,
        userId: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    User.hasMany(Skill, {
      as: "skills",
      foreignKey: "userId",
    });

    Skill.belongsTo(User, {
      as: "user",
      foreignKey: "userId",
    });

    await sequelize.sync();

    const user = await User.create({
      name: "Justin",
      age: 33,
      skills: [
        { name: "Acting" },
        { name: "Cooking" },
        { name: "Programming" },
      ],
    });

    const [cooking, programming, running] = await Promise.all([
      Skill.findOne({
        where: { name: "Cooking" },
      }),
      Skill.findOne({
        where: { name: "Programming" },
      }),
      Skill.create({
        name: "Running",
      }),
    ]);

    await expect(
      User.update(
        {
          name: "Kevin",
          age: 32,
          skills: [
            { id: cooking?.id },
            { id: programming?.id },
            { id: running?.id },
          ],
        },
        { where: { name: user.name } },
      ),
    ).rejects.toEqualErrors([
      new UnexpectedValueError({
        detail: "Only updating by the primary key is supported",
      }),
    ]);
  });
});
