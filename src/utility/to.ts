export default function to(promise: Promise<any>) {
  return promise.then((result) => {
    return new AsyncResult(null, result);
  })
  .catch((error) => {
    return new AsyncResult(error, null);
  });
}

export class AsyncResult {
  public error: any;
  public result: any;

  constructor(error: any, result: any) {
    this.error = error;
    this.result = result;
  }
}
