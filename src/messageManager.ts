
import { MPMessage } from "./models/mps";
import { DivisionMessage } from "./models/divisions";

const logger = require('./logger');

// Load the AWS SDK for Node.js
var AWS = require("aws-sdk");
// Set region
AWS.config.update({ region: "eu-north-1" });

/**
 * Triggers event to create all VOTED_FOR relationships for the MPs it gets
 */
export const readMpMessage = async () => {    

    const mps: Array<MPMessage> = [];

    const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });

    const queueURL = "https://sqs.eu-north-1.amazonaws.com/905418468533/mpsQueue";

    var params = {
        AttributeNames: ["SentTimestamp"],
        MaxNumberOfMessages: 10,
        MessageAttributeNames: ["All"],
        QueueUrl: queueURL,
        VisibilityTimeout: 20,
        WaitTimeSeconds: 0,
    };

    const data = await sqs.receiveMessage(params).promise();

    if (data.Messages) {
        for (const message of data.Messages) {
            logger.info(`Got from queue ${message.Body}`)            
            const mp= JSON.parse(message.Body)
            // @ts-ignore
            mps.push(mp)
                                    
            await sqs.deleteMessage({
                QueueUrl: queueURL,
                ReceiptHandle: message.ReceiptHandle
            }).promise();
        }
    }

    // @ts-ignore
    return mps;
}

/**
 * Triggers event to create all VOTED_FOR relationships for the MPs it gets
 */
export const readDivisionMessage = async () => {    

    const divisions: Array<DivisionMessage> = [];

    const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });

    const queueURL = "https://sqs.eu-north-1.amazonaws.com/905418468533/voteQueue";

    var params = {
        AttributeNames: ["SentTimestamp"],
        MaxNumberOfMessages: 10,
        MessageAttributeNames: ["All"],
        QueueUrl: queueURL,
        VisibilityTimeout: 20,
        WaitTimeSeconds: 0,
    };

    const data = await sqs.receiveMessage(params).promise();
    console.log("got length of ", data.Messages.length);
    
    if (data.Messages) {
        for (const message of data.Messages) {
            logger.info(`Got from queue ${message.Body}`)            
            const mp= JSON.parse(message.Body)
            // @ts-ignore
            divisions.push(mp)
               
            //TODO put this back
            // await sqs.deleteMessage({
            //     QueueUrl: queueURL,
            //     ReceiptHandle: message.ReceiptHandle
            // }).promise();
        }
    }

    // @ts-ignore
    return divisions;
}