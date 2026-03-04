import http from 'k6/http';
import { check, sleep } from 'k6';
import params from '../constants/params.js';
//k6 run --vus 10 --duration 30s script.js
export const options = {
  vus: 1,
  iterations: 400,
};


export default function () {
  const i = __ITER;   // built-in iteration counter
  
  const payload = JSON.stringify({
    email: `user${i}@gmail.com`,
    password: `user${i}@123`,
    name: `user${i}`,
    phone: `${Math.floor(Math.random()*10000)}`
  });

  http.post('http://localhost:8080/auth/register', payload, params);
}