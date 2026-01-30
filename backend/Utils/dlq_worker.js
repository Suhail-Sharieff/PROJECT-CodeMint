import { Kafka, Partitioners } from "kafkajs";
import { db } from "./sql_connection.js"; 

// we need new prdcuer for handling studff in dlq
const kafka = new Kafka({
    clientId: "codemint_dlq_worker",
    brokers: (process.env.KAFKA_ORIGIN || "localhost:9092").split(','),
});

const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
    idempotent: true,//so that same msg isnt processed by 2 o more workers by kakfka, btw kafka always ensures idempotency if we have partition id
});

const BATCH_SIZE = 50; //v will prcess 50 procss batchwise to avoid over mem usage

export const processDLQ = async () => {
    console.log("♻️ Starting DLQ Recovery Job...");
    
    try {
        await producer.connect();

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

        //now retry all
        for (const row of rows) {
            const { id, topic, payload } = row;
            let data;

            try {
                //sql stores as string, so need to reparse to JSON
                data = typeof payload === 'string' ? JSON.parse(payload) : payload;
            } catch (e) {
                console.error(`❌ Corrupt JSON in DLQ ID ${id}. Manual intervention needed.`);
                continue; //LOL some invalid i stored non JSON ig====TODO
            }

            try {
                // retry my brother....
                await producer.send({
                    topic,
                    messages: [{ value: JSON.stringify(data) }],
                    acks: -1,
                });

                console.log(`✅ Recovered! Message ID ${id} sent to ${topic}`);

                // now thats done, we need to del from DB too
                await db.execute('DELETE FROM kafka_dlq WHERE id = ?', [id]);

            } catch (kafkaErr) {
                console.error(`⚠️ Retry failed for ID ${id}: ${kafkaErr.message}`);
                await db.execute('UPDATE kafka_dlq SET retry_count = retry_count + 1 WHERE id = ?', [id]);

                // retreied too many times, i give up
                await db.execute('DELETE FROM kafka_dlq WHERE retry_count > 10 AND id = ?', [id])
            }
        }

    } catch (err) {
        console.error("❌ DLQ Worker Critical Failure:", err);
    } finally {
        await producer.disconnect();
    }
};
