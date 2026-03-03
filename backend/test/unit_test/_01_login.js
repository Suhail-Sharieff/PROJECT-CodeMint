import { check } from "k6";
import params from "../constants/params.js"
import http from "k6/http"
import baseUrl from "../constants/url.js";

export const options = {
  vus: 25,
  iterations: 400,
};


export default function () {
  const i = __ITER;  

  const payload = JSON.stringify({
    email: `user${i}@gmail.com`,
    password: `user${i}@123`,
  });

  http.post('http://localhost:8080/auth/login', payload, params);
}

/*
suhail@suhail-Inspiron-14-5430:~/PROJECT-CodeMint/backend/test/unit_test$ k6 run _01_login.js 

         /\      Grafana   /‾‾/  
    /\  /  \     |\  __   /  /   
   /  \/    \    | |/ /  /   ‾‾\ 
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/ 


     execution: local
        script: _01_login.js
        output: -

     scenarios: (100.00%) 1 scenario, 25 max VUs, 10m30s max duration (incl. graceful stop):
              * default: 400 iterations shared among 25 VUs (maxDuration: 10m0s, gracefulStop: 30s)



  █ TOTAL RESULTS 

    HTTP
    http_req_duration..............: avg=3.6s min=1.48s med=3.53s max=9.25s p(90)=4.04s p(95)=4.42s
      { expected_response:true }...: avg=3.6s min=1.48s med=3.53s max=9.25s p(90)=4.04s p(95)=4.42s
    http_req_failed................: 0.00%  0 out of 400
    http_reqs......................: 400    6.891229/s

    EXECUTION
    iteration_duration.............: avg=3.6s min=1.48s med=3.53s max=9.25s p(90)=4.04s p(95)=4.42s
    iterations.....................: 400    6.891229/s
    vus............................: 16     min=16       max=25
    vus_max........................: 25     min=25       max=25

    NETWORK
    data_received..................: 663 kB 11 kB/s
    data_sent......................: 74 kB  1.3 kB/s




running (00m58.0s), 00/25 VUs, 400 complete and 0 interrupted iterations
default ✓ [=============================] 25 VUs  00m58.0s/10m0s  400/400 shared iters
suhail@suhail-Inspiron-14-5430:~/PROJECT-CodeMint/backend/test/unit_test$ 



*/