import { pluralize } from "inflection";
import type {
  Attributes,
  ModelStatic,
  Sequelize,
  Transaction,
  UpdateOptions,
} from "sequelize";

import type { IAssociation, IAssociationBody } from "../types";

export const handleUpdateBelongs = async (
  model: ModelStatic<any>,
  ops: Omit<UpdateOptions<Attributes<any>>, "returning"> & {
    returning: Exclude<
      UpdateOptions<Attributes<any>>["returning"],
      undefined | false
    >;
  },
  origUpdate: any,
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
    updatedModelAttributes[key] = associationAttribute?.[primaryKey];
  });
  return origUpdate.apply(model, [
    updatedModelAttributes,
    { ...ops, transaction },
  ]);
};

export const handleUpdateOne = async (
  sequelize: Sequelize,
  association: IAssociationBody<Array<Record<string, any>>>,
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

  await modelInstance[`set${association.details.model}`](
    association.attributes[primaryKey],
    { transaction },
  );
};

export const handleUpdateMany = async (
  sequelize: Sequelize,
  association: IAssociationBody<Array<Record<string, any>>>,
  model: { name: string; id: string },
  transaction: Transaction,
  primaryKey = "id",
): Promise<void> => {
  const modelInstance = await sequelize.models[model.name].findByPk(
    model[primaryKey],
  );

  if (!modelInstance || !association.attributes.length) return;

  const modelNameInPlural = pluralize(association.details.model);

  await modelInstance[`set${modelNameInPlural}`](
    association.attributes.map((data) => data[primaryKey]),
    {
      transaction,
    },
  );
};
