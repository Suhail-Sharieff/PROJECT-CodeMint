import React, { useState } from "react"

const Test:React.FC=()=>{
   const [li,setli]=useState<string[]>([])
    const [val,setval]=useState("")
    return (

        <>
        <input type="text" onChange={(e)=>{setval(e.target.value)}}/>
        <br />
        <button onClick={()=>{setli([...li,val])}}>Add</button>

       <ul>
        {li.map((v,idx)=>(<li key={idx}>{v}</li>))}
       </ul>
        </>
    );
}
export default Test;