import type { Sequelize, Transaction } from "sequelize";
import { ValidationError } from "../types";
import type { IAssociationBody, JSONAnyObject } from "../types";

export const handleCreateHasOne = async (
  sequelize: Sequelize,
  association: IAssociationBody<JSONAnyObject>,
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
    throw new Error("Unable to find Created Model");
  }
  let joinId: string | undefined;
  const isCreate = !association.attributes[primaryKey];
  if (isCreate) {
    const model = await sequelize.models[association.details.model].create(
      association.attributes,
      {
        transaction,
      },
    );
    joinId = model[primaryKey];
  } else {
    joinId = association.attributes[primaryKey];

    if (!(await sequelize.models[association.details.model].findByPk(joinId))) {
      throw new ValidationError(
        `${association.details.model} with ID ${joinId} was not found`,
      );
    }
  }
  const modelName = association.details.model;
  await modelInstance[`set${modelName}`](joinId, {
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
    throw new Error("Not all models were successfully created");
  }

  const modelName = association.details.model;

  await Promise.all(
    association.attributes.map(async (attribute, index) => {
      const isCreate = !attribute[primaryKey];

      if (isCreate) {
        const id = (
          await sequelize.models[association.details.model].create(attribute, {
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
        !(await sequelize.models[association.details.model].findByPk(
          attribute[primaryKey],
        ))
      ) {
        throw new ValidationError(
          `${association.details.model} with ID ${attribute[primaryKey]} was not found`,
        );
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
  // Create an instance of the model using the id
  const modelInstance = await sequelize.models[model.name].findByPk(
    model[primaryKey],
    {
      transaction,
    },
  );

  if (!modelInstance) {
    throw new Error("Unable to find Created Model");
  }

  const modelName = association.details.model;

  await Promise.all(
    association.attributes.map(async (attribute) => {
      const isCreate = !attribute[primaryKey];

      if (isCreate) {
        const id = (
          await sequelize.models[association.details.model].create(
            { ...attribute, through: undefined },
            { transaction },
          )
        )
          .getDataValue(primaryKey)
          .toString();

        return modelInstance[`add${modelName}`](id, {
          through: attribute.through,
          transaction,
        });
      }

      if (
        !(await sequelize.models[association.details.model].findByPk(
          attribute[primaryKey],
        ))
      ) {
        throw new ValidationError(
          `${association.details.model} with ID ${attribute[primaryKey]} was not found`,
        );
      }

      return modelInstance[`add${modelName}`](attribute[primaryKey], {
        through: attribute.through,
        transaction,
      });
    }),
  );
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
    throw new Error("Not all models were successfully created");
  }

  const modelName = association.details.model;

  await Promise.all(
    association.attributes.map(async (attributes, index) => {
      return Promise.all(
        attributes.map(async (attribute) => {
          const isCreate = !attribute[primaryKey];

          if (isCreate) {
            // Create the models first and add their ids to the joinIds.
            const id = (
              await sequelize.models[association.details.model].create(
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
            !(await sequelize.models[association.details.model].findByPk(
              attribute[primaryKey],
            ))
          ) {
            throw new ValidationError(
              `${association.details.model} with ID ${attribute[primaryKey]} was not found`,
            );
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
};
