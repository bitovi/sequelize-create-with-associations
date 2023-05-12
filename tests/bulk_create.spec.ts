import { Sequelize, DataTypes } from "sequelize";
import * as dotenv from "dotenv";
import { extendSequelize } from "../src/sequelize/extended";

dotenv.config();

describe("Bulk Create", () => {
  let mockedSequelize: any;

  beforeAll(async () => {
    await extendSequelize(Sequelize);

    mockedSequelize = new Sequelize({
      dialect: "postgres",
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT) ?? 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
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
  it("Should bulkCreate and return records", async () => {
    const User = mockedSequelize.define("User", {
      name: DataTypes.STRING,
      age: DataTypes.INTEGER,
    });

    await mockedSequelize.sync();

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

    await User.bulkCreate([
      {
        name: "Kevin",
        age: 25,
        skill: { name: "Dancing" },
        jobs: [{ title: "Singer" }, { title: "Cooker" }],
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
    expect(users[0].skill).toEqual(
      expect.objectContaining({ name: "Dancing" })
    );
    expect(users[1].skill).toEqual(
      expect.objectContaining({ name: "JiuJitsu" })
    );
    expect(skills).toHaveLength(2);
  });
});
