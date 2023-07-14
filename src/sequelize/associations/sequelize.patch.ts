import { pluralize } from "inflection";
import { Op } from "sequelize";
import type { Sequelize, Transaction } from "sequelize";

import { NotFoundError } from "../types";
import type { IAssociationBody } from "../types";

export const handleUpdateOne = async (
  sequelize: Sequelize,
  association: IAssociationBody<Array<Record<string, any>>>,
  model: { name: string; id: string },
  transaction: Transaction,
  primaryKey = "id",
): Promise<void> => {
  const modelName = association.details.model;
  const associatedId = association.attributes?.[primaryKey] || null;
  const [modelInstance, associatedInstance] = await Promise.all([
    sequelize.models[model.name].findByPk(model[primaryKey], {
      transaction,
    }),
    associatedId
      ? sequelize.models[modelName].findByPk(associatedId, {
          transaction,
        })
      : null,
  ]);

  if (!modelInstance) {
    throw [new Error("Unable to find created model")];
  }

  if (associatedId && !associatedInstance) {
    throw [
      new NotFoundError({
        detail: `Payload must include an ID of an existing '${modelName}'.`,
        pointer: `/data/relationships/${modelName.toLowerCase()}/data/id`,
      }),
    ];
  }

  await modelInstance[`set${modelName}`](associatedId, {
    transaction,
  });
};

export const handleUpdateMany = async (
  sequelize: Sequelize,
  association: IAssociationBody<Array<Record<string, any>>>,
  model: { name: string; id: string },
  transaction: Transaction,
  primaryKey = "id",
): Promise<void> => {
  const modelName = association.details.model;
  const associatedIds = association.attributes.map((data) => data[primaryKey]);
  const [modelInstance, associatedInstances] = await Promise.all([
    sequelize.models[model.name].findByPk(model[primaryKey], {
      transaction,
    }),
    associatedIds.length
      ? sequelize.models[modelName].findAll({
          where: { id: { [Op.in]: associatedIds } },
          transaction,
        })
      : [],
  ]);

  if (!modelInstance) return;

  if (
    associatedIds.length &&
    associatedInstances.length < associatedIds.length
  ) {
    throw associatedIds.reduce(
      (acc, associatedId, index) =>
        associatedInstances.some(
          ({ dataValues: { id } }) => id === associatedId,
        )
          ? acc
          : [
              ...acc,
              new NotFoundError({
                detail: `Payload must include an ID of an existing '${modelName}'.`,
                pointer: `/data/relationships/${pluralize(
                  modelName.toLowerCase(),
                )}/data/${index}/id`,
              }),
            ],
      [],
    );
  }

  await modelInstance[`set${pluralize(association.details.model)}`](
    association.attributes.map((data) => data[primaryKey]),
    {
      transaction,
    },
  );
};
