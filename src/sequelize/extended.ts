import {
  getValidAttributesAndAssociations,
  handleCreateAssociations,
} from "./associations";
import { handleCreateBelongs } from "./associations/sequelize.post";
import { IAssociation } from "./types";
import { Model, CreateOptions, Attributes } from "sequelize";
import { MakeNullishOptional } from "sequelize/types/utils";

type AssociationLookup = Record<string, Record<string, IAssociation>>;

let associationsLookup: undefined | AssociationLookup;

function calculateAssociationProp(associations) {
  const result = {};

  Object.keys(associations).forEach((key) => {
    const association = {};
    let propertyName;
    if (associations[key].hasOwnProperty("options")) {
      const { associationType, target, foreignKey, throughModel } =
        associations[key];
      propertyName = key.toLocaleLowerCase();
      association[propertyName] = {
        type: associationType,
        key: foreignKey,
        model: target.name,
        joinTable: throughModel,
      };
    }
    result[propertyName] = association[propertyName];
  });

  return result;
}
function getLookup(sequelize): AssociationLookup {
  if (!associationsLookup) {
    let lookup: any = {};
    const models = sequelize.models;
    const modelKeys = Object.keys(models);
    modelKeys.forEach((key) => {
      const associations = calculateAssociationProp(models[key].associations);
      lookup[key] = associations;
    });
    associationsLookup = lookup;
  }
  return associationsLookup;
}

export const extendSequelize = async (SequelizeClass: any) => {
  const origCreate = SequelizeClass.Model.create;

  SequelizeClass.Model.create = async function <
    M extends Model,
    O extends CreateOptions<Attributes<M>> = CreateOptions<Attributes<M>>
  >(
    attributes: MakeNullishOptional<M["_creationAttributes"]> | undefined,
    options?: O
  ) {
    const { sequelize } = this.options;

    const associations = getLookup(sequelize)[this.name];

    const modelPrimaryKey = this.primaryKeyAttribute;
    let modelData:
      | undefined
      | (O extends { returning: false } | { ignoreDuplicates: true }
          ? void
          : M);
    let currentModelAttributes = attributes;

    const {
      externalAssociations,
      belongsAssociation,
      currentModelAttributes: _attributes,
    } = getValidAttributesAndAssociations(attributes, associations);

    currentModelAttributes = _attributes;
    const validAssociationsInAttributes = [
      ...externalAssociations,
      ...belongsAssociation,
    ];

    // If there are no associations, create the model with all attributes.
    if (validAssociationsInAttributes.length === 0) {
      return origCreate.apply(this, [attributes, options]);
    }

    const transaction =
      options?.transaction ?? (await this.sequelize.transaction());

    try {
      if (belongsAssociation.length > 0) {
        const _model = await handleCreateBelongs(
          this,
          origCreate,
          currentModelAttributes,
          belongsAssociation,
          associations as Record<string, IAssociation>,
          attributes,
          transaction,
          modelPrimaryKey
        );
        modelData = _model;
      }

      if (externalAssociations.length > 0) {
        // create the model first if it does not exist
        if (!modelData) {
          modelData = await origCreate.apply(this, [
            currentModelAttributes,
            { transaction },
          ]);
        }
        await handleCreateAssociations(
          this.sequelize,
          this,
          externalAssociations,
          associations as Record<string, IAssociation>,
          attributes,
          transaction,
          modelData?.[modelPrimaryKey],
          modelPrimaryKey
        );
      }

      !options?.transaction && (await transaction.commit());
    } catch (error) {
      !options?.transaction && (await transaction.rollback());
      throw error;
    }

    return modelData;
  };
};
