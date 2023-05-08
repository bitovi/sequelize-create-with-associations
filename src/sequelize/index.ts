import { Model, Sequelize, Options } from "sequelize";
import * as inflection from "inflection";
import {
  ScaffoldModel,
  SequelizeModelsCollection,
  ScaffoldSymbolModel,
  ScaffoldModelCollection,
} from "../types";
import { extendedSequelize } from "./extended";
import { Scaffold } from "..";
import { IAssociation, ICreateScaffoldModel } from "./types";
import { ScaffoldError } from "../error/errors";

export function buildScaffoldModelObject(
  models: SequelizeModelsCollection
): ScaffoldModelCollection {
  const names = Object.keys(models);

  const result: ScaffoldModelCollection = {};
  names.forEach((name) => {
    result[name] = models[name][ScaffoldSymbolModel];
  });
  return result;
}

export function createSequelizeInstance(
  scaffold: Scaffold,
  options?: Options
): Sequelize {
  const ScaffoldSequelize = extendedSequelize(scaffold);

  if (!options) {
    return new ScaffoldSequelize("sqlite::memory:", {
      logging: false,
    });
  }

  const sequelize: Sequelize = new ScaffoldSequelize(options);
  return sequelize;
}

export function convertScaffoldModels(
  sequelize: Sequelize,
  models: ScaffoldModel[]
): ICreateScaffoldModel {
  const primaryKeys: Record<string, string> = {};
  models.forEach((model) => {
    const temp = sequelize.define<Model<ScaffoldModel["attributes"]>>(
      model.name,
      model.attributes,
      {
        validate: model.validation || {},
        underscored: true,
        createdAt: false,
        updatedAt: false,
        freezeTableName: true,
      }
    );

    // GET THE PRIMARY KEY
    primaryKeys[model.name] = temp.primaryKeyAttribute;

    temp[ScaffoldSymbolModel] = model;
  });

  const associationsLookup: Record<string, Record<string, IAssociation>> = {};

  models.forEach((model) => {
    const relationships = ["belongsTo", "belongsToMany", "hasOne", "hasMany"];
    const associations: Record<string, IAssociation> = {};

    relationships.forEach((relationship) => {
      // For each relationship type, check if we have definitions for it:
      if (model[relationship]) {
        // Grab the array of targets and options
        model[relationship].forEach(({ target, options }) => {
          if (!target || !sequelize.models[target]) {
            throw new ScaffoldError(
              "Unknown Model association for " +
                model.name +
                " in " +
                relationship
            );
          }

          // Pull the models off sequelize.models
          const current = sequelize.models[model.name];
          const associated = sequelize.models[target];

          // Create the relationship
          current[relationship](associated, options);

          //Get association name for lookup
          let associationName = options.as;
          if (!associationName) {
            associationName = target.toLowerCase();
            if (relationship !== "hasOne" && relationship !== "belongsTo") {
              associationName = inflection.pluralize("target");
            }
          }

          // Add association details to a lookup for each model
          const modelAssociation = {
            type: relationship,
            model: target,
            key: options.foreignKey ?? `${target.toLowerCase()}_id`,
            joinTable:
              relationship === "belongsToMany"
                ? typeof options.through === "string"
                  ? options.through
                  : options.through.model
                : undefined,
          };
          associationsLookup[model.name] = {
            ...associationsLookup[model.name],
            [associationName]: modelAssociation,
          };
          associations[associationName] = modelAssociation;
        });
      }
    });
  });

  return {
    associationsLookup,
    models: sequelize.models as SequelizeModelsCollection,
  };
}
