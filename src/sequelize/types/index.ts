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
