import type {
  Attributes,
  ModelStatic,
  Sequelize,
  Transaction,
} from "sequelize";
import type { IAssociation, JSONAnyObject } from "../types";
import { handleUpdateMany, handleUpdateOne } from "./sequelize.patch";
import {
  handleBulkCreateHasOne,
  handleBulkCreateMany,
  handleCreateHasOne,
  handleCreateMany,
} from "./sequelize.post";

export const getValidAttributesAndAssociations = (
  attributes: Attributes<any> | Array<Attributes<any>>,
  associations: Record<string, IAssociation> | undefined,
): {
  externalAssociations: string[];
  otherAssociationAttributes: JSONAnyObject;
  currentModelAttributes: Attributes<any>;
} => {
  const externalAssociations: string[] = [];
  let currentModelAttributes = attributes;
  const otherAssociationAttributes: JSONAnyObject = {};

  if (associations) {
    const associationsKeys = Object.keys(associations);
    const attributeKeys = Array.isArray(currentModelAttributes)
      ? Object.keys(attributes[0])
      : Object.keys(attributes);

    // GET ALL ASSOCIATION ATTRIBUTES AND SEPARATE THEM FROM DATA LEFT
    associationsKeys.forEach((association) => {
      if (attributeKeys.includes(association)) {
        let data: any;
        if (Array.isArray(currentModelAttributes)) {
          data = currentModelAttributes.map((attribute: any) => {
            const { [association]: _, ...attributesleft } = attribute;
            const otherAttr = otherAssociationAttributes[association] ?? [];
            otherAssociationAttributes[association] = [...otherAttr, _];
            return attributesleft;
          });
        } else {
          const { [association]: _, ...attributesLeft } =
            currentModelAttributes;
          data = attributesLeft;
        }
        currentModelAttributes = data;
        externalAssociations.push(association);
      }
    });
  }

  return {
    otherAssociationAttributes,
    externalAssociations,
    currentModelAttributes,
  };
};

export const handleCreateAssociations = async (
  sequelize: Sequelize,
  model: ModelStatic<any>,
  validAssociations: string[],
  associations: Record<string, IAssociation>,
  attributes: Attributes<any>,
  transaction: Transaction,
  modelId: string,
  primaryKey = "id",
): Promise<void> => {
  for (const association of validAssociations) {
    const associationDetails = associations[association];
    const associationAttribute = attributes[association];

    switch (associationDetails.type) {
      case "BelongsTo":
      case "HasOne":
        await handleCreateHasOne(
          sequelize,
          {
            details: associationDetails,
            attributes: associationAttribute,
          },
          { name: model.name, id: modelId },
          transaction,
          primaryKey,
        );
        break;
      case "BelongsToMany":
      case "HasMany":
        await handleCreateMany(
          sequelize,
          {
            details: associationDetails,
            attributes: associationAttribute,
          },
          { name: model.name, id: modelId },
          transaction,
          primaryKey,
        );
        break;
      default:
        break;
    }
  }
};

export const handleBulkCreateAssociations = async (
  sequelize: Sequelize,
  model: ModelStatic<any>,
  validAssociations: string[],
  associations: Record<string, IAssociation>,
  attributes: JSONAnyObject,
  transaction: Transaction,
  modelIds: string[],
  primaryKey = "id",
): Promise<void> => {
  for (const association of validAssociations) {
    const associationDetails = associations[association];
    const associationAttribute = attributes[association];

    switch (associationDetails.type) {
      case "BelongsTo":
      case "HasOne":
        await handleBulkCreateHasOne(
          sequelize,
          {
            details: associationDetails,
            attributes: associationAttribute,
          },
          { name: model.name, id: modelIds },
          transaction,
          primaryKey,
        );
        break;
      case "BelongsToMany":
      case "HasMany":
        await handleBulkCreateMany(
          sequelize,
          {
            details: associationDetails,
            attributes: associationAttribute,
          },
          { name: model.name, id: modelIds },
          transaction,
          primaryKey,
        );
        break;
      default:
        break;
    }
  }
};

export const handleUpdateAssociations = async (
  sequelize: Sequelize,
  model: ModelStatic<any>,
  validAssociations: string[],
  associations: Record<string, IAssociation>,
  attributes: Attributes<any>,
  transaction: Transaction,
  modelId: string,
  primaryKey = "id",
): Promise<void> => {
  for (const association of validAssociations) {
    const associationDetails = associations[association];
    const associationAttribute = attributes[association];

    switch (associationDetails.type) {
      case "BelongsTo":
      case "HasOne":
        await handleUpdateOne(
          sequelize,
          {
            details: associationDetails,
            attributes: associationAttribute,
          },
          {
            name: model.name,
            id: modelId,
          },
          transaction,
          primaryKey,
        );
        break;
      case "HasMany":
      case "BelongsToMany":
        await handleUpdateMany(
          sequelize,
          {
            details: associationDetails,
            attributes: associationAttribute,
          },
          {
            name: model.name,
            id: modelId,
          },
          transaction,
          primaryKey,
        );
        break;
      default:
        break;
    }
  }
};
