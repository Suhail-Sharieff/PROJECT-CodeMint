import http from 'k6/http';
import { sleep } from 'k6';
//k6 run --vus 10 --duration 30s script.js
export const options = {
  iterations: 60,
};

// The default exported function is gonna be picked up by k6 as the entry point for the test script. It will be executed repeatedly in "iterations" for the whole duration of the test.
export default function () {
  // Make a GET request to the target URL
//   http.get('http://localhost:8080/auth/me');
  const payload = JSON.stringify({
    email: "suhailsharieffsharieff@gmail.com",
    password: "Test@123"
  });

  const params = {
    headers: {
      "Content-Type": "application/json"
    }
  };

  http.post('http://localhost:8080/auth/login', payload, params);
  // Sleep for 1 second to simulate real-world usage
  sleep(0.1);
}