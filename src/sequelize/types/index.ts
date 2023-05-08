import { SequelizeModelsCollection } from "../../types";

export interface IAssociation {
  type: string;
  key: string;
  model: string;
  joinTable?: string;
}

export interface ICreateScaffoldModel {
  models: SequelizeModelsCollection;
  associationsLookup: Record<string, Record<string, IAssociation>>;
}

export interface IAssociationBody<T> {
  attributes: T;
  details: IAssociation;
}
