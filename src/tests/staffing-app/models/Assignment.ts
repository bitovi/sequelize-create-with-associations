import { ScaffoldModel, DataTypes } from "../../../types";

export const Assignment: ScaffoldModel = {
  name: "Assignment",
  attributes: {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: new Date(),
    },
    end_date: DataTypes.DATE,
  },
  belongsTo: [
    {
      target: "Role",
      options: { as: "role", foreignKey: "role_id" },
    },
    {
      target: "Employee",
      options: {
        as: "employee",
        foreignKey: "employee_id",
      },
    },
  ],
  belongsToMany: [
    {
      target: "Project",
      options: { as: "projects", through: { model: "Role" } },
    },
  ],
};
