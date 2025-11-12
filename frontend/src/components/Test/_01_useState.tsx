import { useState } from "react";

export const A:React.FC=()=> {

    const [cnt,setcnt]=useState(0)

    const increment=()=>{

        // when using just once
        setcnt(cnt+1)

        //when want to use multiple times
        setcnt((prev)=>prev+1)
        setcnt((prev)=>prev+1)

        
    }

    const [li,setli]=useState<string[]>([])
    const [input,setinput]=useState("")

    return <div>

        The count is = {cnt}
     
        <br />
        <button onClick={increment}>Click</button>

        <br />

        <input type="text" onChange={(e)=>{setinput(e.target.value)}}/>
        <br />
        You are typing {input}
        <br />
        <button onClick={()=>{
            setli([...li,input])
        }}>Add</button>
        <br />
        Your list is:
        <ul>
            {li.map((v,i)=>(<li key={i}>{v}</li>))}
        </ul>

    </div>;
}