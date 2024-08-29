# Local dev

export MY_HUBSPOT_TOKEN=XXXX
docker-compose up -d mongo rabbitmq

yarn nx run app-sync-hubspot:serve:development --args="consumeNewArtistSignup"

yarn nx run app-sync-hubspot:serve:development --args="getNewArtistSignUps"

- To run with break point

yarn nx run app-sync-hubspot:serve:development-brk
start debug from visual studio code


# creating hubspot private app

- create private app using settings
  https://developers.hubspot.com/docs/api/private-apps

- needs scopes
  crm.lists read/write
  crm.schemas.contacts read/write


# triggering manually

kubectl -n ne-admin-scripts create job --from=cronjob/sync-hubspot-load-newsignups sync-hubspot-load-newsignups-manual-001

- test payload to check if consumer is working

{"payload":{"_id":"3a8e84bd-ad53-464a-a741-901371435cbc","details":{"name":"riya"},"managers":[{"email":"riyathena@gmail.com"}]}}

# notes

https://developers.hubspot.com/docs/api/crm/contacts

db.creatorProfiles.updateMany({},{$unset:{processedTags:1}});
