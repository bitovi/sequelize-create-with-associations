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
npm i @hatchifyjs/sequelize-create-with-associations
```

## Basic Use

After installing @hatchifyjs/sequelize-create-with-associations, import the Sequelize class and extend it with `extendSequelize`

```js
const { Sequelize } = require("sequelize");
const extendSequelize = require("@hatchifyjs/sequelize-create-with-associations");

//extend sequelize
extendSequelize(sequelize);

//create your sequelize instance
const sequelize = new Sequelize({
  ...config,
});

// define your models
const User = sequelize.define("User", {
  name: DataTypes.STRING,
});

const Skill = sequelize.define("Skill", {
  name: DataTypes.STRING,
});

User.hasMany(Skill);
Skill.belongsTo(User);

//synchronize your models
await mockedSequelize.sync();

// create a record with associated data
await User.create({
  name: "Roy",
  skills: [
    {
      name: "Product Design",
    },
  ],
});
//or
await User.create({
  name: "Roy",
  skills: [
    {
      id: "0661f6f2-f0d8-11ed-a05b-0242ac120003",
    },
  ],
});

// It should work on the fly.
```

## How it works

Check out our [full API documentation](docs/api.md).

`sequelize-create-with-associations` updates your Sequelize instance and extends all it's basic creation methods to behave in a smarter way.

# We want to hear from you.

Come chat with us about open source in our Bitovi community [Discord](https://discord.gg/J7ejFsZnJ4).

See what we're up to by following us on [Twitter](https://twitter.com/bitovi).
