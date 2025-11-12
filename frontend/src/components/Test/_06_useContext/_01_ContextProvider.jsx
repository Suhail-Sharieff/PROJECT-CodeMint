import React, { createContext } from 'react'

const MyAppContext=createContext()

export const MyContextProvider=(props)=>{
    const data={
        'email':'abc@gmail.com',
        'password':'abc@123',
        'phone':'phone'
    }

    return( 
    <MyAppContext.Provider value={{data}}>
        {props.children}
    </MyAppContext.Provider>)
}

