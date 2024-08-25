export const messageQRoutingKey = 'newArtistSubscribed';

export type CreativeProfileWithManagers = {
    _id: string;
    name: string;
    
    managers:{
        email: string;
    }[]
   
}