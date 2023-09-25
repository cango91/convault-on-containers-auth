const redis = require('redis');
const client = process.env.REDIS_URL ? redis.createClient({url: process.env.REDIS_URL}) : redis.createClient();


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