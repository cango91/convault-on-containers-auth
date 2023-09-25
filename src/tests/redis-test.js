const {createClient} = require('redis');

console.log("Isolated Redis test: Before creating Redis client.");

const client = (async () => {await createClient({
  host: '70.106.191.222',
  port: 6379
}).on('error', err=>console.error(err))
.on('connect', ()=>console.log('Isolated Redis test: Connected to Redis'))
.on('ready', ()=>console.log('Isolated Redis test: Redis client ready'))
.on('end', () => console.log("Isolated Redis test: Redis client ended"))
.connect()})();

console.log("Isolated Redis test: After creating Redis client.");

// client.on('error', (err) => {
//   console.error(`Isolated Redis test: Error in Redis client: ${err}`);
// });

// client.on('connect', () => {
//   console.log("Isolated Redis test: Connected to Redis");
// });

// client.on('ready', () => {
//   console.log("Isolated Redis test: Redis client ready");
// });

// client.on('end', () => {
//   console.log("Isolated Redis test: Redis client ended");
// });
