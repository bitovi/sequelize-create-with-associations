export { DataTypes, ModelValidateOptions, ModelAttributes } from "sequelize";

export type JSONObject = Record<string, unknown>;

export type JSONAnyObject = Record<string, any>;

export interface ModelFunctionsCollection<T> {
  [modelName: string]: T;
  "*": T;
  allModels: T;
}
