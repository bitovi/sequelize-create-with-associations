import { Sequelize, DataTypes } from "sequelize";
import * as dotenv from "dotenv";
import { extendSequelize } from "../src";

dotenv.config();

//test for jest, describe and it are jest functions
describe("test", () => {
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

    await mockedSequelize.authenticate();
  });
  afterEach(async () => {
    jest.clearAllMocks();
    await mockedSequelize.drop();
    await mockedSequelize.close();
  });
  it("should work", async () => {
    const User = mockedSequelize.define("User", {
      name: DataTypes.STRING,
      age: DataTypes.INTEGER,
    });

    const Skill = mockedSequelize.define("Skill", {
      name: DataTypes.STRING,
    });

    User.hasMany(Skill);
    Skill.belongsToMany(User, { through: "UWUNICETABLE" });

    await mockedSequelize.sync();

    const user = await User.create({
      name: "Roy",
      age: 33,
      skills: [{ name: "Programming" }, { name: "Cooking" }],
    });

    const users = await User.findAll({});
    const result2 = await User.findAll({
      include: Skill,
      attributes: {
        include: ["name", "age"],
      },
    });

    const projectFindOne: any = await User.findOne({ where: { name: "Roy" } });

    expect(users[0].assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Programming" }),
        expect.objectContaining({ name: "Cooking" }),
      ])
    );

    expect(1).toBe(1);
  });
});
