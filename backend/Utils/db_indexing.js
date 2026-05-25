import { db } from "./sql_connection.js";

const createIndexSafe = async (tableName, indexName, indexDefinition) => {
    try {
        await db.query(`ALTER TABLE ${tableName} ADD INDEX ${indexName} ${indexDefinition}`);
        console.log(`✅ Index ${indexName} created successfully on ${tableName}`);
    } catch (err) {
        if (err.code === 'ER_DUP_KEYNAME') {
            console.log(`ℹ️  Index ${indexName} already exists on ${tableName}`);
        } else {
            console.error(`❌ Error creating index ${indexName} on ${tableName}:`, err.message);
        }
    }
};

export const createIndexes = async () => {
    console.log("🛠️  Starting safe database indexing provisioning...");
    try {
        await createIndexSafe("test_submissions", "idx_test_submissions_test_user", "(test_id, user_id)");
        await createIndexSafe("battle_submissions", "idx_battle_submissions_battle_user", "(battle_id, user_id)");
        await createIndexSafe("messages", "idx_messages_session_created", "(session_id, created_at)");
        await createIndexSafe("kafka_dlq", "idx_kafka_dlq_created_at", "(created_at)");
        console.log("✅ Database indexing provisioning completed.");
    } catch (err) {
        console.error("❌ Critical error during indexing provisioning:", err.message);
    }
};
