import { pluralize } from "inflection";
import { Op } from "sequelize";
import type { Sequelize, Transaction } from "sequelize";

import { NotFoundError } from "../types";
import type { IAssociationBody } from "../types";
import { camelCaseToPascalCase } from "../util/camelCaseToPascalCase";

export const handleUpdateOne = async (
  sequelize: Sequelize,
  association: IAssociationBody<Array<Record<string, any>>>,
  model: { name: string; id: string },
  transaction: Transaction,
): Promise<void> => {
  const { model: associatedModelName, as, targetKey } = association.details;
  const associatedModelIdAttribute = sequelize.models[
    associatedModelName
  ].getAttributes()[targetKey]?.unique
    ? targetKey
    : sequelize.models[associatedModelName].primaryKeyAttribute;
  const associatedId =
    association.attributes?.[associatedModelIdAttribute] || null;

  const [modelInstance, associatedInstance] = await Promise.all([
    sequelize.models[model.name].findByPk(model.id, {
      transaction,
    }),
    associatedId
      ? sequelize.models[associatedModelName].findByPk(associatedId, {
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
        detail: `Payload must include an ID of an existing '${associatedModelName}'.`,
        pointer: `/data/relationships/${as}/data/id`,
      }),
    ];
  }

  const setter = `set${as ? camelCaseToPascalCase(as) : associatedModelName}`;
  await modelInstance[setter](associatedId, {
    transaction,
  });
};

export const handleUpdateMany = async (
  sequelize: Sequelize,
  association: IAssociationBody<Array<Record<string, any>>>,
  model: { name: string; id: string },
  transaction: Transaction,
): Promise<void> => {
  const { model: associatedModelName, as, targetKey } = association.details;
  const associatedModelIdAttribute = sequelize.models[
    associatedModelName
  ].getAttributes()[targetKey]?.unique
    ? targetKey
    : sequelize.models[associatedModelName].primaryKeyAttribute;
  const associatedIds = association.attributes.map(
    (data) => data[associatedModelIdAttribute],
  );
  const [modelInstance, associatedInstances] = await Promise.all([
    sequelize.models[model.name].findByPk(model.id, {
      transaction,
    }),
    associatedIds.length
      ? sequelize.models[associatedModelName].findAll({
          where: { [associatedModelIdAttribute]: { [Op.in]: associatedIds } },
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
          ({ dataValues: { [associatedModelIdAttribute]: id } }) =>
            id === associatedId,
        )
          ? acc
          : [
              ...acc,
              new NotFoundError({
                detail: `Payload must include an ID of an existing '${associatedModelName}'.`,
                pointer: `/data/relationships/${pluralize(
                  as,
                )}/data/${index}/id`,
              }),
            ],
      [],
    );
  }

  const setter = `set${pluralize(
    as ? camelCaseToPascalCase(as) : associatedModelName,
  )}`;
  await modelInstance[setter](associatedInstances, {
    transaction,
  });
};
