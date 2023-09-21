import type { Sequelize, Transaction } from "sequelize";
import { NotFoundError } from "../types";
import type { IAssociationBody, JSONAnyObject } from "../types";
import { classify, pluralize } from "inflection";
import { camelCaseToPascalCase } from "../util/camelCaseToPascalCase";
import { pascalCaseToCamelCase } from "../util/pascalCaseToCamelCase";

export const handleCreateHasOne = async (
  sequelize: Sequelize,
  association: IAssociationBody<JSONAnyObject>,
  model: { name: string; id: string },
  transaction: Transaction,
  primaryKey = "id",
): Promise<void> => {
  const { model: modelName, as } = association.details;
  const modelInstance = await sequelize.models[model.name].findByPk(
    model[primaryKey],
    {
      transaction,
    },
  );
  if (!modelInstance) {
    throw [new Error("Unable to find created model")];
  }
  let joinId: string | undefined;
  const isCreate = !association.attributes[primaryKey];
  if (isCreate) {
    const model = await sequelize.models[modelName].create(
      association.attributes,
      {
        transaction,
      },
    );
    joinId = model[primaryKey];
  } else {
    joinId = association.attributes[primaryKey];

    if (!(await sequelize.models[modelName].findByPk(joinId))) {
      throw [
        new NotFoundError({
          detail: `Payload must include an ID of an existing '${modelName}'.`,
          pointer: `/data/relationships/${
            as ?? pascalCaseToCamelCase(modelName)
          }/data/id`,
        }),
      ];
    }
  }

  const setter = `set${as ? camelCaseToPascalCase(as) : modelName}`;
  await modelInstance[setter](joinId, {
    transaction,
  });
};

export const handleBulkCreateHasOne = async (
  sequelize: Sequelize,
  association: IAssociationBody<JSONAnyObject[]>,
  model: { name: string; id: string[] },
  transaction: Transaction,
  primaryKey = "id",
): Promise<void> => {
  const modelInstances = await sequelize.models[model.name].findAll({
    where: {
      [primaryKey]: model.id,
    },
    transaction,
  });

  if (modelInstances.length !== model.id.length) {
    throw [new Error("Not all models were successfully created")];
  }

  const modelName = association.details.model;

  await Promise.all(
    association.attributes.map(async (attribute, index) => {
      const isCreate = !attribute[primaryKey];

      if (isCreate) {
        const id = (
          await sequelize.models[modelName].create(attribute, {
            transaction,
          })
        )
          .getDataValue(primaryKey)
          .toString();

        return modelInstances[index][`set${modelName}`](id, {
          transaction,
        });
      }

      if (
        !(await sequelize.models[modelName].findByPk(attribute[primaryKey]))
      ) {
        throw [
          new NotFoundError({
            detail: `Payload must include an ID of an existing '${modelName}'.`,
            pointer: `/data/${index}/relationships/${modelName.toLowerCase()}/data/id`,
          }),
        ];
      }

      return modelInstances[index][`set${modelName}`](attribute[primaryKey], {
        transaction,
      });
    }),
  );
};

export const handleCreateMany = async (
  sequelize: Sequelize,
  association: IAssociationBody<JSONAnyObject[]>,
  model: { name: string; id: string },
  transaction: Transaction,
  primaryKey = "id",
): Promise<void> => {
  const modelInstance = await sequelize.models[model.name].findByPk(
    model[primaryKey],
    {
      transaction,
    },
  );

  if (!modelInstance) {
    throw [new Error("Unable to find created model")];
  }

  const modelName = association.details.model;
  const addFnName = `add${classify(association.details.as)}`;

  const results = await Promise.allSettled(
    association.attributes.map(async (attribute, index) => {
      const isCreate = !attribute[primaryKey];

      if (isCreate) {
        const id = (
          await sequelize.models[modelName].create(
            { ...attribute, through: undefined },
            { transaction },
          )
        )
          .getDataValue(primaryKey)
          .toString();

        return modelInstance[addFnName](id, {
          through: attribute.through,
          transaction,
        });
      }

      if (
        !(await sequelize.models[modelName].findByPk(attribute[primaryKey]))
      ) {
        throw new NotFoundError({
          detail: `Payload must include an ID of an existing '${modelName}'.`,
          pointer: `/data/relationships/${pluralize(
            modelName.toLowerCase(),
          )}/data/${index}/id`,
        });
      }

      return modelInstance[addFnName](attribute[primaryKey], {
        through: attribute.through,
        transaction,
      });
    }),
  );

  const errors = results.reduce(
    (acc, result) =>
      result.status === "fulfilled" ? acc : [...acc, result.reason],
    [],
  );

  if (errors.length) throw errors;
};

export const handleBulkCreateMany = async (
  sequelize: Sequelize,
  association: IAssociationBody<JSONAnyObject[][]>,
  model: { name: string; id: string[] },
  transaction: Transaction,
  primaryKey = "id",
): Promise<void> => {
  // Create an instance of the model using the id
  const modelInstances = await sequelize.models[model.name].findAll({
    where: {
      [primaryKey]: model.id,
    },
    transaction,
  });

  if (modelInstances.length !== model.id.length) {
    throw [new Error("Not all models were successfully created")];
  }

  const modelName = association.details.model;

  const results = await Promise.all(
    association.attributes.map(async (attributes, index) => {
      return Promise.allSettled(
        attributes.map(async (attribute, index2) => {
          const isCreate = !attribute[primaryKey];

          if (isCreate) {
            // Create the models first and add their ids to the joinIds.
            const id = (
              await sequelize.models[modelName].create(
                { ...attribute, through: undefined },
                { transaction },
              )
            )
              .getDataValue(primaryKey)
              .toString();

            return modelInstances[index][`add${modelName}`](id, {
              through: attribute.through,
              transaction,
            });
          }

          if (
            !(await sequelize.models[modelName].findByPk(attribute[primaryKey]))
          ) {
            throw new NotFoundError({
              detail: `Payload must include an ID of an existing '${modelName}'.`,
              pointer: `/data/${index}/relationships/${pluralize(
                modelName.toLowerCase(),
              )}/data/${index2}/id`,
            });
          }

          return modelInstances[index][`add${modelName}`](
            attribute[primaryKey],
            {
              through: attribute.through,
              transaction,
            },
          );
        }),
      );
    }),
  );

  const errors = results
    .flat()
    .reduce(
      (acc, result) =>
        result.status === "fulfilled" ? acc : [...acc, result.reason],
      [],
    );

  if (errors.length) throw errors;
};
