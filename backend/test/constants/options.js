
const n=1;


const constLoadOptions={
    stages:[
        {duration:'1m',target:10*n},
        {duration:'2m',target:10*n},
        {duration:'1m',target:0},
    ],
    setupTimeout:'4m',
    http_req_duration:{
        max:60000//no more than 60 sec each req
    }
}

const suddenSpikeOptions={
    stages:[
        {duration:'10s',target:0},
        {duration:'2m',target:1000*n},
        {duration:'20s',target:0},
    ],
    setupTimeout:'4m'
}



const gradualLoadOptions={
    stages:[
        {duration:'1m',target:100*n},
        {duration:'1m',target:200*n},
        {duration:'1m',target:400*n},
        {duration:'1m',target:800*n},
        {duration:'1m',target:0},
    ],
    setupTimeout:'5m',
    http_req_duration:{
        max:60000//no more than 60 sec each req
    }
}



export default options=constLoadOptions