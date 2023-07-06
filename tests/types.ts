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
  userId?: number;
  user?: Partial<UserModel>;
  through?: { selfGranted: boolean };
  UserSkill?: { selfGranted: boolean };
  users?: Partial<UserModel[]>;
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
  UserSkill?: { selfGranted: boolean };
  through?: { selfGranted: boolean };
}

export interface SingleSkillUserModel
  extends Model<
    InferAttributes<SingleSkillUserModel>,
    InferCreationAttributes<SingleSkillUserModel>
  > {
  id: CreationOptional<number>;
  name: string;
  age: number;
  skill?: Partial<SkillModel> | null;
}

export interface UserSkillModel
  extends Model<
    InferAttributes<UserSkillModel>,
    InferCreationAttributes<UserSkillModel>
  > {
  id: CreationOptional<number>;
  selfGranted: boolean;
  userId: number;
  skillId: number;
}
