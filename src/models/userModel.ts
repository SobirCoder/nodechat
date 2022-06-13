import { DB } from './db/main';
import { User } from './types/user';

export class UserModel {
  static async saveUser(user :User) {
    await DB.callProcedure('save_user', user);
  }

  static async getUser(name: string) {
    let user = await DB.callFunction('get_user_by_name', { name });
    return new User(user.name, user.password, user.salt, user.id);
  }

  static async getUserById(id: number) {
    let user = await DB.callFunction('get_user_by_id', { id });
    return new User(user.name, user.password, user.salt, user.id);
  }
}