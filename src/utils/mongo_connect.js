import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

const connectTodb=async()=>{
    try{
        const uri=`${process.env.MONGO_URI}/${process.env.DB_NAME}`
        await mongoose.connect(uri)
        console.log(`mongo db connection sucess....`);
    }catch(err){
        console.log(`error in connecting db: ${err.message}`);
        process.exit(0)
    }
}
export {connectTodb}