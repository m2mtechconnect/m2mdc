import { readEnv } from './env.js';
import { runWorker } from './worker.js';

const env = readEnv();
runWorker(env)
  .then((report) => {
    console.log(JSON.stringify({ event: 'worker.report', ...report }));
    process.exit(report.state === 'FAILED' ? 1 : 0);
  })
  .catch((error: Error) => {
    console.error(JSON.stringify({ event: 'worker.fatal', error: error.message }));
    process.exit(1);
  });