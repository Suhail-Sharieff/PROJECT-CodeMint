import { Kafka, Partitioners } from "kafkajs"; // [FIX] Added Partitioners
import { asyncHandler } from "./AsyncHandler.utils.js";
import { Events, Topics } from "./kafka_events.js";
import { db } from "./sql_connection.js"; 
import { ApiResponse } from "./Api_Response.utils.js";
import { processDLQ } from "./dlq_worker.js";

const eventRegistry = Object.fromEntries(
    Object.entries(Events).map(([key, { type, handler }]) => [type, handler])
);

const topicsToCreate = Object.values(Topics);

// broker config
const kafkaOrigin = process.env.KAFKA_ORIGIN
const rawBrokers = kafkaOrigin.split(',').map(broker => broker.trim()).filter(broker => broker);
const parseBroker = (broker) => {
    if (broker.startsWith('http://') || broker.startsWith('https://')) {
        return broker.replace(/^https?:\/\//, '');
    }
    return broker;
};
const brokers = rawBrokers.map(parseBroker);

// Kafka Configuration
const kafka = new Kafka({
    clientId: "codemint_kafka_clientId",
    brokers: brokers,
    // Retry Logic
    retry: { 
        initialRetryTime: 300, 
        retries: 10 
    },
});

const admin = kafka.admin();
const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
    idempotent: true, // to Prevent duplicates processing of msgs
    allowAutoTopicCreation: false,
});
const consumer = kafka.consumer({ groupId: "codemint_kafka_groupId" });

// --- DLQ(Dead letter queue to manage failed events), later v will create another worker to handle DLQ events for max 10 times
const saveToDeadLetterQueue = async (topic, data, errorMsg) => {
    try {
        console.warn(`⚠️ Kafka Down. Saving to DLQ table for topic: ${topic}`);
        const query = `INSERT INTO kafka_dlq (topic, payload, error_message) VALUES (?, ?, ?)`;
        await db.execute(query, [topic, JSON.stringify(data), errorMsg]);
        console.log("✅ Message safely backed up in DLQ.");
    } catch (dbErr) {
        console.error("☠️ CRITICAL: Failed to save to DLQ. Data potential loss.", dbErr);
    }
};

export const connectKafka = async () => {
    try {
        console.log("Connecting to Kafka Admin & Producer...");
        await admin.connect();
        await producer.connect();

        // create new topics after chk
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
        await startDynamicConsumer(topicsToCreate);
        // every 10 minutes we will try processing failed events
        setInterval(() => {
            processDLQ();
        }, 10 * 60 * 1000);
        console.log(`✅ DLQ(dead letter queue) worker started`);
        
    } catch (err) {
        console.error("❌ Kafka Connection Error:", err);
    }
};

export const produceEvent = async (topic, data) => {
    try {
        console.log(`📤 KAFKA producing into topic=[${topic}]`);
        
        // IMP: Backpressure & Reliability managed here by settng acks:-1, backpresure helps in ensuring that proucer and consumer are compatibel with theri speedsd of producin and consumin
        // acks: -1 ensures leader and replicas confirm receipt
        await producer.send({
            topic,
            messages: [{ 
                key: data.session_id ? String(data.session_id) : undefined, //===TODO: i can assign sessin_id so that kafka can ensure ordering too
                value: JSON.stringify(data) 
            }],
            acks: -1, 
        });

    } catch (err) {
        console.error(`❌ Error producing to ${topic}:`, err.message);
        await saveToDeadLetterQueue(topic, data, err.message);
    }
};

export const startDynamicConsumer = async (topics) => {
    try {
        await consumer.connect();
        await consumer.subscribe({ topics: topics, fromBeginning: true });

        await consumer.run({
            autoCommit: false, //to manually cntrl success of event
            eachMessage: async ({ topic, partition, message }) => {
                const offset = message.offset;
                try {
                    const parsedMsg = JSON.parse(message.value.toString());
                    const { type, payload } = parsedMsg;

                    const handler = eventRegistry[type];

                    if (handler) {//commit if success
                        console.log(`📥 Processing [${type}] from [${topic}]`);
                        await handler(payload);
                        
                        await consumer.commitOffsets([{ topic, partition, offset: (BigInt(offset) + 1n).toString() }]);
                    } else {
                        console.warn(`⚠️ No handler for event type: [${type}]`);
                        // Commit anyway to skip unknown messages preventing block
                        await consumer.commitOffsets([{ topic, partition, offset: (BigInt(offset) + 1n).toString() }]);
                    }

                } catch (processingError) {
                    console.error(`❌ Consumer Error on topic ${topic}:`, processingError.message);
                    
                    // Decision: Do we block or skip?
                    // For now, we Log & Skip (Commit) so we don't crash the specific partition.
                    // Ideally, you would write THIS to a "Consumer DLQ" here.
                    await consumer.commitOffsets([{ topic, partition, offset: (BigInt(offset) + 1n).toString() }]);
                }
            },
        });
        console.log("✅ Kafka Consumer listening...");
    } catch (err) {
        console.error("❌ Error starting consumer:", err);
    }
};

export const testApi = asyncHandler(async(req, res) => {
    await produceEvent(Topics.DB_TOPIC, {
        type: Events.DB_QUERY.type, 
        payload: { 
            desc: "Making bulk inserts",
            query: "INSERT INTO messages(session_id, user_id, message) VALUES (?, ?, ?)",
            params: ["f9b794a2-4ff8-4f8c-8c06-9655c10b938e", 1, "Hello World"]
        }
    });

    return res.status(200).json(new ApiResponse(200, "Event Dispatched (or Saved to DLQ)!"));
});