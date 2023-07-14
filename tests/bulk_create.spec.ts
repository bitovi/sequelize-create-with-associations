import { Sequelize, DataTypes, Op } from "sequelize";
import * as dotenv from "dotenv";
import { extendSequelize } from "../src/sequelize/extended";
import type {
  SingleSkillUserModel,
  SkillModel,
  UserModel,
  UserSkillModel,
} from "./types";
import { NotFoundError } from "../src/sequelize/types";

dotenv.config();

describe("Bulk Create", () => {
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

    const users = await User.bulkCreate([
      {
        name: "Justin",
        age: 33,
      },
      {
        name: "Kevin",
        age: 32,
      },
    ]);

    const fetchedUsers = await User.findAll({
      where: { id: { [Op.in]: users.map((user) => user.id) } },
    });

    expect(users).toEqual([
      expect.objectContaining({ name: "Justin", age: 33 }),
      expect.objectContaining({ name: "Kevin", age: 32 }),
    ]);
    expect(fetchedUsers).toEqual([
      expect.objectContaining({ name: "Justin", age: 33 }),
      expect.objectContaining({ name: "Kevin", age: 32 }),
    ]);
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

    const { id: cookingId } = await Skill.create({ name: "Cooking" });

    const users = await User.bulkCreate([
      {
        name: "Justin",
        age: 33,
        skill: { name: "Programming" },
      },
      {
        name: "Kevin",
        age: 32,
        skill: { id: cookingId },
      },
    ]);

    const usersWithAssociations = await User.findAll({
      where: { id: { [Op.in]: users.map((user) => user.id) } },
      include: ["skill"],
    });

    expect(usersWithAssociations[0].name).toEqual("Justin");
    expect(usersWithAssociations[0].age).toEqual(33);
    expect(usersWithAssociations[0].skill?.name).toEqual("Programming");
    expect(usersWithAssociations[1].name).toEqual("Kevin");
    expect(usersWithAssociations[1].age).toEqual(32);
    expect(usersWithAssociations[1].skill?.name).toEqual("Cooking");

    const programming = await Skill.findByPk(
      usersWithAssociations[0].skill?.id,
      {
        include: ["user"],
      },
    );

    expect(programming?.user?.id).toEqual(users[0].id);
    expect(programming?.user?.name).toEqual("Justin");
    expect(programming?.user?.age).toEqual(33);

    const cooking = await Skill.findByPk(usersWithAssociations[1].skill?.id, {
      include: ["user"],
    });

    expect(cooking?.user?.id).toEqual(users[1].id);
    expect(cooking?.user?.name).toEqual("Kevin");
    expect(cooking?.user?.age).toEqual(32);
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

    const { id: kevinId } = await User.create({ name: "Kevin", age: 32 });

    const skills = await Skill.bulkCreate([
      {
        name: "Programming",
        user: {
          name: "Justin",
          age: 33,
        },
      },
      {
        name: "Cooking",
        user: {
          id: kevinId,
        },
      },
    ]);

    const skillsWithAssociations = await Skill.findAll({
      where: { id: { [Op.in]: skills.map((skill) => skill.id as number) } },
      include: ["user"],
    });

    expect(skillsWithAssociations[0].user?.name).toEqual("Justin");
    expect(skillsWithAssociations[0].user?.age).toEqual(33);
    expect(skillsWithAssociations[1].user?.name).toEqual("Kevin");
    expect(skillsWithAssociations[1].user?.age).toEqual(32);

    const users = await User.findAll({
      where: {
        id: {
          [Op.in]: skillsWithAssociations.map(
            (skill) => skill.user?.id as number,
          ),
        },
      },
      include: ["skill"],
    });

    expect(users[0].name).toEqual("Kevin");
    expect(users[0].age).toEqual(32);
    expect(users[0].skill?.id).toEqual(skills[1].id);
    expect(users[0].skill?.name).toEqual("Cooking");
    expect(users[1].name).toEqual("Justin");
    expect(users[1].age).toEqual(33);
    expect(users[1].skill?.id).toEqual(skills[0].id);
    expect(users[1].skill?.name).toEqual("Programming");
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

    await expect(
      User.bulkCreate([
        {
          name: "Justin",
          age: 33,
          skill: { name: "Programming" },
        },
        {
          name: "Kevin",
          age: 32,
          skill: { id: -1 },
        },
      ]),
    ).rejects.toEqualErrors([
      new NotFoundError({
        detail: "Payload must include an ID of an existing 'Skill'.",
        pointer: "/data/1/relationships/skill/data/id",
      }),
    ]);
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

    const users = await User.bulkCreate([
      {
        name: "Justin",
        age: 33,
        skills: [{ name: "Programming" }, { id: cookingId }],
      },
      {
        name: "Kevin",
        age: 32,
        skills: [{ name: "Running" }],
      },
    ]);

    const usersWithAssociations = await User.findAll({
      where: { id: { [Op.in]: users.map((user) => user.id) } },
      include: "skills",
    });

    expect(usersWithAssociations[0].name).toEqual("Justin");
    expect(usersWithAssociations[0].age).toEqual(33);
    expect(usersWithAssociations[0].skills).toHaveLength(2);
    expect(usersWithAssociations[1].name).toEqual("Kevin");
    expect(usersWithAssociations[1].age).toEqual(32);
    expect(usersWithAssociations[1].skills).toHaveLength(1);

    const programming = usersWithAssociations[0].skills?.find(
      ({ name }) => name === "Programming",
    );
    const cooking = usersWithAssociations[0].skills?.find(
      ({ name }) => name === "Cooking",
    );
    const running = usersWithAssociations[1].skills?.find(
      ({ name }) => name === "Running",
    );

    expect(programming).toBeTruthy();
    expect(cooking).toBeTruthy();
    expect(running).toBeTruthy();

    const programmingWithUser = await Skill.findByPk(
      usersWithAssociations[0].skills?.find(
        ({ name }) => name === "Programming",
      )?.id,
      { include: ["user"] },
    );

    expect(programmingWithUser?.name).toEqual("Programming");
    expect(programmingWithUser?.user?.id).toEqual(users[0].id);
    expect(programmingWithUser?.user?.name).toEqual("Justin");
    expect(programmingWithUser?.user?.age).toEqual(33);

    const cookingWithUsers = await Skill.findByPk(
      usersWithAssociations[0].skills?.find(({ name }) => name === "Cooking")
        ?.id,
      { include: ["user"] },
    );

    expect(cookingWithUsers?.name).toEqual("Cooking");
    expect(cookingWithUsers?.user?.id).toEqual(users[0].id);
    expect(cookingWithUsers?.user?.name).toEqual("Justin");
    expect(cookingWithUsers?.user?.age).toEqual(33);

    const runningWithUser = await Skill.findByPk(
      usersWithAssociations[1].skills?.find(({ name }) => name === "Running")
        ?.id,
      { include: ["user"] },
    );

    expect(runningWithUser?.name).toEqual("Running");
    expect(runningWithUser?.user?.id).toEqual(users[1].id);
    expect(runningWithUser?.user?.name).toEqual("Kevin");
    expect(runningWithUser?.user?.age).toEqual(32);
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

    const { id: justinId } = await User.create({ name: "Justin", age: 33 });

    const skills = await Skill.bulkCreate([
      {
        name: "Programming",
        user: {
          id: justinId,
        },
      },
      {
        name: "Cooking",
        user: {
          id: justinId,
        },
      },
      {
        name: "Running",
        user: {
          name: "Kevin",
          age: 32,
        },
      },
    ]);

    const skillsWithAssociations = await Skill.findAll({
      where: { id: { [Op.in]: skills.map((skill) => skill.id as number) } },
      include: "user",
    });

    expect(skillsWithAssociations[0].name).toEqual("Programming");
    expect(skillsWithAssociations[0].user?.name).toEqual("Justin");
    expect(skillsWithAssociations[0].user?.age).toEqual(33);
    expect(skillsWithAssociations[1].name).toEqual("Cooking");
    expect(skillsWithAssociations[1].user?.name).toEqual("Justin");
    expect(skillsWithAssociations[1].user?.age).toEqual(33);
    expect(skillsWithAssociations[2].name).toEqual("Running");
    expect(skillsWithAssociations[2].user?.name).toEqual("Kevin");
    expect(skillsWithAssociations[2].user?.age).toEqual(32);

    const usersWithAssociations = await User.findAll({
      where: {
        id: {
          [Op.in]: skillsWithAssociations.map(
            (skill) => skill.user?.id as number,
          ),
        },
      },
      include: ["skills"],
    });

    expect(usersWithAssociations[0].name).toEqual("Justin");
    expect(usersWithAssociations[0].age).toEqual(33);
    expect(usersWithAssociations[0].skills).toHaveLength(2);
    expect(usersWithAssociations[0].skills?.[0].name).toEqual("Programming");
    expect(usersWithAssociations[0].skills?.[1].name).toEqual("Cooking");
    expect(usersWithAssociations[1].name).toEqual("Kevin");
    expect(usersWithAssociations[1].age).toEqual(32);
    expect(usersWithAssociations[1].skills).toHaveLength(1);
    expect(usersWithAssociations[1].skills?.[0].name).toEqual("Running");
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

    await expect(
      User.bulkCreate([
        {
          name: "Justin",
          age: 33,
          skills: [{ name: "Programming" }, { id: -1 }],
        },
        {
          name: "Kevin",
          age: 32,
          skills: [{ name: "Running" }, { id: -2 }, { id: -3 }],
        },
      ]),
    ).rejects.toEqualErrors([
      new NotFoundError({
        detail: "Payload must include an ID of an existing 'Skill'.",
        pointer: "/data/0/relationships/skills/data/1/id",
      }),
      new NotFoundError({
        detail: "Payload must include an ID of an existing 'Skill'.",
        pointer: "/data/1/relationships/skills/data/1/id",
      }),
      new NotFoundError({
        detail: "Payload must include an ID of an existing 'Skill'.",
        pointer: "/data/1/relationships/skills/data/2/id",
      }),
    ]);
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

    const { id: programmingId } = await Skill.create({ name: "Programming" });

    const users = await User.bulkCreate([
      {
        name: "Justin",
        age: 33,
        skills: [
          { id: programmingId },
          { name: "Cooking", through: { selfGranted: true } },
        ],
      },
      {
        name: "Kevin",
        age: 32,
        skills: [{ id: programmingId, through: { selfGranted: false } }],
      },
    ]);

    const usersWithAssociations = await User.findAll({
      where: { id: { [Op.in]: users.map((user) => user.id) } },
      include: "skills",
    });

    expect(usersWithAssociations[0].name).toEqual("Justin");
    expect(usersWithAssociations[0].age).toEqual(33);
    expect(usersWithAssociations[0].skills).toHaveLength(2);
    expect(usersWithAssociations[1].name).toEqual("Kevin");
    expect(usersWithAssociations[1].age).toEqual(32);
    expect(usersWithAssociations[1].skills).toHaveLength(1);

    const programming = usersWithAssociations[0].skills?.find(
      ({ name }) => name === "Programming",
    );
    const cooking = usersWithAssociations[0].skills?.find(
      ({ name }) => name === "Cooking",
    );
    const programming2 = usersWithAssociations[1].skills?.find(
      ({ name }) => name === "Programming",
    );

    expect(programming?.UserSkill?.selfGranted).toBeNull();
    expect(cooking?.UserSkill?.selfGranted).toEqual(true);
    expect(programming2?.UserSkill?.selfGranted).toEqual(false);

    const programmingWithUsers = await Skill.findByPk(
      usersWithAssociations[0].skills?.find(
        ({ name }) => name === "Programming",
      )?.id,
      { include: ["users"] },
    );

    expect(programmingWithUsers?.name).toEqual("Programming");
    expect(programmingWithUsers?.users?.[0]?.id).toEqual(users[0].id);
    expect(programmingWithUsers?.users?.[0]?.name).toEqual("Justin");
    expect(programmingWithUsers?.users?.[0]?.age).toEqual(33);
    expect(programmingWithUsers?.users?.[0]?.UserSkill?.selfGranted).toBeNull();
    expect(programmingWithUsers?.users?.[1]?.id).toEqual(users[1].id);
    expect(programmingWithUsers?.users?.[1]?.name).toEqual("Kevin");
    expect(programmingWithUsers?.users?.[1]?.age).toEqual(32);
    expect(programmingWithUsers?.users?.[1]?.UserSkill?.selfGranted).toEqual(
      false,
    );

    const cookingWithUser = await Skill.findByPk(
      usersWithAssociations[0].skills?.find(({ name }) => name === "Cooking")
        ?.id,
      { include: ["users"] },
    );

    expect(cookingWithUser?.name).toEqual("Cooking");
    expect(cookingWithUser?.users?.[0]?.id).toEqual(users[0].id);
    expect(cookingWithUser?.users?.[0]?.name).toEqual("Justin");
    expect(cookingWithUser?.users?.[0]?.age).toEqual(33);
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

    const { id: justinId } = await User.create({ name: "Justin", age: 33 });

    await Skill.bulkCreate([
      {
        name: "Programming",
        users: [
          {
            id: justinId,
          } as UserModel,
          {
            name: "Kevin",
            age: 32,
            through: { selfGranted: false },
          } as UserModel,
        ],
      },
      {
        name: "Cooking",
        users: [
          {
            id: justinId,
            through: { selfGranted: true },
          } as UserModel,
        ],
      },
    ]);

    const kevinId = (
      await User.findOne({
        where: { name: "Kevin", age: 32 },
      })
    )?.id;

    const users = await User.findAll({
      where: { id: { [Op.in]: [justinId, kevinId] as number[] } },
      include: "skills",
    });

    expect(users[0].name).toEqual("Justin");
    expect(users[0].age).toEqual(33);
    expect(users[0].skills).toHaveLength(2);

    const programming = users[0].skills?.find(
      ({ name }) => name === "Programming",
    );
    const cooking = users[0].skills?.find(({ name }) => name === "Cooking");
    const programming2 = users[1].skills?.find(
      ({ name }) => name === "Programming",
    );

    expect(programming?.UserSkill?.selfGranted).toBeNull();
    expect(cooking?.UserSkill?.selfGranted).toEqual(true);
    expect(programming2?.UserSkill?.selfGranted).toEqual(false);

    const programmingWithUsers = await Skill.findByPk(programming?.id, {
      include: ["users"],
    });

    expect(programmingWithUsers?.name).toEqual("Programming");
    expect(programmingWithUsers?.users).toHaveLength(2);
    expect(programmingWithUsers?.users?.[0]?.id).toEqual(kevinId);
    expect(programmingWithUsers?.users?.[0]?.name).toEqual("Kevin");
    expect(programmingWithUsers?.users?.[0]?.age).toEqual(32);
    expect(programmingWithUsers?.users?.[0]?.UserSkill?.selfGranted).toEqual(
      false,
    );
    expect(programmingWithUsers?.users?.[1]?.id).toEqual(justinId);
    expect(programmingWithUsers?.users?.[1]?.name).toEqual("Justin");
    expect(programmingWithUsers?.users?.[1]?.age).toEqual(33);
    expect(programmingWithUsers?.users?.[1]?.UserSkill?.selfGranted).toBeNull();

    const cookingWithUser = await Skill.findByPk(cooking?.id, {
      include: ["users"],
    });

    expect(cookingWithUser?.name).toEqual("Cooking");
    expect(cookingWithUser?.users).toHaveLength(1);
    expect(cookingWithUser?.users?.[0]?.id).toEqual(justinId);
    expect(cookingWithUser?.users?.[0]?.name).toEqual("Justin");
    expect(cookingWithUser?.users?.[0]?.age).toEqual(33);
    expect(cookingWithUser?.users?.[0]?.UserSkill?.selfGranted).toEqual(true);
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

    await expect(
      User.bulkCreate([
        {
          name: "Justin",
          age: 33,
          skills: [
            { id: -1 },
            { name: "Cooking", through: { selfGranted: true } },
          ],
        },
        {
          name: "Kevin",
          age: 32,
          skills: [
            { id: -2, through: { selfGranted: false } },
            { id: -3, through: { selfGranted: true } },
          ],
        },
      ]),
    ).rejects.toEqualErrors([
      new NotFoundError({
        detail: "Payload must include an ID of an existing 'Skill'.",
        pointer: "/data/0/relationships/skills/data/0/id",
      }),
      new NotFoundError({
        detail: "Payload must include an ID of an existing 'Skill'.",
        pointer: "/data/1/relationships/skills/data/0/id",
      }),
      new NotFoundError({
        detail: "Payload must include an ID of an existing 'Skill'.",
        pointer: "/data/1/relationships/skills/data/1/id",
      }),
    ]);
  });
});
