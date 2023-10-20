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
  const { model: associatedModelName, as, targetKey } = association.details;
  const modelInstance = await sequelize.models[model.name].findByPk(model.id, {
    transaction,
  });
  if (!modelInstance) {
    throw [new Error("Unable to find created model")];
  }
  let joinId: string | undefined;

  const associatedModelIdAttribute = sequelize.models[
    associatedModelName
  ].getAttributes()[targetKey]?.unique
    ? targetKey
    : sequelize.models[associatedModelName].primaryKeyAttribute;
  const isCreate = !association.attributes[associatedModelIdAttribute];
  if (isCreate) {
    const model = await sequelize.models[associatedModelName].create(
      association.attributes,
      {
        transaction,
      },
    );
    joinId = model[associatedModelIdAttribute];
  } else {
    joinId = association.attributes[associatedModelIdAttribute];

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

  const { model: associatedModelName, targetKey } = association.details;
  const associatedModelIdAttribute = sequelize.models[
    associatedModelName
  ].getAttributes()[targetKey]?.unique
    ? targetKey
    : sequelize.models[associatedModelName].primaryKeyAttribute;

  await Promise.all(
    association.attributes.map(async (attribute, index) => {
      const isCreate = !attribute[associatedModelIdAttribute];

      if (isCreate) {
        const id = (
          await sequelize.models[associatedModelName].create(attribute, {
            transaction,
          })
        )[associatedModelIdAttribute].toString();

        return modelInstances[index][`set${associatedModelName}`](id, {
          transaction,
        });
      }

      if (
        !(await sequelize.models[associatedModelName].findByPk(
          attribute[associatedModelIdAttribute],
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
        attribute[associatedModelIdAttribute],
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

  const { model: associatedModelName, targetKey } = association.details;
  const associatedModelIdAttribute = sequelize.models[
    associatedModelName
  ].getAttributes()[targetKey]?.unique
    ? targetKey
    : sequelize.models[associatedModelName].primaryKeyAttribute;
  const addFnName = `add${camelCaseToPascalCase(association.details.as)}`;

  const results = await Promise.allSettled(
    association.attributes.map(async (attribute, index) => {
      const isCreate = !attribute[associatedModelIdAttribute];

      if (isCreate) {
        const createdInstance = await sequelize.models[
          associatedModelName
        ].create({ ...attribute, through: undefined }, { transaction });

        return modelInstance[addFnName](createdInstance, {
          through: attribute.through,
          transaction,
        });
      }

      const existingInstance = await sequelize.models[
        associatedModelName
      ].findOne({
        where: {
          [associatedModelIdAttribute]: attribute[associatedModelIdAttribute],
        },
        transaction,
      });

      if (!existingInstance) {
        throw new NotFoundError({
          detail: `Payload must include an ID of an existing '${associatedModelName}'.`,
          pointer: `/data/relationships/${pluralize(
            associatedModelName.toLowerCase(),
          )}/data/${index}/id`,
        });
      }

      return modelInstance[addFnName](existingInstance, {
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

  const { model: associatedModelName, targetKey } = association.details;
  const associatedModelIdAttribute = sequelize.models[
    associatedModelName
  ].getAttributes()[targetKey]?.unique
    ? targetKey
    : sequelize.models[associatedModelName].primaryKeyAttribute;
  const addFnName = `add${camelCaseToPascalCase(association.details.as)}`;

  const results = await Promise.all(
    association.attributes.map(async (attributes, index) => {
      return Promise.allSettled(
        attributes.map(async (attribute, index2) => {
          const isCreate = !attribute[associatedModelIdAttribute];

          if (isCreate) {
            // Create the models first and add their ids to the joinIds.
            const createdInstance = await sequelize.models[
              associatedModelName
            ].create({ ...attribute, through: undefined }, { transaction });

            return modelInstances[index][addFnName](createdInstance, {
              through: attribute.through,
              transaction,
            });
          }

          const existingInstance = await sequelize.models[
            associatedModelName
          ].findOne({
            where: {
              [associatedModelIdAttribute]:
                attribute[associatedModelIdAttribute],
            },
          });

          if (!existingInstance) {
            throw new NotFoundError({
              detail: `Payload must include an ID of an existing '${associatedModelName}'.`,
              pointer: `/data/${index}/relationships/${pluralize(
                associatedModelName.toLowerCase(),
              )}/data/${index2}/id`,
            });
          }

          return modelInstances[index][addFnName](existingInstance, {
            through: attribute.through,
            transaction,
          });
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
