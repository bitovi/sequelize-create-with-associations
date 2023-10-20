export interface IAssociation {
  type: string;
  sourceKey: string;
  targetKey: string;
  foreignKey: string;
  otherKey: string;
  model: string;
  joinTable?: string;
  as: string;
}
