import { readEnv } from './env.js';
import { runWorker } from './worker.js';
import { runAcceptance } from './acceptance.js';

const env = readEnv();

if (env.acceptanceMode) {
  runAcceptance(env)
    .then((report) => {
      console.log(JSON.stringify({ event: 'worker.acceptance', ...report }, null, 2));
      process.exit(report.verdict === 'PASS' ? 0 : 1);
    })
    .catch((error: Error) => {
      console.error(JSON.stringify({ event: 'worker.acceptance.fatal', error: error.message }));
      process.exit(1);
    });
} else {
  runWorker(env)
    .then((report) => {
      console.log(JSON.stringify({ event: 'worker.report', ...report }));
      process.exit(report.state === 'FAILED' ? 1 : 0);
    })
    .catch((error: Error) => {
      console.error(JSON.stringify({ event: 'worker.fatal', error: error.message }));
      process.exit(1);
    });
}
