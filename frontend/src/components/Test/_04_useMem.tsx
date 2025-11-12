import { useEffect, useState } from "react"
//use memo works like this;;;


export const D: React.FC = () => {

    const [input, setinput] = useState(0)
    const [ans, setans] = useState(0)
    useEffect(()=>{setans(input*input)},[input])//continuously track change in input


    const [cnt,setCnt]=useState(0)


    return <>
        Enter the number <input type="number" value={input}  onChange={(e) => { 
            setinput(parseInt(e.target.value??0)); 
            console.log("Calculating square...");
            
        }} /><br />

        Square = {ans} <br />

        count={cnt} <br />
        <button onClick={()=>{setCnt(cnt+1)}}>+</button>



    </>
}