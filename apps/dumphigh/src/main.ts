/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import express from 'express';
import * as path from 'path';
import { DbExporter } from './db-connect';

const app = express();

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/api', async (req, res) => {
  try {
    const exporter = new DbExporter();
    const ret = await exporter.dumpDb();

    if (ret.processStatus === 'completed') {
      res.download(ret.tmpFileName, 'highschool_chat_messages.sql');
      return;
    }

    res.send({ success: true, ret });
  } catch (ex) {
    console.error('FAILED req', ex);
    res.send({ success: false, message: ex.message || ex.toString() });
  }
});

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);
