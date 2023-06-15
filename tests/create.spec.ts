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

  it("Should create records with no associations", async () => {
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

    const fetchedUser = await User.findByPk(user.id);

    expect(user).toEqual(expect.objectContaining({ name: "Justin", age: 33 }));
    expect(fetchedUser).toEqual(
      expect.objectContaining({ name: "Justin", age: 33 }),
    );
  });

  it("Should create records associated through hasOne", async () => {
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

    const user = await User.create({
      name: "Justin",
      age: 32,
      skill: { name: "Programming" },
    });

    const userWithAssociations = await User.findByPk(user.id, {
      include: ["skill"],
    });

    expect(userWithAssociations?.name).toEqual("Justin");
    expect(userWithAssociations?.age).toEqual(32);
    expect(userWithAssociations?.skill?.name).toEqual("Programming");

    const skill = await Skill.findByPk(userWithAssociations?.skill?.id, {
      include: ["user"],
    });

    expect(skill?.user?.id).toEqual(user.id);
    expect(skill?.user?.name).toEqual("Justin");
    expect(skill?.user?.age).toEqual(32);
  });

  it("Should create records associated through hasOne - id", async () => {
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

    const programming = await Skill.create({ name: "Programming" });

    const user = await User.create({
      name: "Justin",
      age: 32,
      skill: { id: programming.id },
    });

    const userWithAssociations = await User.findByPk(user.id, {
      include: ["skill"],
    });

    expect(userWithAssociations?.name).toEqual("Justin");
    expect(userWithAssociations?.age).toEqual(32);
    expect(userWithAssociations?.skill?.name).toEqual("Programming");

    const skill = await Skill.findByPk(userWithAssociations?.skill?.id, {
      include: ["user"],
    });

    expect(skill?.user?.id).toEqual(user.id);
    expect(skill?.user?.name).toEqual("Justin");
    expect(skill?.user?.age).toEqual(32);
  });

  it("Should create records associated through hasOne - inverse", async () => {
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

    const skill = await Skill.create({
      name: "Programming",
      user: {
        name: "Justin",
        age: 32,
      },
    });

    const skillWithAssociations = await Skill.findByPk(skill.id, {
      include: ["user"],
    });

    expect(skillWithAssociations?.user?.name).toEqual("Justin");
    expect(skillWithAssociations?.user?.age).toEqual(32);

    const user = await User.findByPk(skillWithAssociations?.user?.id, {
      include: ["skill"],
    });

    expect(user?.name).toEqual("Justin");
    expect(user?.age).toEqual(32);
    expect(user?.skill?.id).toEqual(skill.id);
    expect(user?.skill?.name).toEqual("Programming");
  });

  it("Should create records associated through hasMany", async () => {
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

    const cookingId = (await Skill.create({ name: "Cooking" })).id;

    const user = await User.create({
      name: "Justin",
      age: 33,
      skills: [{ name: "Programming" }, { id: cookingId }],
    });

    const userWithAssociations = await User.findByPk(user.id, {
      include: "skills",
    });

    expect(userWithAssociations?.name).toEqual("Justin");
    expect(userWithAssociations?.age).toEqual(33);
    expect(userWithAssociations?.skills).toHaveLength(2);

    const programming = userWithAssociations?.skills?.find(
      ({ name }) => name === "Programming",
    );
    const cooking = userWithAssociations?.skills?.find(
      ({ name }) => name === "Cooking",
    );

    expect(programming).toBeTruthy();
    expect(cooking).toBeTruthy();

    const programmingWithUser = await Skill.findByPk(
      userWithAssociations?.skills?.find(({ name }) => name === "Programming")
        ?.id,
      { include: ["user"] },
    );

    expect(programmingWithUser?.name).toEqual("Programming");
    expect(programmingWithUser?.user?.id).toEqual(user.id);
    expect(programmingWithUser?.user?.name).toEqual(user.name);
    expect(programmingWithUser?.user?.age).toEqual(user.age);

    const cookingWithUser = await Skill.findByPk(
      userWithAssociations?.skills?.find(({ name }) => name === "Cooking")?.id,
      { include: ["user"] },
    );

    expect(cookingWithUser?.name).toEqual("Cooking");
    expect(cookingWithUser?.user?.id).toEqual(user.id);
    expect(cookingWithUser?.user?.name).toEqual(user.name);
    expect(cookingWithUser?.user?.age).toEqual(user.age);
  });

  it("Should create records associated through hasMany - inverse", async () => {
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

    const skill = await Skill.create({
      name: "Programming",
      user: {
        name: "Justin",
        age: 33,
      },
    });

    const skillWithAssociations = await Skill.findByPk(skill.id, {
      include: "user",
    });

    expect(skillWithAssociations?.name).toEqual("Programming");
    expect(skillWithAssociations?.user?.name).toEqual("Justin");
    expect(skillWithAssociations?.user?.age).toEqual(33);

    const userWithAssociations = await User.findByPk(
      skillWithAssociations?.user?.id,
      {
        include: ["skills"],
      },
    );

    expect(userWithAssociations?.name).toEqual("Justin");
    expect(userWithAssociations?.age).toEqual(33);
    expect(userWithAssociations?.skills).toHaveLength(1);
    expect(userWithAssociations?.skills?.[0].name).toEqual("Programming");
  });

  it("Should create table and records associated through belongsToMany", async () => {
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
        { name: "Programming" },
        { name: "Cooking", through: { selfGranted: true } },
      ],
    });

    const userWithAssociations = await User.findByPk(user.id, {
      include: "skills",
    });

    expect(userWithAssociations?.name).toEqual("Justin");
    expect(userWithAssociations?.age).toEqual(33);
    expect(userWithAssociations?.skills).toHaveLength(2);

    const programming = userWithAssociations?.skills?.find(
      ({ name }) => name === "Programming",
    );
    const cooking = userWithAssociations?.skills?.find(
      ({ name }) => name === "Cooking",
    );

    expect(programming?.UserSkill?.selfGranted).toBeNull();
    expect(cooking?.UserSkill?.selfGranted).toEqual(true);

    const programmingWithUser = await Skill.findByPk(
      userWithAssociations?.skills?.find(({ name }) => name === "Programming")
        ?.id,
      { include: ["users"] },
    );

    expect(programmingWithUser?.name).toEqual("Programming");
    expect(programmingWithUser?.users?.[0]?.id).toEqual(user.id);
    expect(programmingWithUser?.users?.[0]?.name).toEqual(user.name);
    expect(programmingWithUser?.users?.[0]?.age).toEqual(user.age);
    expect(programmingWithUser?.users?.[0]?.UserSkill?.selfGranted).toBeNull();

    const cookingWithUser = await Skill.findByPk(
      userWithAssociations?.skills?.find(({ name }) => name === "Cooking")?.id,
      { include: ["users"] },
    );

    expect(cookingWithUser?.name).toEqual("Cooking");
    expect(cookingWithUser?.users?.[0]?.id).toEqual(user.id);
    expect(cookingWithUser?.users?.[0]?.name).toEqual(user.name);
    expect(cookingWithUser?.users?.[0]?.age).toEqual(user.age);
    expect(cookingWithUser?.users?.[0]?.UserSkill?.selfGranted).toEqual(true);
  });

  it("Should create table and records associated through belongsToMany - inverse", async () => {
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

    await Skill.create({
      name: "Programming",
      users: [{ name: "Justin", age: 33 } as UserModel],
    });

    const userId = (
      await User.findOne({
        where: { name: "Justin", age: 33 },
      })
    )?.id;

    await Skill.create({
      name: "Cooking",
      users: [
        {
          id: userId,
          through: { selfGranted: true },
        } as UserModel,
      ],
    });

    const user = await User.findByPk(userId, {
      include: "skills",
    });

    expect(user?.name).toEqual("Justin");
    expect(user?.age).toEqual(33);
    expect(user?.skills).toHaveLength(2);

    const programming = user?.skills?.find(
      ({ name }) => name === "Programming",
    );
    const cooking = user?.skills?.find(({ name }) => name === "Cooking");

    expect(programming?.UserSkill?.selfGranted).toBeNull();
    expect(cooking?.UserSkill?.selfGranted).toEqual(true);

    const programmingWithUser = await Skill.findByPk(
      user?.skills?.find(({ name }) => name === "Programming")?.id,
      { include: ["users"] },
    );

    expect(programmingWithUser?.name).toEqual("Programming");
    expect(programmingWithUser?.users?.[0]?.id).toEqual(userId);
    expect(programmingWithUser?.users?.[0]?.name).toEqual(user?.name);
    expect(programmingWithUser?.users?.[0]?.age).toEqual(user?.age);
    expect(programmingWithUser?.users?.[0]?.UserSkill?.selfGranted).toBeNull();

    const cookingWithUser = await Skill.findByPk(
      user?.skills?.find(({ name }) => name === "Cooking")?.id,
      { include: ["users"] },
    );

    expect(cookingWithUser?.name).toEqual("Cooking");
    expect(cookingWithUser?.users?.[0]?.id).toEqual(userId);
    expect(cookingWithUser?.users?.[0]?.name).toEqual(user?.name);
    expect(cookingWithUser?.users?.[0]?.age).toEqual(user?.age);
    expect(cookingWithUser?.users?.[0]?.UserSkill?.selfGranted).toEqual(true);
  });
});
