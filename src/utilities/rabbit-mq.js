const amqp = require('amqplib');

let channel ,connection;

async function initializeRabbitMQ(){
    try {
        connection = await amqp.connect('amqp://localhost');
        channel = await connection.createChannel();
    } catch (error) {
        console.error('Failed to initialize rabbitMQ', error);
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