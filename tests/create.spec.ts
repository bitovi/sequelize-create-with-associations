/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import Chance from "chance";
import { Assignment as AssignmentModel } from "./models/Assignment";
import { Employee as EmployeeModel } from "./models/Employee";
import { Project as ProjectModel } from "./models/Project";
import { Role as RoleModel } from "./models/Role";
import { Skill as SkillModel } from "./models/Skill";
import { Scaffold } from "../src";

import Sequelize from "sequelize";

describe("Include Tests", () => {
  it("should return included field with include in query options", async () => {
    const scaffold = new Scaffold([
      ProjectModel,
      RoleModel,
      AssignmentModel,
      SkillModel,
      EmployeeModel,
    ]);

    const { Employee } = scaffold.model;

    await scaffold.createDatabase();

    await Employee.create({
      name: "Roy",
      assignments: [
        {
          start_date: "22 Apr 2002",
        },
        {
          start_date: "04 Apr 2003",
        },
      ],
    });

    const employees = await Employee.findAll({ include: ["assignments"] });

    expect(employees).toHaveLength(1);
    expect(employees[0]).toHaveProperty("assignments");
    expect(employees[0].assignments).toHaveLength(2);

    expect(employees[0].assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          start_date: new Date("22 Apr 2002"),
          end_date: null,
        }),
        expect.objectContaining({
          start_date: new Date("04 Apr 2003"),
          end_date: null,
        }),
      ])
    );

    await scaffold.orm.close();
  });
});
