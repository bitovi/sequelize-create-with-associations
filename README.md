# Sequelize Create With Associations

`@hatchifyjs/sequelize-create-with-associations` is a simple, handy package that extends [Sequelize's](https://sequelize.org/) create and update methods to allow smarter record generations. It lets you automatically create and update associated records without extra code.

## Need help or have questions?

This project is supported by [Bitovi, a Node consultancy](https://www.bitovi.com/services/backend/nodejs-consulting). You can get help or ask questions on our:

- [Discord Community](https://discord.gg/J7ejFsZnJ4)
- [Twitter](https://twitter.com/bitovi)

Or, you can hire us for training, consulting, or development. [Set up a free consultation.](https://www.bitovi.com/services/backend/nodejs-consulting)

## Basic Use

For basic usage, we will use this simple example:

```js
//this won't look like this tho, it will be something we extend off; gotta review
const { Sequelize } = require("sequelize");
const extendSequelize = require("@hatchifyjs/sequelize-create-with-associations");

const sequelize = new Sequelize({
  ...config,
});

// create models first

extendSequelize(sequelize);

// define models
const User = sequelize.define("User", {
  name: DataTypes.STRING,
});

const Skill = sequelize.define("Skill", {
  name: DataTypes.STRING,
});

User.hasMany(Skill);
Skill.belongsTo(User);

// connect sequelize

await User.create({
  name: "Roy",
  skills: [
    {
      name: "Product Design",
    },
  ],
});
// It should work on the fly.
```

## Setup

To install from npm:

```
npm i @hatchifyjs/sequelize-create-with-associations
```

## How it works

Check out our [full API documentation](docs/api.md).

`sequelize-create-with-associations` updates your Sequelize instance and extends all it's basic creation methods to behave in a smarter way.

# We want to hear from you.

Come chat with us about open source in our Bitovi community [Discord](https://discord.gg/J7ejFsZnJ4).

See what we're up to by following us on [Twitter](https://twitter.com/bitovi).
