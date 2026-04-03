const { digestQueue } = require('../config/queue');
const { buildCheckinPayload } = require('../services/digest.service');

digestQueue.process(async (job) => {
  const { userId } = job.data;
  console.log(`Starting digest generation for user ${userId}`);

  await job.progress(10);

  const payload = await buildCheckinPayload(userId);

  await job.progress(100);
  console.log(
    `Digest generation complete for user ${userId}: ` +
      `available=${payload.available}`
  );

  return payload;
});

module.exports = digestQueue;
