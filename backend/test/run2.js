import http from "k6/http"
import { check,group,sleep } from "k6"


export function setup(){
    var x=23;
    check(x,{
        "done1":(r)=>r===23
    })
    return x;
}

export default function(data){
    console.log(`mydata is =${data}`);
    group("group 1",()=>{
        check(data,{
            "done2":(r)=>r===23
         })
    })
    group("group 2",()=>{
        check(data,{
            "done3":(r)=>r===23
         })
    })
}
