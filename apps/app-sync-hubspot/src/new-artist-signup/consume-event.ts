import { HubSpotUtils, NeMessageQ } from "@ne/lib-common-utils";
import { CreativeProfileWithManagers, messageQRoutingKey } from "./setup";

export async function consumeNewArtist(){

    const messageQ = new NeMessageQ<CreativeProfileWithManagers>({
        key:messageQRoutingKey,
        qName:'hubSpotSync_newArtistSubscribed'
    });

    const hubSpot = new HubSpotUtils();

    await hubSpot.ensureFields();

    await messageQ.consume(async msg=>{
        
        console.log("consumeNewArtist::consuming ", JSON.stringify(msg));

        if(msg.managers.length!==1){
            throw new Error("more then one manager");
        }

        await hubSpot.updateContactStatus({
            email: msg.managers[0].email,
            name: msg.details.name,
            link: `https://colourbox.io/artists/${msg._id}`,
            note: " CreateProfile created"
        })

    });
}