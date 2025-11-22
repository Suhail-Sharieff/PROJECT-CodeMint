import { db } from "../Utils/sql_connection.js";
import { ApiResponse } from "../Utils/Api_Response.utils.js";
import { ApiError } from "../Utils/Api_Error.utils.js";
import { asyncHandler } from "../Utils/AsyncHandler.utils.js";


const createTest = async (user_id, test_id,duration=10,title) => {
    try {
        if (!user_id) throw new ApiError(400, `No user_id provided by SocketManager to create test!`)
        if (!test_id) throw new ApiError(400, `No test_id provided by SocketManager to create test!`)

        const query = 'insert into test (test_id,host_id,duration,title) values(?,?,?,?)'
        const [rows] = await db.execute(query, [test_id,user_id,duration,title])
        if (rows.length === 0) throw new ApiError(400, "Unabe to create test!")





    } catch (e) {
        throw new ApiError(400, e.message);
    }
}
const joinTest=
    async(user_id,test_id)=>{
       try{
            if(!test_id) throw new ApiError(400,"Socket manager didnt provide test_id to join test!")
            if(!user_id) throw new ApiError(400,"Socket manager didnt provide user_id to join test!")

            const query='insert into test_participant(test_id,user_id) values (?,?)'
            const [rows]=await db.execute(query,[test_id,user_id])
            
            console.log(`User id = ${user_id} joined Test id = ${test_id}`);
            

       }catch(e){
           throw new ApiError(400, e.message);
       }
        
    }


const getTestsByMe=asyncHandler(
    async(req,res)=>{
        try{
            const {user_id}=req.user;
            if(!user_id) throw new ApiError(400,'Unauthorized acess!')
            const [rows]=await db.execute('select * from test where host_id=?',[user_id])
            return res.status(200).json(rows)
        }catch(err){
            return res.status(400).json(new ApiError(400,err.message))
        }
    }
);

const getTestAnalysis=asyncHandler(
    async(req,res)=>{
        try {
            const {test_id}=req.query
            if(!test_id) throw new ApiError(400,`Test_id not provided in params for its analysis!`)
            const query=`
                        with cte as 
                        (select 
                        x.test_id,x.user_id,x.role,x.status as user_status,x.joined_at,x.score,y.host_id,y.title,y.status as test_status,y.created_at,y.duration,y.start_time
                        from test_participant x left join test y on
                        x.test_id=y.test_id where x.test_id=?
                        and x.user_id!=y.host_id)
                        select *,timediff(time(x.last_updated),time(cte.start_time)) as time_taken_to_solve from cte left join test_submissions x  on cte.test_id=x.test_id and cte.user_id=x.user_id
                        order by cte.score,time_taken_to_solve`

            const [rows]=await db.execute(query,[test_id])
            return res.status(200).json(new ApiResponse(200,rows,`Fetched test anaysis of test_id=${test_id}`))
        } catch (error) {
            return res.status(400).json(new ApiError(400,error.message)) 
        }
    }
)


export {createTest,joinTest,getTestsByMe,getTestAnalysis}
