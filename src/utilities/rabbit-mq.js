const amqp = require('amqplib');

let channel ,connection;
const connectionString = process.env.RABBIT_URL ? process.env.RABBIT_URL : 'amqp://localhost'

async function initializeRabbitMQ(retries = 5, backoff = 3000) {
    if (retries === 0) {
      throw new Error('Max retries reached, could not connect to RabbitMQ.');
    }
    
    try {
      connection = await amqp.connect(connectionString);
      channel = await connection.createChannel();
      console.log("Connected to RabbitMQ");
    } catch (error) {
      console.error(`Failed to connect to RabbitMQ, retrying in ${backoff}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return initializeRabbitMQ(retries - 1, backoff * 2);
    }
  }

function getChannel(){
    if(!channel) throw new Error('Channel to RabbitMQ not established yet');
    return channel;
}

async function closeRabbitMQ(){
    try {
        await channel.close();
        await connection.close();
    } catch (error) {
        console.error('Failed to close RabbitMQ connection', error);
    }
}

module.exports={
    getChannel,
    initializeRabbitMQ,
    closeRabbitMQ,
}