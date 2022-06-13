import { Express } from 'express';
import { Server as HttpServer} from 'http';
import { Server, Socket } from 'socket.io';
import _ from 'underscore';
import { ChatModel } from '../models/chatModel';
import { ChatController } from '../controllers/chatController';
import moment from 'moment';
import { AuthController } from './authController';

export function io(server :HttpServer, app :Express) {
  const io = new Server(server, {
    allowEIO3: true
  //   ,
  //   cors: {
  //     origin: "http://localhost:3000"
  // }
});

  const online_users :any[] = [];

  io.on('connection', (socket: Socket) => {
    socket.on('credentials', async (data) => {
      if (_.any(online_users, u => u.user_id == data.user_id)) {
        online_users.splice(_.findIndex(online_users, u => u.user_id == data.user_id), 1);
      }

      online_users.push({ socket_id: socket.id, user_id: data.user_id, page: data.page, peer_id: data.peer_id });
      io.sockets.emit('online', { user_id: data.user_id });
      let notifications = await ChatModel.getQueuedMsg(data.user_id);
      socket.emit('notifications', notifications);
    });

    socket.on('disconnect', (res) => {
      if (_.any(online_users, (x:any) => x.socket_id == socket.id)) {
        let idx = _.findIndex(online_users, (x:any) => x.socket_id == socket.id);
        io.sockets.emit('offline', (online_users[idx]).user_id);
        online_users.splice(idx, 1);
      }
    });

    socket.on('new_message', async (msg) => {
      let now = moment().format('DD.MM.YYYY HH:mm');
      let message_id = await ChatModel.saveMessage({ sender_id: msg.sender_id, receiver_id: msg.receiver_id, 
                                                    msg_type: msg.msg_type, msg: msg.msg?.replaceAll("'", "''"), file_id: msg.file_id });
      let receiver = _.find(online_users, u => u.user_id == msg.receiver_id);

      if (receiver) {
        socket.to(receiver.socket_id).emit('new_message', 
          { sender_id: msg.sender_id, sender_name: msg.sender_name, msg_type: msg.msg_type,
            msg: msg.msg, file_id: msg.file_id, file_name: msg.file_name, sent_at: now });
      }

      if (!(receiver && receiver.page == 'p2p' && receiver.peer_id == msg.sender_id)) {
        await ChatModel.saveQueue({ message_id, receiver_id: msg.receiver_id });
      }
    });

    socket.on('received', (msg) => {
      ChatModel.deleteQueue(msg.receiver_id, msg.sender_id);
    });
  });

  app.get('/', (req, res) => res.redirect('/chats'));

  app.get('/chats', AuthController.authGuard, ChatController.chats(online_users));

  app.get('/p2p/:peer_id', AuthController.authGuard, ChatController.p2p(online_users));

  app.post('/search', AuthController.authGuard, ChatController.postSearch(online_users));

  app.get('/search', AuthController.authGuard, ChatController.getSearch);
}