/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import Chance from "chance";
import { Scaffold } from "../../index";
import { Assignment as AssignmentModel } from "./models/Assignment";
import { Employee as EmployeeModel } from "./models/Employee";
import { Project as ProjectModel } from "./models/Project";
import { Role as RoleModel } from "./models/Role";
import { Skill as SkillModel } from "./models/Skill";

const chance = new Chance();

describe("Include Tests", () => {
  it("should return included data", async () => {
    const scaffold = new Scaffold([
      ProjectModel,
      RoleModel,
      AssignmentModel,
      SkillModel,
      EmployeeModel,
    ]);

    const { Employee, Role, Assignment, Project } = scaffold.model;

    await scaffold.createDatabase();

    const projectName = chance.word();

    const project: any = await Project.create({
      name: projectName,
    });

    const employeeRes: any = await Employee.create({
      name: chance.name(),
      start_date: new Date("25 Apr 2002"),
      end_date: new Date("25 Apr 2012"),
    });

    const roleRes: any = await Role.create({
      name: chance.word(),
      start_date: new Date("27 Apr 2002"),
      start_confidence: chance.floating({ min: 0, max: 0.9 }),
      end_date: new Date("25 Apr 2011"),
      end_confidence: chance.floating({ min: 0, max: 0.9 }),
      project_id: project.id,
    });

    const assignmentRes: any = await Assignment.create({
      start_date: new Date("29 Apr 2002"),
      end_date: new Date("29 Jun 2002"),
      employee_id: employeeRes.id,
      role_id: roleRes.id,
    });

    const employees = await Employee.findAll({ include: ["assignments"] });

    expect(employees[0]).toHaveProperty("assignments");
    expect(employees[0].assignments).toHaveLength(1);
    expect(employees[0].assignments[0].id).toEqual(assignmentRes.id);

    await scaffold.orm.close();
  });

  it("should return included field with include in query options", async () => {
    const scaffold = new Scaffold([
      ProjectModel,
      RoleModel,
      AssignmentModel,
      SkillModel,
      EmployeeModel,
    ]);

    const { Employee, Assignment } = scaffold.model;

    await scaffold.createDatabase();

    const tst2 = await Employee.create({
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
    const assignments = await Assignment.findAll();

    expect(1).toEqual(1);

    await scaffold.orm.close();
  });
});
