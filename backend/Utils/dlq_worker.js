import { Kafka, Partitioners } from "kafkajs";
import { db } from "./sql_connection.js"; 

// 1. Setup a specific producer for the recovery worker
const kafka = new Kafka({
    clientId: "codemint_dlq_worker",
    brokers: (process.env.KAFKA_ORIGIN || "localhost:9092").split(','),
});

const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
    idempotent: true,
});

const BATCH_SIZE = 50; // Process 50 failed messages at a time

export const processDLQ = async () => {
    console.log("♻️ Starting DLQ Recovery Job...");
    
    try {
        await producer.connect();

        // 2. Fetch failed messages from MySQL
        const [rows] = await db.execute(
            `SELECT id, topic, payload FROM kafka_dlq ORDER BY created_at ASC LIMIT ?`, 
            [BATCH_SIZE]
        );

        if (rows.length === 0) {
            console.log("✅ DLQ is empty. No messages to recover.");
            await producer.disconnect();
            return;
        }

        console.log(`Found ${rows.length} messages in DLQ. Attempting retry...`);

        // 3. Iterate and Retry
        for (const row of rows) {
            const { id, topic, payload } = row;
            let data;

            try {
                // Handle potential double-stringified JSON
                data = typeof payload === 'string' ? JSON.parse(payload) : payload;
            } catch (e) {
                console.error(`❌ Corrupt JSON in DLQ ID ${id}. Manual intervention needed.`);
                continue; // Skip this one
            }

            try {
                // RETRY SENDING TO KAFKA
                await producer.send({
                    topic,
                    messages: [{ value: JSON.stringify(data) }],
                    acks: -1,
                });

                console.log(`✅ Recovered! Message ID ${id} sent to ${topic}`);

                // 4. ON SUCCESS: Delete from DLQ Table
                await db.execute('DELETE FROM kafka_dlq WHERE id = ?', [id]);

            } catch (kafkaErr) {
                console.error(`⚠️ Retry failed for ID ${id}: ${kafkaErr.message}`);
                await db.execute('UPDATE kafka_dlq SET retry_count = retry_count + 1 WHERE id = ?', [id]);

                // Delete if retried too many times (Give up)
                await db.execute('DELETE FROM kafka_dlq WHERE retry_count > 10 AND id = ?', [id])
            }
        }

    } catch (err) {
        console.error("❌ DLQ Worker Critical Failure:", err);
    } finally {
        await producer.disconnect();
    }
};
