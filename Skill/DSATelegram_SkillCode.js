const Alexa = require('ask-sdk');
const AWS = require('aws-sdk');
const https = require('https');
const mysql = require('mysql');

var conn = mysql.createConnection({
  host : 'dsa-telegram.cmxetdpzbnhk.us-east-1.rds.amazonaws.com',
  user : 'nicovogel',
  password : 'DSADatenbank',
  database : 'dsa-telegream'
});


function getUnreadMessages() {                                                                    //get unread messages from db (inserted by lex)
  return new Promise(function(resolve){
    conn.connect();

      conn.query('SELECT id, name, message, `read`, (SELECT COUNT(id) FROM dsa WHERE `read` = 0) AS rowcount FROM dsa WHERE `read` = 0', function (error, results) {
  
          if (error) throw error;
      
          JSON.stringify(results);

          if(results.length < 1){                                                                 //result length = 0 if the query cant return *any results*

            resolve("Es wurde keine neue Nachricht gefunden!", null);

          }else{
                        
            let text = "";
            
            for(i=0; i<results[0]["rowcount"]; i++){                                              //concatenate the output string  

              text = text + "Nachricht ["+(i+1)+"] von " + results[i]["name"] + " mit dem Inhalt " + results[i]["message"] + " [ ] ";

            }

            for(i=0; i<results[0]["rowcount"]; i++){                                              //update read in db to prevent multiple output

              input = results[i]["id"];     

              sql = mysql.format("UPDATE dsa SET `read` = 1 WHERE id = ?", [input]);

              conn.query(sql, function (error) {
                if (error) throw error;
              });

            }
            
            resolve(text, null);
          }
      });
  });
}

function sendTelegramMessageFunction(msg) {         

  const options = {                                                                               //reserved chatID, tbd in later release (when module is finished)
      host: 'api.telegram.org',
      path: '/bot1607194073:AAF5VZ96gHDJ15xVAqg08O4buxbEsmU8wP4/sendMessage?chat_id=732689304&text=' + encodeURIComponent(msg),
      method: 'POST',
  };
    
  const req = https.request(options, res => {                                                     //make the API request
  console.log(`statusCode sendToTelegramFunction: ${res.statusCode}`)

  res.on('data', d => {
    process.stdout.write(d)
    })
  })
  
  req.on('error', error => {
    console.error(error)
  })
  
  req.end()
  
}

const StartHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'LaunchRequest'
      || (request.type === 'IntentRequest'
        && request.intent.name === 'StartIntent');
  },
  handle(handlerInput) {

    const speechOutput = "Hallo, hier ist Alexa mit dem D.S.A. Skill. Was möchtest du tun - eine Nachricht versenden oder eine Nachricht vorlesen lassen?";

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(HELP_REPROMPT)
      .getResponse();
  },
};

const SendMessageToTelegramHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return(request.type === 'IntentRequest'
        && request.intent.name === 'SendMessageToTelegramIntent');
  },
  async handle(handlerInput) {

    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const msg = slots.messageToTelegram.value;

    sendTelegramMessageFunction(msg);                                                             //call the message sending function   
      
    const speechOutput = "Nachricht mit dem Inhalt [" + msg + "] gesendet.";

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(HELP_REPROMPT)
      .getResponse();
  },
};

const ReadMessageHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return(request.type === 'IntentRequest'
        && request.intent.name === 'ReadMessageIntent');
  },
  async handle(handlerInput) {

    return new Promise(function(resolve) {getUnreadMessages().then(result => {                    //get messages from db

        conn.end();
        
        const speechOutput = result;

        resolve(handlerInput.responseBuilder
          .speak(speechOutput)
          .reprompt(HELP_REPROMPT)
          .getResponse()
        );
    
      }, error => {
        if(error) throw error;
      });

    });
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(HELP_MESSAGE)
      .reprompt(HELP_REPROMPT)
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(STOP_MESSAGE)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended through: ${handlerInput.requestEnvelope.request.reason}`);

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
      .speak('Huch, da ist ein unerwarteter Fehler aufgetreten.')
      .reprompt(HELP_REPROMPT)
      .getResponse();
  },
};

const SKILL_NAME = 'DSA Telegram';
const HELP_MESSAGE = 'Du hast folgende Möglichkeiten: Zum Senden einer Nachricht sage [Sende PunktPunktPunkt]; zum Vorlesen von Nachrichten sage [Lies Nachrichten vor]; zum Beenden des Skills sage [Beende D.S.A. Telegram]';
const HELP_REPROMPT = 'Du hast folgende Möglichkeiten: Zum Senden einer Nachricht sage [Sende PunktPunktPunkt]; zum Vorlesen von Nachrichten sage [Lies Nachrichten vor]; zum Beenden des Skills sage [Beende D.S.A. Telegram]';
const STOP_MESSAGE = 'Beende den D.S.A. Skill';

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    StartHandler,
    SendMessageToTelegramHandler,
    ReadMessageHandler,
    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
