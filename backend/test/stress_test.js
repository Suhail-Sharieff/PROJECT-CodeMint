import { check, sleep } from 'k6';
import http from 'k6/http';
import ws from 'k6/ws';

// Test Configuration
export const options = {
  stages: [
    { duration: '15s', target: 50 },  // Ramp-up to 50 concurrent users
    { duration: '30s', target: 150 }, // Ramp-up to 150 VUs (sustained load)
    { duration: '30s', target: 300 }, // Peak stress testing at 300 VUs
    { duration: '15s', target: 0 },   // Cool-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests should complete under 3 seconds
    http_req_failed: ['rate<0.05'],    // HTTP error rate must remain under 5%
  },
};

const BASE_URL = 'http://localhost:8080';

// Simple helper to generate unique credentials for each VU
function getCredentials(vuId, iteration) {
  // Add a random suffix so runs don't conflict
  const runId = Math.floor(Math.random() * 1000000);
  const uniqueId = `vu_${vuId}_it_${iteration}_run_${runId}`;
  return {
    name: `Load Test VU ${uniqueId}`,
    email: `vu_${uniqueId}@codemint.test`,
    password: `TestPass123!`,
  };
}


export default function () {
  const vuId = __VU;
  const iterId = __ITER;
  const creds = getCredentials(vuId, iterId);

  // --- PHASE 1: REGISTER OR LOGIN ---
  const randomBlock = Math.floor(1000 + Math.random() * 9000);
  const phone = '9' + String(vuId).padStart(3, '0') + String(randomBlock);

  const registerPayload = JSON.stringify({
    name: creds.name,
    email: creds.email,
    password: creds.password,
    phone: phone,
  });

  let authRes = http.post(`${BASE_URL}/auth/register`, registerPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  // Always call login to obtain the JWT accessToken, whether registration succeeded or was skipped/failed
  const loginPayload = JSON.stringify({
    email: creds.email,
    password: creds.password,
  });
  authRes = http.post(`${BASE_URL}/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const loginSuccess = check(authRes, {
    'auth response status is 200/201': (r) => r.status === 200 || r.status === 201,
    'has access token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !!(body.data && body.data.accessToken);
      } catch (e) {
        return false;
      }
    },
  });

  if (!loginSuccess) {
    sleep(1);
    return;
  }

  const authData = JSON.parse(authRes.body).data;
  const token = authData.accessToken;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // --- PHASE 2: BROWSE & SIMULATE READ PRESSURE ---
  const meRes = http.get(`${BASE_URL}/auth/me`, { headers: authHeaders });
  check(meRes, { 'get profile status is 200': (r) => r.status === 200 });

  sleep(0.2);

  // const langRes = http.get(`${BASE_URL}/editor/getLanguages`, { headers: authHeaders });
  // check(langRes, { 'get languages status is 200 or 400': (r) => r.status === 200 || r.status === 400 });

  sleep(0.2);

  // --- PHASE 3: ESTABLISH SOCKET.IO CONNECTION VIA BUILT-IN WEBSOCKETS ---
  const socketUrl = `${BASE_URL.replace('http', 'ws')}/socket.io/?EIO=4&transport=websocket`;

  const params = {
    headers: {
      'accesstoken': token,
    },
  };

  const wsRes = ws.connect(socketUrl, params, function (socket) {
    socket.on('open', () => {
      // 1. Send Engine.IO connect packet to transition to Socket.IO namespace
      socket.send('40');
    });

    socket.on('message', (data) => {
      // Handle Engine.IO Heartbeat Pings
      if (data === '2') {
        socket.send('3'); // Respond with Pong
      }
      // Handle Socket.IO connection acknowledgment
      else if (data.startsWith('40')) {
        // 2. Emit 'create_battle' Socket.IO event frame
        socket.send('42["create_battle",{"mode":"load-test"}]');

        // 3. Emit a few mock collaborative keystroke code changes
        socket.send('42["code_change",{"code":"function test() { console.log(\\"editing...\\"); }","language":"javascript"}]');
      }
    });

    // Simulate active session duration, then disconnect
    socket.setTimeout(function () {
      socket.close();
    }, 4000);
  });

  check(wsRes, {
    'websocket upgrade handshake successful': (r) => r.status === 101,
  });

  sleep(0.5);

  // --- PHASE 4: EXECUTE/SUBMIT CODE (HEAVY WORKLOAD) ---
  // const submitPayload = JSON.stringify({
  //   language_id: 63, // JavaScript (Node.js) on Judge0
  //   source_code: 'console.log("Hello Codemint!");',
  //   stdin: '',
  // });

  // const submitRes = http.post(`${BASE_URL}/editor/submitCode`, submitPayload, {
  //   headers: authHeaders,
  // });

  // check(submitRes, {
  //   'code execution submitted status is 200/201 or 400': (r) => r.status === 200 || r.status === 400,
  // });

  sleep(1);
}
