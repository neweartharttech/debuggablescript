import { MongoClient } from 'mongodb';

const _uri =
  process.env.MONGO_CONNECTION || 'mongodb://localhost/?directConnection=true';

const main = async () => {
  console.log('App started pass 2 prod');

  const _connection = new MongoClient(_uri);
  const database = _connection.db('colourbox_artdb');

  const collection = database.collection('artworks');

  const found = await collection
    .find({ details: { $not: { $exists: 1 } } })
    .limit(50)
    .toArray();

  if (found.length === 0) {
    console.log('No more docs');
    return;
  } else {
    console.log(`found ${found.length} is the pass`);
  }

  const done = await Promise.all(found.map((doc) => {
    var details: any = {};

    details.artistSpecificId = doc.artistSpecificId;
    details.images = doc.images;
    details.label = doc.label;
    details.description = doc.description;
    details.material = doc.material;
    details.year = doc.year;
    details.medium = doc.medium;
    details.originalSize = doc.originalSize;
    details.originalPrice = doc.originalPrice;
    details.NftPrice = doc.NftPrice;
    details.saleDetails = doc.saleDetails;
    details.altImagesURLs = doc.altImagesURLs;
    details.rating = doc.rating;
    details.optionalFields = doc.optionalFields;
    details.keywords = doc.keywords;
    details.sellMerchandise = doc.sellMerchandise;

    return collection.updateOne(
      { _id: doc._id },
      {
        $set: { details: details },
      }
    );
  }));

  console.log(`updated ${done.length} documents`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
