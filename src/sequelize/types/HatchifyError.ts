import { codes, statusCodes } from "../constants";

interface Source {
  pointer?: string;
  parameter?: string;
}

export interface HatchifyErrorOptions {
  pointer?: string;
  status: number;
  code: string;
  detail?: string;
  source?: Source;
  title?: string;
}

export class HatchifyError extends Error {
  status: number;
  code: string;
  title?: string;
  detail?: string;
  source?: Source;

  constructor({
    status = statusCodes.INTERNAL_SERVER_ERROR,
    code = codes.ERR_SERVER_ERROR,
    title = "Server Error ocurred",
    detail,
    pointer,
  }: HatchifyErrorOptions) {
    super();
    this.status = status;
    this.code = code;
    this.title = title;
    this.detail = detail;

    if (pointer) {
      this.source = { pointer };
    }
  }
}
