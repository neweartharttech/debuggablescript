import { Client } from '@hubspot/api-client';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/contacts';
import { AssociationSpecAssociationCategoryEnum } from '@hubspot/api-client/lib/codegen/crm/objects/notes';
import {
  PropertyCreate,
  PropertyCreateFieldTypeEnum,
  PropertyCreateTypeEnum,
  
} from '@hubspot/api-client/lib/codegen/crm/properties';

const clrbx_object_id_link='clrbx_object_id_link';
const db_artist_status ='db_artist_status';

const clrBxFields: PropertyCreate[] = [
  {
    name: clrbx_object_id_link,
    groupName: 'contactinformation',
    label: 'clrbx link',
    type: PropertyCreateTypeEnum.String,
    fieldType: PropertyCreateFieldTypeEnum.Text,
    hasUniqueValue: true,
    description: 'Artist URL in ClrBox'
  },
  {
    name: 'db_artist_status',
    groupName: 'contactinformation',
    label: 'artist status',
    description: 'Artist Status ClrBox',
    type: PropertyCreateTypeEnum.Enumeration,
    fieldType: PropertyCreateFieldTypeEnum.Select,
    options: [
      {
        hidden: false,
        displayOrder: 3,
        label: 'Artist in good standing',
        value: 'artist-good-standing',
      },
      {
        hidden: false,
        displayOrder: 4,
        label: 'Artist need attention',
        value: 'artist-needs-attention',
      },
    ],
  },
];

type CreateOrUpdateContactReq = {email:string, name: string, link:string};

export class HubSpotUtils {
  private hubSpotClient: Client;

  constructor() {
    const token = process.env.MY_HUBSPOT_TOKEN;
    if (!token) throw new Error('MY_HUBSPOT_TOKEN env missing');

    this.hubSpotClient = new Client({ accessToken: token });
  }

  async ensureFields() {
    await Promise.all(clrBxFields.map(async (f) => {
      let fieldOneExists = false;

      try {
        const prop = await this.hubSpotClient.crm.properties.coreApi.getByName(
          'contacts',
          f.name
        );
        //console.log('prop is', JSON.stringify(prop));
        fieldOneExists = true;
      } catch (error) {
        if (error.code === 404) {
          console.log('HubSpotUtils:ensureFields need to create field ', f.name);
        } else {
          throw error;
        }
      }

      if (!fieldOneExists) {
        await this.hubSpotClient.crm.properties.coreApi.create(
          'contacts',f
        );

        console.log('HubSpotUtils:ensureFields field created ', f.name);
      }

      return true;
    }));
  }

  async updateContactStatus(req: CreateOrUpdateContactReq & {note:string}){
    const {note,...rest} = req;
    const contact = this.createOrUpdateContact(rest);

    await this.hubSpotClient.crm.objects.notes.basicApi.create({
      properties:{
       "hs_timestamp":new Date().toJSON(),
       "hs_note_body": note

      },
      associations:[{
        to:{id:(await contact).id},
        types:[{
          associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined,
          associationTypeId: 202
        }]
      }]
    })

  }

  async createOrUpdateContact({email, name, link}:CreateOrUpdateContactReq){

    const properties: {[key:string]:string} = {
      clrbx_object_id_link:link,
      db_artist_status: 'artist-needs-attention'
    };

    if(name){
      const [firstName, ...lastNames] = name.split(" ");
      properties["firstname"] = firstName;
      properties["lastname"] = (lastNames||[]).join(" ");
    }


    const found = await this.hubSpotClient.crm.contacts.searchApi.doSearch({
      filterGroups:[{
        filters:[{
          propertyName: "email",
          operator: FilterOperatorEnum.Eq,
          value: email
        }]
      },{
        filters:[{
          propertyName: "hs_additional_emails",
          operator: FilterOperatorEnum.ContainsToken,
          value: email
        }]
      }],
      limit:10,
      //after:"0",
      sorts: [],
      properties: []
    } as any);


    if(found.total > 0){
      //contact exists
      const contact=  found.results[0];

      await this.hubSpotClient.crm.contacts.basicApi.update(contact.id,{
        properties
      });

      console.log("contact email found updating ", email);
      return contact;
    }

    console.log("contact email not found creating new", email);

    properties["email"]= email;

    const created = await this.hubSpotClient.crm.contacts.basicApi.create({
      properties,
      associations:[]
    });

    return created;
  }

  async doHUbSpot() {
    console.log('Staring sync');

    const test = await this.hubSpotClient.crm.contacts.basicApi.getPage(
      10,
      undefined,
      ['email', 'firstname', 'lastname']
    );

    console.log('Got contact ', JSON.stringify(test.results, null, 2));

    console.log('Done sync');
  }
}
