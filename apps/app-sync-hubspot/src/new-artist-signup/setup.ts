export const messageQRoutingKey = 'newArtistSubscribed';

export type CreativeProfileWithManagers = {
    _id: string;
    details:{
        name: string;
    }
    
    managers:{
        email: string;
    }[]
   
}