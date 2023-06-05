import { Sequelize, DataTypes } from "sequelize";
import * as dotenv from "dotenv";
import { extendSequelize } from "../src/sequelize/extended";

dotenv.config();

describe("Readme", () => {
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
    const User = sequelize.define("User", {
      name: DataTypes.STRING,
    });

    const Skill = sequelize.define("Skill", {
      name: DataTypes.STRING,
    });

    User.hasMany(Skill, {
      as: "skills",
    });
    Skill.belongsTo(User);

    //synchronize your models
    await sequelize.sync();

    // create a record and associated data
    await User.create({
      name: "Roy",
      skills: [
        {
          name: "Product Design",
        },
      ],
    });

    // or associate existing data
    await Skill.create({
      id: 2,
      name: "Testing",
    });
    await User.create({
      name: "Nau",
      skills: [
        {
          id: 2,
        },
      ],
    });

    const users = await User.findAll({
      include: ["skills"],
      order: [["id", "ASC"]],
    });

    expect(users.map((user) => user.toJSON())).toEqual([
      {
        id: 1,
        name: "Roy",
        skills: [
          {
            id: 1,
            name: "Product Design",
            UserId: 1,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        ],
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      {
        id: 2,
        name: "Nau",
        skills: [
          {
            id: 2,
            name: "Testing",
            UserId: 2,
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
