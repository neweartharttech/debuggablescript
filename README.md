# This repo contains boilerplate code that can used to create debug-able  scripts hosted on k8 clusters

## branch strategies

1. boilerplate/*
- Different boilerplate code that we can branch out of
  look for code in branches boilerplate/*
  These branches are frozen and create a good start point

2. release-****
- living release branches probably with CI/CD built in, that is getting deployed at different places

3. prod-hot-fix/*****
- script used to create admin changes to DB to certain work. They might just be run locally


## Dev notes

https://jobandtalent.engineering/how-to-debug-dockerized-typescript-applications-in-vscode-a0c2357d1e0d

docker build -f Dockerfile.release-sync-hubspot -t test1 --platform linux/amd64 .  

node dist/apps/app-sync-hubspot/main.js consumeNewArtistSignup

### to start in debugger

yarn nx run adminscript:serve:development-brk

launch debugger from VSCode

test a change

# Create new app in the project
`yarn nx g application app-update-clrbx-mongo`

# creating brand new workspace from boilerplate
`yarn nx g remove adminscript-e2e`
`yarn nx g @nx/workspace:move --project adminscript --destination {NEW_PROJECT}`








