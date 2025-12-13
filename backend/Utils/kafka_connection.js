import { Kafka } from "kafkajs";
import { asyncHandler } from "./AsyncHandler.utils.js";
import { Events, Topics } from "./kafka_events.js";
const eventRegistry = Object.fromEntries(
    Object.entries(Events).map(([key, { type, handler }]) => [type, handler])
);

const topicsToCreate=Object.values(Topics)

const kafkaOrigin = process.env.KAFKA_ORIGIN;
const rawBrokers = kafkaOrigin.split(',').map(broker => broker.trim()).filter(broker => broker);

const parseBroker = (broker) => {
    if (broker.startsWith('http://') || broker.startsWith('https://')) {
        return broker.replace(/^https?:\/\//, '');
    }
    return broker;
};

const brokers = rawBrokers.map(parseBroker);

const kafka = new Kafka({
    clientId: "codemint_kafka_clientId",
    brokers: brokers,
    retry: { initialRetryTime: 100, retries: 8 },
});

const admin = kafka.admin();
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "codemint_kafka_groupId" });

export const connectKafka = async () => {
    try {
        console.log("Connecting to Kafka Admin & Producer...");
        await admin.connect();
        await producer.connect();

        // 2. CHECK & CREATE TOPICS
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

        console.log("✅ Kafka Admin & Producer Ready. Subscribing all topics.......");

        // Start Consumer ONLY ONCE, and ONLY after topics exist
        await startDynamicConsumer(topicsToCreate);

    } catch (err) {
        console.error("❌ Kafka Connection Error:", err);
    }
};

export const produceEvent = async (topic, data) => {
    try {
        console.log(`📤 KAFKA produced into topic=[${topic}]`);
        await producer.send({
            topic,
            messages: [{ value: JSON.stringify(data) }],
        });
    } catch (err) {
        console.error(`Error producing to ${topic}:`, err);
    }
};

export const startDynamicConsumer = async (topics) => {
    try {
        await consumer.connect();
        
        await consumer.subscribe({ topics: topics, fromBeginning: true });

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    const parsedMsg = JSON.parse(message.value.toString());
                    const { type, payload } = parsedMsg;

                    const handler = eventRegistry[type];

                    if (handler) {
                        console.log("============================================");
                        console.log(`📤 KAFKA consumed from topic=[${topic}] event_type: [${type}] desc_of_event: [${JSON.stringify(payload.desc)}]`);
                        await handler(payload);
                        console.log("============================================");
                    } else {
                        console.warn(`⚠️ No handler found for event type: [${type}]`);
                    }

                } catch (processingError) {
                    console.error("❌ Error processing message:", processingError);
                }
            },
        });
        console.log("✅ Kafka Consumer subscribed all topics. Listening all events of each.... ");
    } catch (err) {
        console.error("❌ Error starting consumer:", err);
    }
};

import { ApiResponse } from "./Api_Response.utils.js";

export const testApi = asyncHandler(async(req, res) => {
    await produceEvent(Topics.DB_TOPIC, {
        type: Events.DB_QUERY.type, 
        payload: { 
            desc: "Making bulk inserts",
            query: "INSERT INTO messages(session_id, user_id, message) VALUES (?, ?, ?)",
            params: ["f9b794a2-4ff8-4f8c-8c06-9655c10b938e", 1, "Hello World"]
        }
    });

    return res.status(200).json(new ApiResponse(200, "Event Dispatched!"));
});