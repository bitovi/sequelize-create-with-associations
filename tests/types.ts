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
  id2?: CreationOptional<number>;
  nonDefaultSkillId?: CreationOptional<number>;
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
  id?: CreationOptional<number>;
  id1?: CreationOptional<number>;
  nonDefaultUserId?: CreationOptional<number>;
  name: string;
  age: number;
  skills?: Array<Partial<SkillModel>>;
  associatedSkills?: Array<Partial<SkillModel>>;
  UserSkill?: { selfGranted: boolean };
  through?: { selfGranted: boolean };
}

export interface SingleSkillUserModel
  extends Model<
    InferAttributes<SingleSkillUserModel>,
    InferCreationAttributes<SingleSkillUserModel>
  > {
  id?: CreationOptional<number>;
  nonDefaultUserId?: CreationOptional<number>;
  name: string;
  age: number;
  skill?: Partial<SkillModel> | null;
}

export interface UserSkillModel
  extends Model<
    InferAttributes<UserSkillModel>,
    InferCreationAttributes<UserSkillModel>
  > {
  id?: CreationOptional<number>;
  id3?: CreationOptional<number>;
  id4?: CreationOptional<number>;
  nonDefaultUserSkillId?: CreationOptional<number>;
  selfGranted: boolean;
  userId?: CreationOptional<number>;
  skillId?: CreationOptional<number>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // eslint-disable-next-line
    interface Matchers<R, T = {}> {
      toEqualErrors<E = any>(expected: E): R;
    }
  }
}
