const amqp = require('amqplib');

let connection = null;
let channel = null;

const MQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';

async function createMQClient(maxRetries = 15, baseDelayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      connection = await amqp.connect(MQ_URL);
      channel = await connection.createChannel();
      await channel.assertQueue('goneops.events', { durable: true });
      console.log('[goneops] RabbitMQ connected and queue asserted');
      return { connection, channel };
    } catch (err) {
      console.error(`[goneops] MQ connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt === maxRetries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function getChannel() {
  if (!channel) throw new Error('RabbitMQ channel not initialized');
  return channel;
}

module.exports = { createMQClient, getChannel };
