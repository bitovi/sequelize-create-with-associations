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

export class ValidationError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ValidationError";
  }
}
