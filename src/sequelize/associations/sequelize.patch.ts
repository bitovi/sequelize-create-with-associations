import { pluralize } from "inflection";
import type { Sequelize, Transaction } from "sequelize";

import type { IAssociationBody } from "../types";

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
