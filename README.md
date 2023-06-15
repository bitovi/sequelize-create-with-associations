![build workflow](https://github.com/bitovi/sequelize-create-with-associations/actions/workflows/build.yml/badge.svg)

# Sequelize Create With Associations

`@hatchifyjs/sequelize-create-with-associations` is a simple, handy package that extends [Sequelize's](https://sequelize.org/) create and update methods to allow smarter record generations. It lets you automatically create, bulkCreate and update records that have relationships to each other without any extra code.

## Need help or have questions?

This project is supported by [Bitovi, a Node consultancy](https://www.bitovi.com/services/backend/nodejs-consulting). You can get help or ask questions on our:

- [Discord Community](https://discord.gg/J7ejFsZnJ4)
- [Twitter](https://twitter.com/bitovi)

Or, you can hire us for training, consulting, or development. [Set up a free consultation.](https://www.bitovi.com/services/backend/nodejs-consulting)

## Setup

To install from npm:

```
npm i sequelize sqlite3 @hatchifyjs/sequelize-create-with-associations
```

## Basic Use

After installing @hatchifyjs/sequelize-create-with-associations, import the Sequelize class and extend it with `extendSequelize`

```js
const { Sequelize, DataTypes } = require("sequelize");
const { extendSequelize } = require("@hatchifyjs/sequelize-create-with-associations");

(async function main() {
  // extend Sequelize
  await extendSequelize(Sequelize);

  // create your Sequelize instance
  const sequelize = new Sequelize("sqlite::memory:", {
    logging: false,
  });

  // define your models
  const User = sequelize.define("User", {
    name: DataTypes.STRING,
  });

  const Skill = sequelize.define("Skill", {
    name: DataTypes.STRING,
  });

  const UserSkill = sequelize.define("UserSkill", {
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
    skills: [{ name: "Programming" }, { id: cooking.id }],
  });

  await User.update(
    {
      name: "Kevin",
      skills: [{ id: cooking.id }],
    },
    { where: { id: justin.id } },
  );

  await User.bulkCreate([
    {
      name: "John",
      skills: [{ id: cooking.id }],
    },
    {
      name: "Jane",
      skills: [{ name: "Gaming", through: { selfGranted: true } }],
    },
  ]);
})();
```

## How it works

`sequelize-create-with-associations` updates your Sequelize instance and extends all its basic creation methods to behave in a smarter way.

# We want to hear from you.

Come chat with us about open source in our Bitovi community [Discord](https://discord.gg/J7ejFsZnJ4).

See what we're up to by following us on [Twitter](https://twitter.com/bitovi).
