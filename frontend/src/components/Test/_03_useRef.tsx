import { useEffect,  useRef, useState } from "react"

export const C:React.FC=()=>{


    const [cnt,setcnt]=useState(0)


    const [changedTimes,setChangeTimes]=useState(0)
    useEffect(()=>{
        setChangeTimes(changedTimes+1)
    },[cnt])//so whenvercnt changes then only set the change times, if not put here it will run inn background infinitely and keep on increasing value





    //we can also use useRef to refer to som elemnt of DOM, say here input
    const inputRef=useRef<HTMLInputElement>(null) 
    useEffect(()=>{},[inputRef])
    return <>
    
    <button onClick={()=>{setcnt(x=>x+1)}}>+1</button><br />
    <h1>Count = {cnt}</h1>
    <button onClick={()=>{setcnt(x=>x-1)}}>-1</button><br />
    N times cnt changes = {changedTimes} <br />

    <input type="text" ref={inputRef}/>
    Your input is {inputRef.current?.value}
    {console.log(inputRef.current?.value)}

    </>
}