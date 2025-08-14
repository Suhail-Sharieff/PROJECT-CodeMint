import { app } from "./src/main.js";
import { connectTodb } from "./src/utils/mongo_connect.js";


connectTodb()
.then(
    ()=>{
        app.listen(
            process.env.PORT||8080,
            "0.0.0.0",
            ()=>{
                console.log(`SERVER RUNNING: GO TO http://localhost:${process.env.PORT}/`);
            }
        )
    }
)
.catch(
    (err)=>{
        console.log(`error in connecting db: ${err.message}`);
    }
)