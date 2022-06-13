import { RequestHandler, Request } from 'express';
import { ChatModel } from '../models/chatModel';
import _ from 'underscore';
import { UserModel } from '../models/userModel';

export class ChatController {
  private static checkOnline(online_users :any[], user :any, key :string = 'user_id') {
    if (_.any(online_users, x => x.user_id == user[key]))
      user.status = 'online';
    else user.status = 'offline';
  }

  static chats(online_users :any[]) :RequestHandler {
    return async (req, res) => {
      let p2p_chats = await ChatModel.getP2PChats(Number(req.user.id));
      _.each(p2p_chats, x => this.checkOnline(online_users, x));
      res.render('chats', { p2p_chats, user: req.user });
    }
  }

  static p2p(online_users :any) :RequestHandler{
    return  async (req, res) => {
      let p2p_messages = await ChatModel.getP2PChat(Number(req.user.id), Number(req.params.peer_id)),
          peer_user = _.pick(await UserModel.getUserById(Number(req.params.peer_id)), 'id', 'name');
      this.checkOnline(online_users, peer_user, 'id');
      res.render('p2p', { p2p_messages, peer_user, user: req.user });
    }
  }

  static postSearch(online_users :any) :RequestHandler {
    return async (req, res)  => {
      let users = await ChatModel.searchUser(req.body.name);
      _.each(users, x => this.checkOnline(online_users, x, 'id'));
      res.json(users);
    }
  }

  static getSearch :RequestHandler = (req, res) => {
    res.render('search', { user: req.user });
  }
}