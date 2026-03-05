import { db } from "./sql_connection.js";

const handleDbQuery = async (payload) => {
    try {
        const { query, params } = payload;
        if (!query || !params) throw new Error(`Query or params not passed to exec DB query`);
        await db.execute(query, params);
    } catch (error) {
        console.error(`Error in handleDbQuery: ${error.message}`);
    }
};



export const Topics={
    SESSION_TOPIC:{
        name:"session_topic",
        group:"session_group"
    },
    BATTLE_TOPIC:{name:"battle_topic",group:"battle_group"},
    TEST_TOPIC:{name:"test_topic",group:"test_group"}
}
export const Events = {
    DB_QUERY: {
        type:"db_query",
        handler: handleDbQuery
    },
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