import { RequestHandler, Request } from 'express';
import passport from 'passport'; 
import { Strategy as LocalStrategy } from 'passport-local';
import crypto from 'crypto';
import { UserModel } from '../models/userModel';
import { User } from '../models/types/user';

passport.use(new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password'
}, (name, password, cb) => {
  UserModel.getUser(name).then(user => {
    if (!user) return cb(null, false, { message: 'Incorrect username or password.' });

    crypto.pbkdf2(password, Buffer.from(user.salt, 'hex'), 100000, 64, 'sha256', (err, derivedKey) => {
      if (err) return cb(err);

      if (!crypto.timingSafeEqual(Buffer.from(user.password, 'hex'), derivedKey)) {
        return cb(null, false, { message: 'Incorrect username or password.' });
      }
      return cb(null, user);
    });
  });
}));

passport.serializeUser((user, cb) => {
  process.nextTick(() => cb(null, { id: user.id, name: user.name }));
});

passport.deserializeUser((user, cb) => {
  process.nextTick(() => cb(null, user));
});

export class AuthController {
  static logout: RequestHandler = (req, res, next) => {
    req.logout(err => {
      if (err) return next(err);
      res.redirect('/');
    });
  }

  static login: RequestHandler = (req, res, next) => {
    return passport.authenticate('local', { failureRedirect: '/login', successRedirect: '/chats'})(req, res, next);
  }                                  

  static signup: RequestHandler = (req, res, next) => {
    const salt = crypto.randomBytes(16);
    crypto.pbkdf2(req.body.password, salt, 100000, 64, 'sha256', (err, derivedKey) => {
      let user = new User(req.body.username, derivedKey.toString('hex'), salt.toString('hex'));
      UserModel.saveUser(user).then(() => res.render('login', {message: 'You are signed up'})).catch(err => console.error(err));
    });
  }

  static authGuard :RequestHandler = (req, res, next) => {
    let authUrl = '/login';
    if (!req.isAuthenticated()) {
      req.session.message = 'You are not authenticated!';
      if (req.session)
        req.session.returnTo = req.originalUrl || req.url;
      
      return res.redirect(authUrl);
    }
    next();
  }

  static handleMessage(req :Request) {
    let message = { message: req.session.message || '' };
    if (req.session.message) req.session.message = '';
    return message;
  }
}