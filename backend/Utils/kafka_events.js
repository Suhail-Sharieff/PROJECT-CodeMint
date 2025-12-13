import { db } from "./sql_connection.js";

const handleDbQuery = async (payload) => {
    try {
        const eventName=Events.DB_QUERY.type
        const { query, params} = payload;
        await db.execute(query, params); 
    } catch (error) {
        console.error(`Error in handleDbQuery: ${error.message}`);
    }
};


export class Topics{
    static DB_TOPIC="db_topic"
}
export const Events = {
    DB_QUERY: {
        type: "db_query",
        handler: handleDbQuery
    }
};





// Usage: await produceEvent(Events.DB_QUERY.type, { type: Events.DB_QUERY.type, ... })

/**
 await produceEvent("code_topic", {
        type: "code_update", 
        payload: { 
            desc: "Making bulk inserts",
            query: "INSERT INTO messages(session_id, user_id, message) VALUES (?, ?, ?)",
            params: [2, 1, "Hello World"]
        }
    });
 */