import type {
  Attributes,
  ModelStatic,
  Sequelize,
  Transaction,
} from "sequelize";
import type { IAssociation, IAssociationBody, JSONAnyObject } from "../types";

export const handleCreateBelongs = async (
  model: ModelStatic<any>,
  origCreate: any,
  currentModelAttributes: Attributes<any>,
  belongsAssociation: string[],
  associations: Record<string, IAssociation>,
  attributes: Attributes<any>,
  transaction: Transaction,
  primaryKey = "id",
) => {
  const updatedModelAttributes = currentModelAttributes;
  belongsAssociation.forEach((association) => {
    const associationDetails = associations[association];
    const associationAttribute = attributes[association];
    const key = associationDetails.key;
    updatedModelAttributes[key] =
      typeof associationAttribute === "string"
        ? associationAttribute
        : associationAttribute?.[primaryKey];
  });

  return origCreate.apply(model, [updatedModelAttributes, { transaction }]);
};

export const handleBulkCreateBelongs = async (
  model: ModelStatic<any>,
  origBulkCreate: any,
  currentModelAttributes: Array<Attributes<any>>,
  belongsAssociation: string[],
  associations: Record<string, IAssociation>,
  otherAttributes: Attributes<any>,
  transaction: Transaction,
  primaryKey = "id",
) => {
  const bulkModelAttributes: any[] = [];
  let i = 0;
  currentModelAttributes.forEach((currentModelAttribute) => {
    const updatedModelAttributes = currentModelAttribute;
    belongsAssociation.forEach((association) => {
      const associationDetails = associations[association];
      const associationAttribute = otherAttributes[association][i];
      const key = associationDetails.key;
      updatedModelAttributes[key] =
        typeof associationAttribute === "string"
          ? associationAttribute
          : associationAttribute?.[primaryKey];
    });
    i++;
    bulkModelAttributes.push(updatedModelAttributes);
  });
  return origBulkCreate.apply(model, [bulkModelAttributes, { transaction }]);
};

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
