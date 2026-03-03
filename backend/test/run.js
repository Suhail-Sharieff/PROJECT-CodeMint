import { check, sleep } from 'k6';
import http from 'k6/http';
import { io } from 'k6/experimental/socketio';

export const options = {
  vus: 5,
  duration: '10s',
};

export default function () {

  // 1️⃣ LOGIN FIRST
  const loginRes = http.post(
    'http://localhost:8080/auth/login',
    JSON.stringify({
      email: 'user1@gmail.com',
      password: 'user1@123',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  check(loginRes, {
    'login success': (r) => r.status === 200,
  });

  const body = JSON.parse(loginRes.body);
  const accessToken = body.data.accessToken;

  // 2️⃣ CONNECT TO SOCKET.IO
  const socket = io('ws://localhost:8080', {
    auth: {
      token: accessToken,
    },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Connected to socket');

    // Example emit
    socket.emit('create_battle', {
      mode: 'test',
    });
  });

  socket.on('connect_error', (err) => {
    console.log('Connection failed:', err);
  });

  socket.on('battle_created', (data) => {
    console.log('Battle created:', JSON.stringify(data));
  });

  sleep(5);

  socket.close();
}