import { Client } from '@hubspot/api-client';
import { taskStarter, waitWithHeartBeat } from '@ne/lib-common-utils';
import { consumeNewArtist } from './new-artist-signup/consume-event';
import { loadNewSignUpsFromDb } from './new-artist-signup/read-from-db';


const main = async () => {

  await taskStarter({
    "consumeNewArtistSignup":async () =>{
      console.log(" starting consumeNewArtistSignup")
      await consumeNewArtist();
      await waitWithHeartBeat("consumeNewArtistSignup");
    },
    "getNewArtistSignUps":loadNewSignUpsFromDb
  });

  // await doHUbSpot();
  process.exit(0);
};

async function doHUbSpot(){
  console.log('Staring sync');

  const token = process.env.MY_HUBSPOT_TOKEN;
  if (!token) throw new Error('MY_HUBSPOT_TOKEN env missing');

  const hubspotClient = new Client({ accessToken: token });

  const test = await hubspotClient.crm.contacts.basicApi.getPage(
    10,
    undefined,
    ['email', 'firstname', 'lastname']
  );

  console.log('Got contact ', JSON.stringify(test.results, null, 2));

  console.log('Done sync');

}


main().catch((err) => {
  console.error(err);
  process.exit(1);
});
