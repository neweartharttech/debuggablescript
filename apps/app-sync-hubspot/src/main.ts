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

  process.exit(0);
};



main().catch((err) => {
  console.error(err);
  process.exit(1);
});
