import { NeMessageQ } from "@ne/lib-common-utils";

export async function consumeNewArtist(){

    const messageQ = new NeMessageQ({
        key:'newArtistSubscribed',
        qName:'hubSpotSync_newArtistSubscribed'
    });

    await messageQ.consume(msg=>{
        
        console.log("consumeNewArtist::consuming ", JSON.stringify(msg));

        if(msg.retryCount > 2){
            return;
        }

        throw new Error("I failed");
    });
}