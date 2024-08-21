import { MongoClient, ObjectId } from 'mongodb';
import tmp from 'tmp';
import fs, { promises as fsP } from 'fs';
import { escape as sqlEscape } from 'sqlstring';

const tmpFileName = tmp.tmpNameSync();

type ProcessStatus = 'started' | 'completed';

let processStartedAt: Date | undefined = undefined;

let processStatus: ProcessStatus | undefined = undefined;

type User = {
  _id: string;
  authCreds: {
    loginname: string;
  };
  profile: {
    displayName: string;
  };
};

export class DbExporter {
  private _uri = process.env.MONGO_CONNECTION || 'mongodb://localhost';
  private _connection = new MongoClient(this._uri);

  constructor() {
    console.log('using connection ', this._uri);
  }

  async dumpDb() {
    if (undefined === processStatus) {
      processStatus = 'started';
      processStartedAt = new Date();

      console.log('Process Started at ', processStartedAt);

      const status = await Promise.race([
        (async () => {
          await this.dumpDbInternal();

          processStatus = 'completed';

          return processStatus;
        })(),
        new Promise<ProcessStatus>((_, r) =>
          setTimeout(() => r('Process Started try again in few'), 1000 * 1)
        ),
      ]);
    }

    return {
      processStatus,
      tmpFileName,
      processStartedAt,
    };
  }

  private async dumpDbInternal() {
    console.log('Using tmp file ', tmpFileName);

    const fileExists = fs.existsSync(tmpFileName);

    var writer = fs.createWriteStream('log.txt', {
      flags: 'a', // 'a' means appending (old data will be preserved)
    });

    if (fileExists) {
      console.warn(`${tmpFileName} exists`);
    } else {
      console.log(`${tmpFileName} creating new`);
    }

    try {
      if (!fileExists) {
        const toWrite =
          'DROP TABLE IF EXISTS `chat_messages`;\n' +
          'CREATE TABLE `chat_messages` (\
    `id` varchar(100) NOT NULL,\
  `recipientId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,\
  `senderId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,\
  `sentAt` datetime NOT NULL,\
  `text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,\
  `sentLanguage` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,\
  `translated` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL\
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;\n';

        fsP.appendFile(tmpFileName, toWrite);
      }

      const database = this._connection.db('teeptalk');
      const chatMessages = database.collection('chatmessages');
      const usersDb = database.collection('users');

      const usersMap: { [id: string]: User } = {};

      for (let it = 0; true; it++) {
        console.log('pass >> ', it);

        const messages: {
          _id: string;
          metaData: {
            recepientId: string;
            senderId: string;
            sentAt: string;
          };
          data: {
            text: string;
            sentLanguage: string;
            translatedText: Record<string, string>;
          };
        }[] = (await chatMessages
          .find({ sqldumped: { $ne: tmpFileName } })
          .limit(50)
          .toArray()) as any;

        if (messages.length === 0) {
          console.log('All messages are done');
          break;
        }

        const messageIds = messages.map((m) => m._id);

        const senderIds = messages.map((m) => m.metaData.senderId);
        const receptIds = messages.map((m) => m.metaData.recepientId);

        const allUserId = [...senderIds, ...receptIds];
        //console.log('All users ', JSON.stringify(allUserId));

        const loadedUserIds = Object.keys(usersMap);

        const usersToGet = allUserId.filter(
          (id) => !loadedUserIds.includes(id)
        );

        //console.log('usersToGet ', JSON.stringify(usersToGet));

        const foundUsers: User[] = (await usersDb
          .find({ _id: { $in: usersToGet.map((id) => new ObjectId(id)) } })
          .toArray()) as any;

        //console.log("foundUsers ", JSON.stringify(foundUsers,null,2));

        foundUsers.forEach((u) => (usersMap[u._id] = u));

        //console.log("usersMap ", JSON.stringify(usersMap,null,2));

        const sqlLines = messages.map((m) => {
          const recipientId =
            usersMap[m.metaData.recepientId]?.authCreds?.loginname;

          if (!recipientId) {
            /*console.warn(
              `missing user ${m.metaData.recepientId} ::`,
              JSON.stringify(usersMap[m.metaData.recepientId])
            );*/
          }

          const senderId = usersMap[m.metaData.senderId]?.authCreds?.loginname;

          if (!senderId) {
            /*console.warn(
              `missing user ${m.metaData.senderId} ::`,
              JSON.stringify(usersMap[m.metaData.senderId])
            );*/
          }

          /*
                    INSERT INTO `chat_messages` (`id`, `recipientId`, `senderId`, `sentAt`, `text`, `sentLanguage`, `translated`) VALUES
                    ('dddsd',	'asdsad',	'sddsd',	'2020-11-25 01:47:39',	'dsdsds',	'ss',	'sdsdsds');
                    */

          const toSend =
            'INSERT INTO `chat_messages` (`id`, `recipientId`, `senderId`, `sentAt`, `text`, `sentLanguage`, `translated`) VALUES' +
            `(${sqlEscape(m._id.toString())},	${sqlEscape(
              recipientId || ''
            )},	${sqlEscape(senderId || '')}, ${sqlEscape(
              m.metaData?.sentAt || ''.replace('T', ' ').replace('Z', ' ')
            )} ` +
            `, ${sqlEscape(m.data?.text || '')} , ${sqlEscape(
              m.data?.sentLanguage || ''
            )},	${sqlEscape(JSON.stringify(m.data?.translatedText || {}))});`;

          return toSend;
        });

        //console.log("TYE LINE \n", sqlLines.join("\n") );

        fsP.appendFile(tmpFileName, sqlLines.join('\n') + '\n');

        const done = await chatMessages.updateMany(
          { _id: { $in: messageIds.map((id) => new ObjectId(id.toString())) } },
          { $set: { sqldumped: tmpFileName } }
        );

        console.log('Done for count ', done.modifiedCount);

        /*
        if (it > 3) {
          break;
        }
          */
      }

      console.log('Completed in tmp file ', tmpFileName);
    } finally {
      writer.end();
    }
  }
}
