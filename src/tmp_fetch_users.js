const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/users',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyZDYwYjkwZC1lN2JhLTQ3MzItYTY1OC01Njg3YmQzMjVmZDEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjYwNDUyNDQsImV4cCI6MTc2NjY1MDA0NH0.3j3y8BoygT_JaEtkUX3wcdSG9x58ib7X3e0SmW-8pDo',
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Body:');
    console.log(data);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.end();
