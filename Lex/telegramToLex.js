import * as AWS from 'aws-sdk';																								
import Axios from 'axios';                                                                        //for http(s) requests
import mysql from 'mysql';

const lexruntime = new AWS.LexRuntime();

var conn = mysql.createConnection({
    host : 'dsa-telegram.cmxetdpzbnhk.us-east-1.rds.amazonaws.com',
    user : 'nicovogel',
    password : 'DSADatenbank',
    database : 'dsa-telegream'
});

function insertIntoDB(name, message, messageID){                                                  //insert incoming messages into db
    
    conn.connect();

    let sql = mysql.format("INSERT INTO dsa (message, messageID, name) VALUES (?, ?, ?)", [message, messageID, name]);

    conn.query(sql, function(error){
        
        if(error) throw error;
        
    });

    conn.end();

}

exports.handler = async event => {
    try {
        const body = JSON.parse(event.body);                                                      //get telegram message body
                
        const messageForLex = TelegramToLex(body);
        const lexResponse = await lexruntime.postText(messageForLex).promise();                   //wait for lex to response                

        const messageForTelegram = LexToTelegram(lexResponse, body);
        await sendToTelegram(messageForTelegram);                                                 //send the answer of lex to telegram

        return console.log('EVERYTHING OK in "Lex<>Telegram" communication!');

    } catch (error) {
        return console.log('Error in "Lex<>Telegram" communication: ', error);
    }
};

const TelegramToLex = body => {                                                                //extract needed information of message body
    const chatID = String(body.message.chat.id);
    const message = body.message.text;
    const name = body.message.chat.first_name;
    const messageID = String(body.update_id);

    insertIntoDB(name, message, messageID);                                                       //call the insert function

    return {
        inputText: message,
        userId: chatID,
        botName: 'telegramBot',
        botAlias: 'dev',
        sessionAttributes: {},
    };
};

const LexToTelegram = (lexResponse, body) => {                                                 //response of lex for telegram
    return {
        text: lexResponse.message,
        chat_id: body.message.chat.id,
    };
};

const sendToTelegram = message => {
    const token = '1607194073:AAF5VZ96gHDJ15xVAqg08O4buxbEsmU8wP4';                               
    const telegramURL = `https://api.telegram.org/bot${token}/sendMessage`;

    return Axios.post(telegramURL, message);                                                      //posts the https API request
};
