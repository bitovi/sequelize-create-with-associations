import type {
  Model,
  CreateOptions,
  Attributes,
  UpdateOptions,
} from "sequelize";
import type {
  Col,
  Fn,
  Literal,
  MakeNullishOptional,
} from "sequelize/types/utils";
import {
  getValidAttributesAndAssociations,
  handleBulkCreateAssociations,
  handleCreateAssociations,
  handleUpdateAssociations,
} from "./associations";
import type { IAssociation } from "./types";

type AssociationLookup = Record<string, Record<string, IAssociation>>;

let associationsLookup: AssociationLookup;

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
export function getLookup(sequelize): AssociationLookup {
  //TODO: Fix associations lookup being static
  /*  if (!associationsLookup) { */
  const lookup: any = {};
  const models = sequelize.models;
  const modelKeys = Object.keys(models);
  modelKeys.forEach((key) => {
    const associations = calculateAssociationProp(models[key].associations);
    lookup[key] = associations;
  });
  associationsLookup = lookup;
  return associationsLookup;
}

export const extendSequelize = async (SequelizeClass: any) => {
  const origCreate = SequelizeClass.Model.create;
  const origUpdate = SequelizeClass.Model.update;
  const origBulkCreate = SequelizeClass.Model.bulkCreate;

  SequelizeClass.Model.create = async function <
    M extends Model,
    O extends CreateOptions<Attributes<M>> = CreateOptions<Attributes<M>>,
  >(
    attributes: MakeNullishOptional<M["_creationAttributes"]> | undefined,
    options?: O,
  ) {
    const { sequelize } = this.options;

    const associations = getLookup(sequelize)[this.name];

    const modelPrimaryKey = this.primaryKeyAttribute;
    let modelData:
      | undefined
      | (O extends { returning: false } | { ignoreDuplicates: true }
          ? void
          : M);

    const { externalAssociations, currentModelAttributes } =
      getValidAttributesAndAssociations(attributes, associations);

    // If there are no associations, create the model with all attributes.
    if (!externalAssociations.length) {
      return origCreate.apply(this, [attributes, options]);
    }

    const transaction =
      options?.transaction ?? (await this.sequelize.transaction());

    try {
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
        modelPrimaryKey,
      );

      !options?.transaction && (await transaction.commit());
    } catch (error) {
      !options?.transaction && (await transaction.rollback());
      throw error;
    }

    return modelData;
  };

  SequelizeClass.Model.bulkCreate = async function <
    M extends Model,
    O extends CreateOptions<Attributes<M>> = CreateOptions<Attributes<M>>,
  >(
    attributes: Array<MakeNullishOptional<M["_creationAttributes"]>>,
    options?: O,
  ) {
    const { sequelize } = this.options;

    const associations = getLookup(sequelize)[this.name];

    const modelPrimaryKey = this.primaryKeyAttribute;

    let modelData:
      | undefined
      | Array<
          O extends { returning: false } | { ignoreDuplicates: true } ? void : M
        >;

    const {
      otherAssociationAttributes,
      externalAssociations,
      currentModelAttributes,
    } = getValidAttributesAndAssociations(attributes, associations);

    // If there are no associations, create the model with all attributes.
    if (!externalAssociations.length) {
      return origBulkCreate.apply(this, [attributes, options]);
    }

    const transaction =
      options?.transaction ?? (await this.sequelize.transaction());

    try {
      // create the model first if it does not exist
      if (!modelData) {
        modelData = await origBulkCreate.apply(this, [
          currentModelAttributes,
          { transaction },
        ]);
      }

      const modelIds = modelData?.map((data) =>
        data.getDataValue(modelPrimaryKey),
      ) as string[];

      await handleBulkCreateAssociations(
        this.sequelize,
        this,
        externalAssociations,
        associations as Record<string, IAssociation>,
        otherAssociationAttributes,
        transaction,
        modelIds,
        modelPrimaryKey,
      );

      !options?.transaction && (await transaction.commit());
    } catch (error) {
      !options?.transaction && (await transaction.rollback());
      throw error;
    }

    return modelData;
  };
  SequelizeClass.Model.update = async function <M extends Model<any, any>>(
    attributes: {
      [key in keyof Attributes<M>]?:
        | Fn
        | Col
        | Literal
        | Attributes<M>[key]
        | undefined;
    },
    ops: Omit<UpdateOptions<Attributes<M>>, "returning"> & {
      returning: Exclude<
        UpdateOptions<Attributes<M>>["returning"],
        undefined | false
      >;
    },
  ) {
    const { sequelize } = this.options;
    const associations = getLookup(sequelize)[this.name];
    const modelPrimaryKey = this.primaryKeyAttribute;

    const modelId = ops.where?.[modelPrimaryKey];
    let modelUpdateData: [affectedCount: number, affectedRows: M[]] | undefined;

    const { externalAssociations, currentModelAttributes } =
      getValidAttributesAndAssociations(attributes, associations);

    // If there are no associations, create the model with all attributes.
    if (!externalAssociations.length) {
      return origUpdate.apply(this, [attributes, ops]);
    } else if (!modelId) {
      throw new Error("Only updating by the primary key is supported");
    }

    const transaction = await this.sequelize.transaction();

    try {
      if (!modelUpdateData) {
        modelUpdateData = await origUpdate.apply(this, [
          currentModelAttributes,
          {
            ...ops,
            transaction,
          },
        ]);
      }

      await handleUpdateAssociations(
        this.sequelize,
        this,
        externalAssociations,
        associations as Record<string, IAssociation>,
        attributes,
        transaction,
        modelId,
        modelPrimaryKey,
      );

      !ops?.transaction && (await transaction.commit());
    } catch (error) {
      !ops?.transaction && (await transaction.rollback());
      throw error;
    }

    return modelUpdateData;
  };
};
