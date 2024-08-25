// This class batch reads from Mongo and does some processing

import { Filter, MongoClient } from 'mongodb';

type TDoc = {
  _id: string;
  processedTags?: Record<string, Date>;
};

export class ProcessFromMongo {
  private uri =
    process.env.MONGO_CONNECTION ||
    'mongodb://localhost:27017/?directConnection=true';
  private connection = new MongoClient(this.uri);

  constructor(
    private config: {
      dbName: string;
      processTag: string;
      collectionName: string;
      batchSize?: number;
    }
  ) {
    console.log('using connection ', this.uri);
  }

  async batchProc<T extends TDoc>(
    callback: (batch: T[]) => Promise<void>,
    lookup?: any[],
    pass?: number
  ) {
    const database = this.connection.db(this.config.dbName);
    const collection = database.collection<TDoc>(this.config.collectionName);

    console.log('batchProc Pass >', pass || 0);

    const tagField = `processedTags.${this.config.processTag}`;

    const filter: Filter<TDoc> = {};
    filter[tagField] = { $not: { $exists: true } };

    /*
        db.creatorProfiles.aggregate([{$match:{"details.name":"Bahar Acharjya"}},{$limit:3}]).pretty();

        db.creatorProfiles.aggregate([{$match:{"details.name":/Bahar/}},
            {$lookup:{from:"users",localField:"managedByUserIds",foreignField:"_id",as:"managers"}},   
            {$limit:3}]).pretty();

        const lookup = {
                $lookup: {
                  from: 'users',
                  localField: 'managedByUserIds',
                  foreignField: '_id',
                  as: 'managers',
                },
              };
    */

    let pipeline: any[] = [{ $match: filter }];

    if (lookup) {
      pipeline = [...pipeline, ...lookup];
    }

    pipeline = [...pipeline, { $limit: this.config.batchSize || 50 }];

    const messages: T[] = (await collection
      .aggregate(pipeline)
      .toArray()) as T[];

    if (messages.length === 0) {
      console.log('batchProc batch length 0');
      return;
    }

    await callback(messages);

    //do something with it
    const messageIds = messages.map((m) => m._id);

    const toSet: Record<string, Date> = {};
    toSet[tagField] = new Date();

    const done = await collection.updateMany(
      { _id: { $in: messageIds } },
      { $set: toSet }
    );

    console.log('Done for count ', done.modifiedCount);

    await this.batchProc(callback, lookup, (pass || 0) + 1);
  }
}
