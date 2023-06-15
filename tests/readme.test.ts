import { Sequelize, DataTypes } from "sequelize";
import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import * as dotenv from "dotenv";
import { extendSequelize } from "../src/sequelize/extended";

dotenv.config();

describe("Readme", () => {
  interface SkillModel
    extends Model<
      InferAttributes<SkillModel>,
      InferCreationAttributes<SkillModel>
    > {
    id?: CreationOptional<number>;
    name: string;
    through?: { selfGranted: boolean };
  }

  interface UserModel
    extends Model<
      InferAttributes<UserModel>,
      InferCreationAttributes<UserModel>
    > {
    id?: CreationOptional<number>;
    name: string;
    skills?: SkillModel[];
  }

  interface UserSkillModel
    extends Model<
      InferAttributes<UserSkillModel>,
      InferCreationAttributes<UserSkillModel>
    > {
    id?: CreationOptional<number>;
    userId?: number;
    skillId?: number;
    selfGranted: boolean;
  }

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

  it("Should make sure readme example works", async () => {
    // define your models
    const User = sequelize.define<UserModel>("User", {
      name: DataTypes.STRING,
    });

    const Skill = sequelize.define<SkillModel>("Skill", {
      name: DataTypes.STRING,
    });

    const UserSkill = sequelize.define<UserSkillModel>("UserSkill", {
      userId: DataTypes.INTEGER,
      skillId: DataTypes.INTEGER,
      selfGranted: DataTypes.BOOLEAN,
    });

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

    // create the tables
    await sequelize.sync();

    // seed some data
    const cooking = await Skill.create({ name: "Cooking" });

    // create a record and associate existing data or create data on the fly
    const justin = await User.create({
      name: "Justin",
      skills: [{ name: "Programming" }, { id: cooking.id }] as SkillModel[],
    });

    await User.update(
      {
        name: "Kevin",
        skills: [{ id: cooking.id }] as SkillModel[],
      },
      { where: { id: justin.id } },
    );

    await User.bulkCreate([
      {
        name: "John",
        skills: [{ id: cooking.id }] as SkillModel[],
      },
      {
        name: "Jane",
        skills: [
          { name: "Gaming", through: { selfGranted: true } },
        ] as SkillModel[],
      },
    ]);

    const users = await User.findAll({
      include: ["skills"],
      order: [["id", "ASC"]],
    });

    expect(users.map((user) => user.toJSON())).toEqual([
      {
        id: 1,
        name: "Kevin",
        skills: [
          {
            id: 1,
            name: "Cooking",
            UserSkill: {
              userId: 1,
              skillId: 1,
              selfGranted: null,
              createdAt: expect.any(Date),
              updatedAt: expect.any(Date),
            },
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        ],
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      {
        id: 2,
        name: "John",
        skills: [
          {
            id: 1,
            name: "Cooking",
            UserSkill: {
              userId: 2,
              skillId: 1,
              selfGranted: null,
              createdAt: expect.any(Date),
              updatedAt: expect.any(Date),
            },
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        ],
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      {
        id: 3,
        name: "Jane",
        skills: [
          {
            id: 3,
            name: "Gaming",
            UserSkill: {
              userId: 3,
              skillId: 3,
              selfGranted: true,
              createdAt: expect.any(Date),
              updatedAt: expect.any(Date),
            },
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        ],
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    ]);
  });
});
