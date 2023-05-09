/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  Sequelize,
  Model,
  CreateOptions,
  ModelStatic,
  Attributes,
  UpdateOptions,
} from "sequelize";
import { Col, Fn, Literal, MakeNullishOptional } from "sequelize/types/utils";
import { Scaffold } from "..";
import {
  getValidAttributesAndAssociations,
  handleBulkCreateAssociations,
  handleCreateAssociations,
  handleUpdateAssociations,
} from "./associations";
import { handleUpdateBelongs } from "./associations/sequelize.patch";
import {
  handleBulkCreateBelongs,
  handleCreateBelongs,
} from "./associations/sequelize.post";
import { IAssociation } from "./types";
import { ScaffoldError } from "../error/errors";

export function extendedSequelize(scaffold: Scaffold) {
  const origCreate = Model.create;
  const origBulkCreate = Model.bulkCreate;
  const origUpdate = Model.update;

  Model.create = async function <
    M extends Model,
    O extends CreateOptions<Attributes<M>> = CreateOptions<Attributes<M>>
  >(
    this: ModelStatic<M>,
    attributes: MakeNullishOptional<M["_creationAttributes"]> | undefined,
    options?: O
  ) {
    const associations = scaffold.associationsLookup[this.name];
    const modelPrimaryKey = this.primaryKeyAttribute;

    let modelData:
      | undefined
      | (O extends { returning: false } | { ignoreDuplicates: true }
          ? void
          : M);
    let currentModelAttributes = attributes;

    const {
      // validAssociationsInAttributes,
      externalAssociations,
      belongsAssociation,
      currentModelAttributes: _attributes,
    } = getValidAttributesAndAssociations(attributes, associations);

    currentModelAttributes = _attributes;
    // All associations
    const validAssociationsInAttributes = [
      ...externalAssociations,
      ...belongsAssociation,
    ];

    // If there are no associations, create the model with all attributes.
    if (validAssociationsInAttributes.length === 0) {
      return origCreate.apply(this, [attributes, options]);
    }

    const transaction =
      options?.transaction ?? (await scaffold.orm.transaction());

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
          scaffold,
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

  Model.bulkCreate = async function <
    M extends Model,
    O extends CreateOptions<Attributes<M>> = CreateOptions<Attributes<M>>
  >(
    this: ModelStatic<M>,
    attributes: MakeNullishOptional<M["_creationAttributes"]>[],
    options?: O
  ) {
    const associations = scaffold.associationsLookup[this.name];
    const modelPrimaryKey = this.primaryKeyAttribute;

    let modelData:
      | undefined
      | (O extends { returning: false } | { ignoreDuplicates: true }
          ? void
          : M)[];
    let currentModelAttributes = attributes;

    const {
      otherAssociationAttributes,
      externalAssociations,
      belongsAssociation,
      currentModelAttributes: _attributes,
    } = getValidAttributesAndAssociations(attributes, associations);
    currentModelAttributes = _attributes;
    // All associations
    const validAssociationsInAttributes = [
      ...externalAssociations,
      ...belongsAssociation,
    ];

    // If there are no associations, create the model with all attributes.
    if (validAssociationsInAttributes.length === 0) {
      return origBulkCreate.apply(this, [attributes, options]);
    }

    const transaction =
      options?.transaction ?? (await scaffold.orm.transaction());

    try {
      if (belongsAssociation.length > 0) {
        const _model = await handleBulkCreateBelongs(
          this,
          origBulkCreate,
          currentModelAttributes,
          belongsAssociation,
          associations as Record<string, IAssociation>,
          otherAssociationAttributes,
          transaction,
          modelPrimaryKey
        );
        modelData = _model;
      }

      if (externalAssociations.length > 0) {
        // create the model first if it does not exist
        if (!modelData) {
          modelData = await origBulkCreate.apply(this, [
            currentModelAttributes,
            { transaction },
          ]);
        }
        const modelIds = modelData?.map((data) =>
          data.getDataValue(modelPrimaryKey)
        ) as string[];
        await handleBulkCreateAssociations(
          scaffold,
          this,
          externalAssociations,
          associations as Record<string, IAssociation>,
          otherAssociationAttributes,
          transaction,
          modelIds,
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

  Model.update = async function <M extends Model<any, any>>(
    this: ModelStatic<M>,
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
    }
  ) {
    const associations = scaffold.associationsLookup[this.name];
    const modelPrimaryKey = this.primaryKeyAttribute;

    if (!ops.where?.[modelPrimaryKey]) {
      throw new ScaffoldError("Primary key does not exist");
    }
    const modelId = ops.where[modelPrimaryKey];
    let modelUpdateData: [affectedCount: number, affectedRows: M[]] | undefined;
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
      return origUpdate.apply(this, [attributes, ops]);
    }

    const transaction = await scaffold.orm.transaction();

    try {
      if (belongsAssociation.length > 0) {
        const _model = await handleUpdateBelongs(
          this,
          ops,
          origUpdate,
          currentModelAttributes,
          belongsAssociation,
          associations as Record<string, IAssociation>,
          attributes,
          transaction,
          modelPrimaryKey
        );
        modelUpdateData = _model;
      }
      if (externalAssociations.length > 0) {
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
          scaffold,
          this,
          externalAssociations,
          associations as Record<string, IAssociation>,
          attributes,
          transaction,
          modelId,
          modelPrimaryKey
        );
      }

      !ops?.transaction && (await transaction.commit());
    } catch (error) {
      !ops?.transaction && (await transaction.rollback());
      throw error;
    }

    return modelUpdateData;
  };

  return Sequelize;
}
