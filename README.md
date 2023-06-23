# Sequelize Create With Associations

![build workflow](https://github.com/bitovi/sequelize-create-with-associations/actions/workflows/build.yml/badge.svg)
<span class="badge-npmversion"><a href="https://npmjs.org/package/@hatchifyjs/sequelize-create-with-associations" title="View this project on NPM"><img src="https://img.shields.io/npm/v/@hatchifyjs/sequelize-create-with-associations.svg" alt="NPM version" /></a></span>

`@hatchifyjs/sequelize-create-with-associations` is a handy package that extends [Sequelize's](https://sequelize.org/) to simplify the associations.

## Key Features

- Create associations without providing an `includes` declaration
- Create associations with `update`

## Need help or have questions?

This project is supported by [Bitovi, a Node consultancy](https://www.bitovi.com/services/backend/nodejs-consulting). You can get help or ask questions on our:

- [Discord Community](https://discord.gg/J7ejFsZnJ4)
- [Twitter](https://twitter.com/bitovi)

Or, you can hire us for training, consulting, or development. [Set up a free consultation.](https://www.bitovi.com/services/backend/nodejs-consulting)

## Getting Started

In this example, we'll be using `sqlite3` as an in-memory data store, but you can use any [data store supported by Sequelize](https://sequelize.org/docs/v6/other-topics/dialect-specific-things/#underlying-connector-libraries).

We'll start by installing dependencies.

```bash
npm i sequelize @hatchifyjs/sequelize-create-with-associations
npm i sqlite3 -D
```

Now we're going to setup our `Sequelize` instance and setup our plugin.

```js
const { Sequelize, DataTypes } = require("sequelize");
const { extendSequelize } = require("@hatchifyjs/sequelize-create-with-associations");

extendSequelize(Sequelize);

const sequelize = new Sequelize("sqlite::memory:", {
  logging: false,
});

```

Now create some [Models](https://sequelize.org/docs/v6/core-concepts/model-basics/) to represent your data.

```js
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

```

Finally, we will use sequelize's `sync` method to migrate our Model schemas to the database.

Note: this approach should probably not be used in production applications. Consider using [migrations](https://sequelize.org/docs/v6/other-topics/migrations/) instead.

```js
await sequelize.sync();
```

Now we're ready to start leveraging this plugin. Try creating a user with a skill.

```js
await User.create({
  name: "Justin",
  skills: [{ name: "Programming" }],
});
```

Or update a record with associations.

```js
await User.update(
  {
    name: "Kevin",
    skills: [{ id: 7 }],
  },
  { where: { id: 1 } },
);
```

Or even bulk create a record with associations.

```js
await User.bulkCreate([
  {
    name: "John",
    skills: [{ id: 7 }],
  },
  {
    name: "Jane",
    skills: [{ name: "Gaming", through: { selfGranted: true } }],
  },
]);
```

Now let's put that all together.

```js
const { Sequelize, DataTypes } = require("sequelize");
const { extendSequelize } = require("@hatchifyjs/sequelize-create-with-associations");

// extend Sequelize
extendSequelize(Sequelize);

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

(async function main() {
  // sync schemas to DB
  await sequelize.sync();

  // seed some data
  const cooking = await Skill.create({ name: "Cooking" });

  // create a record and associate existing data or create data on the fly
  const justin = await User.create({
    name: "Justin",
    skills: [{ name: "Programming" }, { id: cooking.id }],
  });

  // Update a record and setup an association
  await User.update(
    {
      name: "Kevin",
      skills: [{ id: cooking.id }],
    },
    { where: { id: justin.id } },
  );

  // Bulk create some records with associations
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
})().catch((err) => console.error(err));
```
