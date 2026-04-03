const Bull = require('bull');

const redisUrl = process.env.REDIS_URL

// Parse the Redis URL to build ioredis-compatible config
// Upstash requires TLS — rediss:// protocol signals this
const isTLS = redisUrl && redisUrl.startsWith('rediss://')

const redisConfig = isTLS
  ? {
      // For TLS connections (Upstash free tier)
      // Bull requires this specific format for TLS Redis
      createClient: (type) => {
        const IORedis = require('ioredis')
        return new IORedis(redisUrl, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          tls: {
            rejectUnauthorized: false,
          },
        })
      },
    }
  : {
      redis: redisUrl,
    }

const classificationQueue = new Bull(
  'content-classification',
  redisConfig,
  {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 50,
      removeOnFail: 20,
      lockDuration: 300000,
      lockRenewTime: 60000,
    },
  }
);

const digestQueue = new Bull(
  'digest-generation',
  redisConfig,
  {
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 10000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  }
);

// Graceful error handling — prevent unhandled rejections from crashing server
const handleRedisError = (queueName) => (err) => {
  if (err.message.includes('MaxRetriesPerRequest') || 
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('ENOTFOUND')) {
    // Redis unavailable — log once, don't crash the server
    console.warn(`[${queueName}] Redis unavailable: ${err.message}`)
  } else {
    console.error(`[${queueName}] Queue error:`, err.message)
  }
}

classificationQueue.on('error', handleRedisError('classification'));
digestQueue.on('error', handleRedisError('digest'));

classificationQueue.on('failed', (job, err) => {
  console.error(`Classification job ${job.id} failed:`, err.message);
});
classificationQueue.on('completed', (job) => {
  console.log(`Classification job ${job.id} completed`);
});
digestQueue.on('failed', (job, err) => {
  console.error(`Digest job ${job.id} failed:`, err.message);
});

module.exports = { classificationQueue, digestQueue };
