import { Sequelize } from "sequelize";

import {
  ScaffoldModel,
  ScaffoldModelCollection,
  ScaffoldOptions,
  SequelizeModelsCollection,
} from "./types";
import {
  convertScaffoldModels,
  createSequelizeInstance,
  buildScaffoldModelObject,
} from "./sequelize";

import { IAssociation } from "./sequelize/types";
import { ScaffoldError } from "./error/errors";

/**
 * Parse can be imported from the `@bitovi/scaffold` package
 *
 * This function provides direct access to the querystring parsing and validation of Scaffold without
 * needing to create a Scaffold instance. You can use a Scaffold Model directly along with your querystring
 * and the Parse function will return the underlying ORM query options.
 *
 * @param {ScaffoldModel} model The Scaffold Model to use for validation, attributes, relationships, etc
 * @returns {ModelFunctionsCollection<ParseFunctions>}
 */
// export function Parse(model: ScaffoldModel) {
//   return buildParserForModelStandalone(model);
// }

/**
 * Serialize can be imported from the `@bitovi/scaffold` package
 *
 * This function provides direct access to the result serializer Scaffold without
 * needing to create a Scaffold instance. You can use a Scaffold Model directly along with your data
 * and the Serialize function will return a valid JSON:API serialized version.
 *
 * @param {ScaffoldModel} model The Scaffold Model to use for validation, attributes, relationships, etc
 * @returns {ModelFunctionsCollection<SerializeFunctions>}
 */
// export function Serialize(model: ScaffoldModel) {
//   return buildSerializerForModelStandalone(model);
// }

export class Scaffold {
  private _sequelizeModels: SequelizeModelsCollection;
  private _sequelize: Sequelize;

  // this is a lookup that shows all associations for each model.
  associationsLookup: Record<string, Record<string, IAssociation> | undefined>;

  /**
   * Creates a new Scaffold instance
   *
   * @param {ScaffoldModel[]} models An array of Scaffold Models
   * @param {ScaffoldOptions} options Configuration options for Scaffold
   *
   * @return {Scaffold}
   */
  constructor(models: ScaffoldModel[], options: ScaffoldOptions = {}) {
    // Prepare the ORM instance and keep references to the different Models
    this._sequelize = createSequelizeInstance(this, options.database);

    // Fetch the scaffold models and associations look up
    const { associationsLookup, models: sequelizeModels } =
      convertScaffoldModels(this._sequelize, models);

    this.associationsLookup = associationsLookup;
    this._sequelizeModels = sequelizeModels;
  }

  /**
   * Returns the raw Sequelize instance directly
   * @hidden
   */
  get orm(): Sequelize {
    return this._sequelize;
  }

  /**
   * The `model` export is one of the primary tools provided by Scaffold for working
   * with your Models in custom routes.
   *
   * From the `model` export you can target one of your Models by name which will
   * give you further access to a number of named functions
   *
   *
   * @returns {SequelizeModelsCollection}
   * @category General Use
   */
  get model(): SequelizeModelsCollection {
    return this._sequelizeModels;
  }

  /**
   * Returns an object mapping model names to Scaffold models
   * @hidden
   */
  get models(): ScaffoldModelCollection {
    return buildScaffoldModelObject(this._sequelizeModels);
  }

  /**
   * Create a Error Result
   *
   * @param {ScaffoldError} options
   * @returns { ScaffoldError}
   */
  static createError(message): ScaffoldError {
    return new ScaffoldError(message);
  }

  /**
   * Note: This function should primarily be used for test cases.
   *
   * The `createDatabase` function is a destructive operation that will
   * sync your defined models to the configured database.
   *
   * This means that your database will be dropped and its schema
   * will be overwritten with your defined models.
   *
   * @returns {Promise<Sequelize>} Sequelize Instance
   * @category Testing Use
   */
  async createDatabase(): Promise<Sequelize> {
    return this._sequelize.sync({});
  }
}

export const Error = ScaffoldError;
