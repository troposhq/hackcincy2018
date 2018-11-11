const Alexa = require('ask-sdk');

var AWS = require('aws-sdk');

const config = {
  region: "us-east-1",
  endpoint: process.env.ENDPOINT,
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
}

let dynamo = new AWS.DynamoDB.DocumentClient(config);

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = 'To hear available metrics, ask Alexa: tell me my metrics';
    return handlerInput.responseBuilder
    .speak(speechText)
    .reprompt(speechText)
    .withSimpleCard('Welcome', speechText)
    .getResponse();
  },
};

// The primary intent handler for responding with Business insights
const MetricsIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'WhatsMyMetric';
  },
  async handle(handlerInput) {
    // TODO: they use an env var for slotname in the sample
    const {
      intent
    } = handlerInput.requestEnvelope.request;
    const {
      slots
    } = intent;
    const slotName = 'metric';
    const slotValue = slots[slotName].value;

    const responses = {
      'NEW USERS': (metric) => `You have had ${metric} new users join this week.`,
        'USERS': (metric) => `The total number of users is ${metric}.`,
        'SESSION LENGTH PER USER': (metric) => `The average session per user is ${metric} seconds.`,
        'PERCENT NEW SESSIONS': (metric) => `The percent of new sessions is ${metric}.`,
    }

      const slotMetrics = {
        'SESSION LENGTH PER USER': 'ga:sessionsperuser',
        'PERCENT NEW SESSIONS': 'ga"percentnewsessions',
        'NEW USERS': 'ga:newusers',
        'USERS': 'ga:users',
      };

      const metric = slotMetrics[slotValue.toUpperCase()];
      let speechText = `I'm sorry. I don't have enough data to determine the ${slotValue}.`;
      if (metric) {
        const params = {
          Key: {
            'metric': metric
          },
          TableName: "hackcincy2018_metrics"
        };

        const query = await dynamo.get(params).promise();
        const result = new Number(query.Item.value).toFixed();
        speechText = responses[slotValue.toUpperCase()](result);
      }

      return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Tropos', speechText)
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can ask me for metrics about your business';

    return handlerInput.responseBuilder
    .speak(speechText)
    .reprompt(speechText)
    .withSimpleCard('Tropos', speechText)
    .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent' ||
       handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
    .speak(speechText)
    .withSimpleCard('Tropos', speechText)
    .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    // any cleanup logic goes here
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
    .speak('Sorry, I can\'t understand the command. Please say again.')
    .reprompt('Sorry, I can\'t understand the command. Please say again.')
    .getResponse();
  },
};

exports.handler = Alexa.SkillBuilders.custom()
.addRequestHandlers(
  LaunchRequestHandler,
  MetricsIntentHandler,
  HelpIntentHandler,
  CancelAndStopIntentHandler,
  SessionEndedRequestHandler,
)
.addErrorHandlers(ErrorHandler)
.lambda();
