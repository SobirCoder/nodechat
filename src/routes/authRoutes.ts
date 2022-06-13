import Router from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();
router.get('/login', (req, res, next) => { 
  if (req.isAuthenticated()) return res.redirect('/chats');
  res.render('login', AuthController.handleMessage(req)); 
});
router.post('/login', AuthController.login);

router.get('/signup', (req, res, next) => { 
  if (req.isAuthenticated()) return res.redirect('/chats');
  res.render('signup', AuthController.handleMessage(req));
});
router.post('/signup', AuthController.signup);


export default router;