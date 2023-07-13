import { codes, statusCodes } from "../constants";
import { HatchifyError } from "./HatchifyError";
import type { HatchifyErrorOptions } from "./HatchifyError";

export class NotFoundError extends HatchifyError {
  constructor({
    detail,
    pointer,
  }: Pick<HatchifyErrorOptions, "detail" | "pointer">) {
    super({
      code: codes.ERR_NOT_FOUND,
      status: statusCodes.NOT_FOUND,
      title: "Resource not found.",
      detail,
      pointer,
    });
  }
}
