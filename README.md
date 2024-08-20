# This repo contains boilerplate code that can used to create debug-able  scripts hosted on k8 clusters

- look for code in branches boilerplate/*
  These branches are frozen and create a good start point


## Dev notes

https://jobandtalent.engineering/how-to-debug-dockerized-typescript-applications-in-vscode-a0c2357d1e0d

docker build -t testn -f dockerfile.adminscript .

### to start in debugger

yarn nx run adminscript:serve:development-brk

launch debugger from VSCode

test a change


### creating new from boilerplate
`yarn nx g remove adminscript-e2e`
`yarn nx g @nx/workspace:move --project adminscript --destination {NEW_PROJECT}`


