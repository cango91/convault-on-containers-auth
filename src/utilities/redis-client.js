const redis = require('redis');
const client = redis.createClient();

client.on('error', (err) => {
  console.error(`Error in Redis client: ${err}`);
});

client.on('connect', () => {
  console.log('Connected to Redis');
});

module.exports = client;