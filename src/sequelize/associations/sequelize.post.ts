import * as inflection from "inflection";
import { Attributes, ModelStatic, Sequelize, Transaction } from "sequelize";
import { IAssociation, IAssociationBody, JSONAnyObject } from "../types";

export const handleCreateBelongs = async (
  model: ModelStatic<any>,
  origCreate: any,
  currentModelAttributes: Attributes<any>,
  belongsAssociation: Array<string>,
  associations: Record<string, IAssociation>,
  attributes: Attributes<any>,
  transaction: Transaction,
  primaryKey = "id"
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
  belongsAssociation: Array<string>,
  associations: Record<string, IAssociation>,
  otherAttributes: Attributes<any>,
  transaction: Transaction,
  primaryKey = "id"
) => {
  const bulkModelAttributes: Array<any> = [];
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
  association: IAssociationBody<JSONAnyObject | Array<JSONAnyObject>>,
  model: { name: string; id?: string | Array<string> },
  transaction: Transaction,
  isCreateOne = true
) => {
  const key = association.details.otherKey;

  if (isCreateOne) {
    const data = {
      ...association.attributes,
      [key]: model.id,
    };
    await sequelize.models[association.details.model].create(data, {
      transaction,
    });
  } else {
    let i = 0;
    const data = association.attributes.map((attribute) => {
      const result = {
        ...attribute,
        [key]: model.id ? model.id[i] : undefined,
      };
      i++;
      return result;
    });
    await sequelize.models[association.details.model].bulkCreate(data, {
      transaction,
    });
  }
};

export const handleCreateMany = async (
  sequelize: Sequelize,
  association: IAssociationBody<Array<JSONAnyObject>>,
  model: { name: string; id: string },
  transaction: Transaction,
  primaryKey = "id"
) => {
  // Create an instance of the model using the id
  const modelInstance = await sequelize.models[model.name].findByPk(
    model[primaryKey],
    {
      transaction,
    }
  );
  if (!modelInstance) {
    throw new Error("Unable to find Created Model");
  }
  const isCreate = !association.attributes[0][primaryKey];
  let joinIds: Array<string> = [];
  if (isCreate) {
    // Create the models first and add their ids to the joinIds.
    const associationData = await sequelize.models[
      association.details.model
    ].bulkCreate(association.attributes, { transaction });
    joinIds = associationData.map((data) => data.getDataValue(primaryKey));
  } else {
    // Assign the ids to the through table if the model is present
    joinIds = association.attributes.map((data) => data[primaryKey]);
  }
  const modelNameInPlural = inflection.pluralize(association.details.model);
  await modelInstance[`add${modelNameInPlural}`](joinIds, {
    transaction,
  });
};

export const handleBulkCreateMany = async (
  sequelize: Sequelize,
  association: IAssociationBody<Array<JSONAnyObject[]>>,
  model: { name: string; id: Array<string> },
  transaction: Transaction,
  primaryKey = "id"
) => {
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
  let i = 0;
  for (const modelInstance of modelInstances) {
    const isCreate = !association.attributes[i][0][primaryKey];
    let joinIds: Array<string> = [];
    if (isCreate) {
      // Create the models first and add their ids to the joinIds.
      const associationData = await sequelize.models[
        association.details.model
      ].bulkCreate(association.attributes[i], { transaction });
      joinIds = associationData.map((data) => data.getDataValue(primaryKey));
    } else {
      // Assign the ids to the through table if the model is present
      joinIds = association.attributes[i].map((data) => data[primaryKey]);
    }
    i++;
    const modelNameInPlural = inflection.pluralize(association.details.model);
    await modelInstance[`add${modelNameInPlural}`](joinIds, {
      transaction,
    });
  }
};
