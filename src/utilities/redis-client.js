const redis = require('redis');
const client = redis.createClient();


client.on('error', (err) => {
  console.error(`Error in Redis client: ${err}`);
});

client.on('connect', () => {
  console.log('Connected to Redis');
});

client.on('ready',()=>{
  console.log('Redis client ready');
});

client.on('end',()=>{
  console.log('Redis client ended');
});

(async ()=>await client.connect())();

module.exports = client;