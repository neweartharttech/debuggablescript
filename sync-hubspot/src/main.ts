import { Client } from "@hubspot/api-client";

const main = async () => {
  console.log('Staring sync');

  const token = process.env.MY_HUBSPOT_TOKEN;
  if(!token)
    throw new Error("MY_HUBSPOT_TOKEN env missing")

  const hubspotClient = new Client({ accessToken: token });


  const test = await hubspotClient.crm.contacts.basicApi.getPage(10,undefined,[
    "email","firstname","lastname"
  ]);

  console.log("Got contact ", JSON.stringify(test.results,null, 2));

  console.log('Done sync');
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
