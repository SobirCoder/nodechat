import { Express } from 'express';
import _ from 'underscore';
import multer from 'multer';
import crypto from 'crypto';
import { FileModel } from '../models/fileModel';
import path from 'path';

function encrypt(text :string) {
  let iv = crypto.randomBytes(16),
      cipher = crypto.createCipheriv('aes-128-cbc','daf123#$%qweropf', iv),
      crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return {crypted, iv: iv.toString('hex')};
}

function decrypt(text :string, iv :string) {
  let decipher = crypto.createDecipheriv('aes-128-cbc','daf123#$%qweropf', Buffer.from(iv, 'hex')),
      dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}


export function file(app :Express) {
  var storage = multer.diskStorage({   
    destination: (req, file, cb) => {
      cb(null, './uploads/');
    }, 
    filename: (req, file, cb) => {
      file.actualName = file.originalname;
      let names = file.originalname.split('.'),
          ext = _.last(names);
      names.splice(names.length - 1, 1);
      cb(null, names.join('.').trim() + '_' + Date.now() + '.' + ext?.trim());
    }
  });
  
  const upload = multer({ storage });

  app.post('/file_upload', upload.single('file'), async (req, res) => {
    let crypt = encrypt(req.file.path),
        file_id = await FileModel.saveFile({ iv: crypt.iv, path: crypt.crypted, name: req.file.actualName });
    res.send({ file_id });
  });
  
  app.get('/file_download', async (req, res) => {
    let file :any = await FileModel.getFile(Number(req.query.file_id));
    res.download(path.join(__dirname, '..', decrypt(file.path, file.iv)), file.name);
  });
}