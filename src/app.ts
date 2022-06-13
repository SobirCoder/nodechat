import express from 'express';
import http from 'http';
import path from 'path';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import _ from 'underscore';
import csrf from 'csurf';
import passport, { authenticate } from 'passport';
import sqlite_connect from 'connect-sqlite3';
import AuthRouter from './routes/authRoutes';
import { io } from './controllers/socketControler';
import { file } from './controllers/fileController';

const SQLiteStore = sqlite_connect(session);

const app = express();
const server = http.createServer(app);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'sec',
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({ db: 'sessions.db', dir: './models/db' })
}));

// app.use(csrf());
app.use(passport.initialize());
app.use(passport.authenticate('session'));

app.use((req, res, next) => {
  res.locals.csrfToken = 'req.csrfToken()';
  // res.cookie('XSRF-TOKEN', res.locals.csrfToken);
  next();
});

app.use('/', AuthRouter);

io(server, app);
file(app);

server.listen(3000);