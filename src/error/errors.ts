export class ScaffoldError extends Error {
  constructor(message: string) {
    super();
    this.message = message;
  }
}
