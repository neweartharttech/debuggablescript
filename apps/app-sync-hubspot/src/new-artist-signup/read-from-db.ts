import { NeMessageQ, ProcessFromMongo } from '@ne/lib-common-utils';
import { messageQRoutingKey, CreativeProfileWithManagers } from './setup';

export async function loadNewSignUpsFromDb() {
  const messageQ = new NeMessageQ<CreativeProfileWithManagers>({
    key: messageQRoutingKey,
  });

  await messageQ.init();

  const proc = new ProcessFromMongo({
    dbName: 'colourbox_artdb',
    processTag: 'hubspotSync_addedToQ',
    collectionName: 'creatorProfiles',
  });

  /*

    db.creatorProfiles.aggregate([{$match:{"details.name":/Bahar/}},
            {$lookup:{from:"users",localField:"managedByUserIds",foreignField:"_id",as:"managers"}},   
            {$limit:3}]).pretty();

  */

  await proc.batchProc<CreativeProfileWithManagers>(async (batch) => {

    await Promise.all(batch.map(b=>messageQ.publish(b)))

  }, [{
    $lookup: {
      from: 'users',
      localField: 'managedByUserIds',
      foreignField: '_id',
      as: 'managers',
    },
  },{
    $project:{
        _id:1,
        name:1,
        "managers.email":1
    }
  }]);
}
