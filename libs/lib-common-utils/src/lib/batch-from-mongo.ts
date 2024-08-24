// This class batch reads from Mongo and does some processing

import { Filter, MongoClient } from 'mongodb';

type TDoc = {
    processedTags : Record<string,Date>;
}

export class ProcessFromMongo {
  private uri = process.env.MONGO_CONNECTION || 'mongodb://localhost';
  private connection = new MongoClient(this.uri);

  constructor(private config: {
    dbName : string;
    processTag : string;
    batchSize?: number
  }) {
    console.log('using connection ', this.uri);
  }

  private async batchProc(){
    const database = this.connection.db(this.config.dbName);
    const chatMessages = database.collection<TDoc>('chatmessages');

    const tagField  = `processedTags.${this.config.processTag}`;

    const filter: Filter<TDoc> = {};
    filter[tagField] = {$not:{$exists:true}};

    
    /*
        db.creatorProfiles.aggregate([{$match:{"details.name":"Bahar Acharjya"}},{$limit:3}]).pretty();

        db.creatorProfiles.aggregate([{$match:{"details.name":/Bahar/}},
            {$lookup:{from:"users",localField:"managedByUserIds",foreignField:"_id",as:"managers"}},   
            {$limit:3}]).pretty();

    */

    const messages= (await chatMessages
        .find(filter)
        .limit(this.config.batchSize||50)
        .toArray()) ;

        //do something with it
        const messageIds = messages.map((m) => m._id);

        const toSet: Record<string,Date> = {};
        toSet[tagField] = new Date();

        const done = await chatMessages.updateMany(
            { _id: { $in: messageIds } },
            { $set: toSet }
          );
  
          console.log('Done for count ', done.modifiedCount);
  
  }
}
