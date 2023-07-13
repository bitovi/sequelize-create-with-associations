import { codes, statusCodes } from "../constants";
import { HatchifyError } from "./HatchifyError";
import type { HatchifyErrorOptions } from "./HatchifyError";

export class UnexpectedValueError extends HatchifyError {
  constructor({ detail }: Pick<HatchifyErrorOptions, "detail">) {
    super({
      code: codes.ERR_UNEXPECTED_VALUE,
      status: statusCodes.BAD_REQUEST,
      title: "Unexpected Value.",
      detail,
    });
  }
}
