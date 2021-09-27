#!/usr/bin/env bash

source ./.env

echo SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}
echo SLACK_SIGNING_SECRET=${SLACK_SIGNING_SECRET}
echo SLACK_WORKSPACE=${SLACK_WORKSPACE}

if [ -n "$SLACK_BOT_TOKEN" ] && [ -n "$SLACK_SIGNING_SECRET" ] && [ -n "$SLACK_WORKSPACE" ] ; then
  export SLACK_BOT_TOKEN=$SLACK_BOT_TOKEN
  export SLACK_SIGNING_SECRET=$SLACK_SIGNING_SECRET
  export SLACK_WORKSPACE=$SLACK_WORKSPACE

  echo "[Start cdk deployment]"
  npx cdk deploy
  result=$?
  echo "[Change the Slack Event Subscriptions URL to the new API Gateway!!!]"
  exit $result
else
  echo "[Add the environment variable to .env]"
  exit 1
fi
