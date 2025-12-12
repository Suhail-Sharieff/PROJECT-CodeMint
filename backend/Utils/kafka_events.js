import { db } from "./sql_connection.js";

const handleCodeUpdate = async (payload) => {
    try {
        const eventName="code_update"
        const { query, params, desc } = payload;
        console.log(`📥 KAFKA consumed event=[${eventName}] desc_of_event:[${desc}]`);
        await db.execute(query, params); 
    } catch (error) {
        console.log(`Error in handleCodeUpdate: ${error.message}`);
    }
};

export const eventRegistry = {
    "code_update": handleCodeUpdate,
};