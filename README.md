# portway-slackhook

a [Sails v1](https://sailsjs.com) application

An app to assist publishing Portway documents to Slack channels

Using Slack's incoming webhook feature, this app will format a Portway Document as a Slack message to post to a specified channel.

The Slack incoming webhook URL needs to be set, which can be done using Sails.js config options, including setting the environment variable `sails_custom__slackIncomingWebhookURL`

## Deploy to Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)