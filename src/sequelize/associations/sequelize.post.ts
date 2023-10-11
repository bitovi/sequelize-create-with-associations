import type { Sequelize, Transaction } from "sequelize";
import { NotFoundError } from "../types";
import type { IAssociationBody, JSONAnyObject } from "../types";
import { pluralize } from "inflection";
import { camelCaseToPascalCase } from "../util/camelCaseToPascalCase";

export const handleCreateHasOne = async (
  sequelize: Sequelize,
  association: IAssociationBody<JSONAnyObject>,
  model: { name: string; id: string },
  transaction: Transaction,
): Promise<void> => {
  const { model: associatedModelName, as } = association.details;
  const modelInstance = await sequelize.models[model.name].findByPk(model.id, {
    transaction,
  });
  if (!modelInstance) {
    throw [new Error("Unable to find created model")];
  }
  let joinId: string | undefined;
  const associatedModelPrimaryKey =
    sequelize.models[association.details.model].primaryKeyAttribute;
  const isCreate = !association.attributes[associatedModelPrimaryKey];
  if (isCreate) {
    const model = await sequelize.models[associatedModelName].create(
      association.attributes,
      {
        transaction,
      },
    );
    joinId = model[associatedModelPrimaryKey];
  } else {
    joinId = association.attributes[associatedModelPrimaryKey];

    if (!(await sequelize.models[associatedModelName].findByPk(joinId))) {
      throw [
        new NotFoundError({
          detail: `Payload must include an ID of an existing '${associatedModelName}'.`,
          pointer: `/data/relationships/${as}/data/id`,
        }),
      ];
    }
  }

  const setter = `set${as ? camelCaseToPascalCase(as) : associatedModelName}`;
  await modelInstance[setter](joinId, {
    transaction,
  });
};

export const handleBulkCreateHasOne = async (
  sequelize: Sequelize,
  association: IAssociationBody<JSONAnyObject[]>,
  model: { name: string; id: string[] },
  transaction: Transaction,
): Promise<void> => {
  const baseModelPrimaryKey = sequelize.models[model.name].primaryKeyAttribute;

  const modelInstances = await sequelize.models[model.name].findAll({
    where: {
      [baseModelPrimaryKey]: model.id,
    },
    transaction,
  });

  if (modelInstances.length !== model.id.length) {
    throw [new Error("Not all models were successfully created")];
  }

  const associatedModelName = association.details.model;
  const associatedModelPrimaryKey =
    sequelize.models[association.details.model].primaryKeyAttribute;

  await Promise.all(
    association.attributes.map(async (attribute, index) => {
      const isCreate = !attribute[associatedModelPrimaryKey];

      if (isCreate) {
        const id = (
          await sequelize.models[associatedModelName].create(attribute, {
            transaction,
          })
        )
          .getDataValue(associatedModelPrimaryKey)
          .toString();

        return modelInstances[index][`set${associatedModelName}`](id, {
          transaction,
        });
      }

      if (
        !(await sequelize.models[associatedModelName].findByPk(
          attribute[associatedModelPrimaryKey],
        ))
      ) {
        throw [
          new NotFoundError({
            detail: `Payload must include an ID of an existing '${associatedModelName}'.`,
            pointer: `/data/${index}/relationships/${associatedModelName.toLowerCase()}/data/id`,
          }),
        ];
      }

      return modelInstances[index][`set${associatedModelName}`](
        attribute[associatedModelPrimaryKey],
        {
          transaction,
        },
      );
    }),
  );
};

export const handleCreateMany = async (
  sequelize: Sequelize,
  association: IAssociationBody<JSONAnyObject[]>,
  model: { name: string; id: string },
  transaction: Transaction,
): Promise<void> => {
  const modelInstance = await sequelize.models[model.name].findByPk(model.id, {
    transaction,
  });

  if (!modelInstance) {
    throw [new Error("Unable to find created model")];
  }

  const associatedModelName = association.details.model;
  const associatedModelPrimaryKey =
    sequelize.models[associatedModelName].primaryKeyAttribute;
  const addFnName = `add${camelCaseToPascalCase(association.details.as)}`;

  const results = await Promise.allSettled(
    association.attributes.map(async (attribute, index) => {
      const isCreate = !attribute[associatedModelPrimaryKey];

      if (isCreate) {
        const id = (
          await sequelize.models[associatedModelName].create(
            { ...attribute, through: undefined },
            { transaction },
          )
        )
          .getDataValue(associatedModelPrimaryKey)
          .toString();

        return modelInstance[addFnName](id, {
          through: attribute.through,
          transaction,
        });
      }

      if (
        !(await sequelize.models[associatedModelName].findByPk(
          attribute[associatedModelPrimaryKey],
          {
            transaction,
          },
        ))
      ) {
        throw new NotFoundError({
          detail: `Payload must include an ID of an existing '${associatedModelName}'.`,
          pointer: `/data/relationships/${pluralize(
            associatedModelName.toLowerCase(),
          )}/data/${index}/id`,
        });
      }

      return modelInstance[addFnName](attribute[associatedModelPrimaryKey], {
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
): Promise<void> => {
  const baseModelPrimaryKey = sequelize.models[model.name].primaryKeyAttribute;
  // Create an instance of the model using the id
  const modelInstances = await sequelize.models[model.name].findAll({
    where: {
      [baseModelPrimaryKey]: model.id,
    },
    transaction,
  });

  if (modelInstances.length !== model.id.length) {
    throw [new Error("Not all models were successfully created")];
  }

  const associatedModelName = association.details.model;
  const associatedModelPrimaryKey =
    sequelize.models[associatedModelName].primaryKeyAttribute;
  const addFnName = `add${camelCaseToPascalCase(association.details.as)}`;

  const results = await Promise.all(
    association.attributes.map(async (attributes, index) => {
      return Promise.allSettled(
        attributes.map(async (attribute, index2) => {
          const isCreate = !attribute[associatedModelPrimaryKey];

          if (isCreate) {
            // Create the models first and add their ids to the joinIds.
            const id = (
              await sequelize.models[associatedModelName].create(
                { ...attribute, through: undefined },
                { transaction },
              )
            )
              .getDataValue(associatedModelPrimaryKey)
              .toString();

            return modelInstances[index][addFnName](id, {
              through: attribute.through,
              transaction,
            });
          }

          if (
            !(await sequelize.models[associatedModelName].findByPk(
              attribute[associatedModelPrimaryKey],
            ))
          ) {
            throw new NotFoundError({
              detail: `Payload must include an ID of an existing '${associatedModelName}'.`,
              pointer: `/data/${index}/relationships/${pluralize(
                associatedModelName.toLowerCase(),
              )}/data/${index2}/id`,
            });
          }

          return modelInstances[index][addFnName](
            attribute[associatedModelPrimaryKey],
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
