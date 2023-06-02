import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  Model,
} from "sequelize";

export interface SkillModel
  extends Model<
    InferAttributes<SkillModel>,
    InferCreationAttributes<SkillModel>
  > {
  id?: CreationOptional<number>;
  name: string;
  user?: Partial<UserModel>;
}

export interface UserModel
  extends Model<
    InferAttributes<UserModel>,
    InferCreationAttributes<UserModel>
  > {
  id: CreationOptional<number>;
  name: string;
  age: number;
  skills?: Array<Partial<SkillModel>>;
}

export interface SingleSkillUserModel
  extends Model<
    InferAttributes<SingleSkillUserModel>,
    InferCreationAttributes<SingleSkillUserModel>
  > {
  id: CreationOptional<number>;
  name: string;
  age: number;
  skill?: Partial<SkillModel>;
}

export interface UserSkillModel
  extends Model<
    InferAttributes<UserSkillModel>,
    InferCreationAttributes<UserSkillModel>
  > {
  id: CreationOptional<number>;
  selfGranted: boolean;
  user?: UserModel;
}
