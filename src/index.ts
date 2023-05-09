import { IAssociation } from "./sequelize/types";

type AssociationLookup = Record<string, Record<string, IAssociation>>

let associationsLookup: undefined |  AssociationLookup ;

function calculateAssociationProp(associations) {
  const result = [];

  Object.keys(associations).forEach((key) => {
    const association = {};
    if (associations[key].hasOwnProperty('options')) {
      const {
        associationType,
        target,
        foreignKey,
        throughModel
      } = associations[key];
      association[key] = {
        type: associationType,
        key: foreignKey,
        model: target,
        joinTable: throughModel 
      };
    }
    result.push(association);
  });

  return result;
}

function getLookup(sequelize): AssociationLookup {
  if(!associationsLookup) {
    let lookup: any = {};
    const models = sequelize.models;
    const modelKeys = Object.keys(models);
    modelKeys.forEach(key => {
      const associations = calculateAssociationProp(models[key].associations);
      lookup[key] = associations;
    });
    associationsLookup = lookup;
  }
  return associationsLookup;
}


export const extendSequelize = async (SequelizeClass: any) => {
  const originalFindOne = SequelizeClass.Model.findOne;

  SequelizeClass.Model.findOne = function (...args) {
    // to get the sequelize instance
    const {
      sequelize
    } = this.options;

    const associationsLookup = getLookup(sequelize);

    return originalFindOne.apply(this, [...args]);
  };
};
