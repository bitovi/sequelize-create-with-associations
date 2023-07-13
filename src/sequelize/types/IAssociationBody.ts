import type { IAssociation } from "./IAssociation";

export interface IAssociationBody<T> {
  attributes: T;
  details: IAssociation;
}
