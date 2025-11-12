//useEffect is used to perform side effects in functional components
//for example fetching api data,directly updating the DOM,and timers
//ie things run in background

//for ex here i run the timer in background which increments the cnt every 2 seconds, this change will also be reflected in UI



//we also have useLayouefect, useeffect runs after rendersing components, but useUIefect runs before rendering the components

import React, { useState, useEffect, useLayoutEffect } from 'react';

export const B:React.FC=()=>{

    const [cnt,setcnt]=useState(0)
    useEffect(()=>{
        setTimeout(()=>{
            setcnt(x=>x+1)
        },2000)
    });

    useLayoutEffect(()=>{
        console.log("this runs bfr rendering the component")
    });

    const [mydate,setmydate]=useState("")
    useEffect(()=>{
        setTimeout(()=>{
            const obj=new Date()
            setmydate(`${obj.getHours()}:${obj.getMinutes()}:${obj.getSeconds()}`)
        },1000);
    },
    // [cnt]//this is dependecy array, if u pass say x here, if x changes anywhere, this function is useEffect will be executed again
)


    return <>

        The count is {cnt}

        <br />

        The date is {mydate}

    </>
}

