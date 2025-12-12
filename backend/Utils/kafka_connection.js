import { Kafka } from "kafkajs";
import { asyncHandler } from "./AsyncHandler.utils.js";

const topicsToCreate = ["code_updates"];


// Parse brokers from env or default
const kafkaOrigin = process.env.KAFKA_ORIGIN
const rawBrokers = kafkaOrigin.split(',').map(broker => broker.trim()).filter(broker => broker);

// Function to parse broker string, handling URLs or plain host:port
const parseBroker = (broker) => {
    if (broker.startsWith('http://') || broker.startsWith('https://')) {
        // Remove protocol and extract host:port
        const withoutProtocol = broker.replace(/^https?:\/\//, '');
        return withoutProtocol;
    }
    return broker;
};

const brokers = rawBrokers.map(parseBroker);

// Validate brokers format
brokers.forEach(broker => {
    const [host, portStr] = broker.split(':');
    const port = parseInt(portStr, 10);
    if (!host || isNaN(port) || port < 0 || port > 65535) {
        throw new Error(`Invalid Kafka broker: ${broker}. Expected format: host:port`);
    }
});

const kafka = new Kafka(
    {
        clientId: "codemint_kafka_clientId",
        brokers: brokers,
        retry: {
            initialRetryTime: 100,
            retries: 8
        },
    }
)

const admin = kafka.admin()
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "codemint_kafka_groupId" });




export const connectKafka = async () => {
    try {
        console.log("Connecting to Kafka...");
        await producer.connect();
        await consumer.connect();
        await admin.connect();

        const existingTopics = await admin.listTopics();

        const newTopics = topicsToCreate
            .filter(t => !existingTopics.includes(t))
            .map(t => ({
                topic: t,
                numPartitions: 1,
                replicationFactor: 1
            }));

        if (newTopics.length > 0) {
            console.log(`⚠️ Creating topics: ${newTopics.map(t => t.topic).join(", ")}`);
            await admin.createTopics({ topics: newTopics });
            console.log("✅ Topics created.");
        }

        console.log("✅ Kafka Connected & Ready");
    } catch (err) {
        console.error("❌ Kafka Connection Error:", err);
    }
};
export const produceEvent = async (topic, message) => {
  try {
    console.log(`📤 KAFKA produced into topic=${topic} message=${message}`);
    
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  } catch (err) {
    console.error(`Error producing to ${topic}:`, err);
  }
};

export const consumeEvents = async (topic, callback) => {
  try {
    await consumer.subscribe({ topic, fromBeginning: false });
    consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const parsedValue = JSON.parse(message.value.toString());
        console.log(`📥 KAFKA consumed from topic=${topic} message=${JSON.stringify(parsedValue)}`);
        callback(parsedValue);
      },
    });
  } catch (err) {
    console.error(`Error consuming ${topic}:`, err);
  }
};

//------------------how to use

import { db } from "./sql_connection.js";
import { ApiError } from "./Api_Error.utils.js";
import { ApiResponse } from "./Api_Response.utils.js";
export const testApi=asyncHandler(async(req,res)=>{
    try{
        await produceEvent("code_updates","100 insert queries")
        await consumeEvents("code_updates",async(data)=>{
            for(var i=1;i<=5000;i++){
                await db.execute('insert into messages(session_id,user_id,message) values(?,?,?)',[2,1,`Msg${i}`])
            }
        })

        return res.status(200).json(new ApiResponse(200,`Suhail API tested `))

    }catch(err){
        return res.status(400).json(new ApiError(400,err.message))
    }
})  