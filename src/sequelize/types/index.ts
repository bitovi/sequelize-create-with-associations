export interface IAssociation {
  type: string;
  key: string;
  model: string;
  joinTable?: string;
}

export interface IAssociationBody<T> {
  attributes: T;
  details: IAssociation;
}

export type JSONAnyObject = Record<string, any>;
