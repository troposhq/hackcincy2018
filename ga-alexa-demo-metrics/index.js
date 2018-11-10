const Alexa = require('ask-sdk');

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
		return handlerInput.requestEnvelope.request.type === 'IntentRequest'
			&& handlerInput.requestEnvelope.request.intent.name === 'WhatsMyMetric';
	},
	handle(handlerInput) {
		// TODO: they use an env var for slotname in the sample
		const { intent } = handlerInput.requestEnvelope.request;
		const { slots } = intent;
		const slotName = 'metric';
		const slotValue = slots[slotName].value;
		const slotMetrics = {
			'BIGGEST CUSTOMER IN NORTH AMERICA': 'Netflix, Inc',
			'SALES GROWTH BETWEEN Q1 AND Q2 IN THE ASIAN MARKETS': '$7,246,000',
		};
		const metric = slotMetrics[slotValue.toUpperCase()];
		let speechText = `I'm sorry. I don't have enough data to determine the ${slotValue}.`;
		if (metric) {
			speechText = `The ${slotValue} is ${slotMetrics[slotValue.toUpperCase()]}`;
		}

		return handlerInput.responseBuilder
			.speak(speechText)
			.withSimpleCard('Tropos', speechText)
			.getResponse();
	},
};

const HelpIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest'
			&& handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
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
		return handlerInput.requestEnvelope.request.type === 'IntentRequest'
			&& (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
					|| handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
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
