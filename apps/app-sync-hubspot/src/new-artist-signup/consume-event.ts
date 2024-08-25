import { NeMessageQ } from "@ne/lib-common-utils";
import { messageQRoutingKey } from "./setup";

export async function consumeNewArtist(){

    const messageQ = new NeMessageQ({
        key:messageQRoutingKey,
        qName:'hubSpotSync_newArtistSubscribed'
    });

    await messageQ.consume(msg=>{
        
        console.log("consumeNewArtist::consuming ", JSON.stringify(msg));

        throw new Error("I failed");
    });
}