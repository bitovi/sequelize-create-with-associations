import { Sequelize, DataTypes } from "sequelize";
import * as dotenv from "dotenv";
import { extendSequelize, getLookup } from "../src/sequelize/extended";
import type {
  SingleSkillUserModel,
  SkillModel,
  UserModel,
  UserSkillModel,
} from "./types";

dotenv.config();

describe("Extended", () => {
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

  describe("getLookup", () => {
    it("Should get the associations for one to one", () => {
      const User = sequelize.define<SingleSkillUserModel>(
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

      User.hasOne(Skill, {
        as: "skill",
        foreignKey: "userId",
      });

      Skill.belongsTo(User, {
        as: "user",
        foreignKey: "userId",
      });

      expect(getLookup(sequelize)).toEqual({
        User: {
          skill: {
            joinTable: undefined,
            type: "HasOne",
            foreignKey: "userId",
            sourceKey: "id",
            model: "Skill",
            as: "skill",
          },
        },
        Skill: {
          user: {
            type: "BelongsTo",
            foreignKey: "userId",
            targetKey: "id",
            model: "User",
            as: "user",
          },
        },
      });
    });

    it("Should get the associations for one to many", () => {
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

      expect(getLookup(sequelize)).toEqual({
        User: {
          skills: {
            type: "HasMany",
            foreignKey: "userId",
            sourceKey: "id",
            model: "Skill",
            as: "skills",
          },
        },
        Skill: {
          user: {
            type: "BelongsTo",
            foreignKey: "userId",
            targetKey: "id",
            model: "User",
            as: "user",
          },
        },
      });
    });

    it("Should get the associations for many to many", () => {
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
        },
        { timestamps: false },
      );

      const UserSkill = sequelize.define<UserSkillModel>(
        "UserSkill",
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
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

      expect(getLookup(sequelize)).toEqual({
        Skill: {
          users: {
            joinTable: expect.any(Function),
            sourceKey: "id",
            targetKey: "id",
            foreignKey: "skillId",
            otherKey: "userId",
            model: "User",
            type: "BelongsToMany",
            as: "users",
          },
        },
        User: {
          skills: {
            joinTable: expect.any(Function),
            sourceKey: "id",
            targetKey: "id",
            foreignKey: "userId",
            otherKey: "skillId",
            model: "Skill",
            type: "BelongsToMany",
            as: "skills",
          },
        },
        UserSkill: {},
      });
    });
  });
});
