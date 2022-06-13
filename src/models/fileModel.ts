import { DB } from './db/main';

export class FileModel {
  static async saveFile(file :any) {
    return await DB.callFunction('save_file', file);
  }

  static async getFile(file_id :number) {
    return await DB.callFunction('get_file', { file_id });
  }
}