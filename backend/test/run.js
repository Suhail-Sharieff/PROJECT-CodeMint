import http from 'k6/http';
import { check, sleep } from 'k6';
//k6 run --vus 10 --duration 30s script.js
export const options = {
  vus:1,
  iterations: 4,
};

// The default exported function is gonna be picked up by k6 as the entry point for the test script. It will be executed repeatedly in "iterations" for the whole duration of the test.
export default function () {
  const payload = JSON.stringify({
    email: "suhailsharieffsharieff@gmail.com",
    password: "Test@123"
  });

  const params = {
    headers: {
      "Content-Type": "application/json"
    }
  };

  const res=http.post('http://localhost:8080/auth/login', payload, params);
  check(res,{
    is_status_200:(r)=>r.status===200,
    "res has accessToken":(r)=>r.body.includes("accessToken")
  })


  // Sleep for 1 second to simulate real-world usage

  sleep(0.1);
}