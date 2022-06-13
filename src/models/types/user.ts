export class User {
  constructor(public name: string, public password: string, public salt: string, public id?: number) {}
}