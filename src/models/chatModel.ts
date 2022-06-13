import { DB } from './db/main';

export class ChatModel {
  static async saveMessage(message :any) {
    let message_id = await DB.callFunction('save_message', message);
    return message_id;
  }

  static async saveQueue(queue :any) {
    await DB.callProcedure('save_queue', queue);
  }

  static async deleteQueue(receiver_id :number, sender_id :number) {
    await DB.callProcedure('delete_queue', { receiver_id, sender_id });
  }

  static async getQueuedMsg(receiver_id :number) {
    let messages = await DB.callFunction('get_queued_msg', { receiver_id });
    return messages;
  }

  static async getP2PChats(user_id :number) {
    let chats = await DB.callFunction('get_p2p_chats', { user_id });
    return chats;
  }

  static async getP2PChat(user_id :number, peer_user_id :number) {
    let chats = await DB.callFunction('get_p2p_chat', { user_id, peer_user_id });
    return chats;
  }

  static async searchUser(name :string) {
    let users = await DB.callFunction('search_user', { name });
    return users;
  }
}