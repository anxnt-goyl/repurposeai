import { spawn } from 'child_process';

const testFiles = [
  'server/services/youtubeService.test.ts',
  'server/routes/auth.test.ts',
  'server/services/exportAndTranscript.test.ts',
  'server/services/featureAudit.test.ts',
];

async function runTest(file: string): Promise<boolean> {
  console.log(`\n======================================================`);
  console.log(`RUNNING TSX: ${file}`);
  console.log(`======================================================\n`);
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', file], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
    });
    child.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function runVitest(file: string): Promise<boolean> {
  console.log(`\n======================================================`);
  console.log(`RUNNING VITEST: ${file}`);
  console.log(`======================================================\n`);
  return new Promise((resolve) => {
    const child = spawn('npx', ['vitest', 'run', file], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
    });
    child.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function main() {
  console.log('--- REPURPOSEAI CONSOLIDATED TEST SUITE ---');
  let allPassed = true;
  for (const file of testFiles) {
    const ok = await runTest(file);
    if (!ok) allPassed = false;
  }

  const vitestOk = await runVitest('server/services/aiService.test.ts');
  if (!vitestOk) allPassed = false;

  console.log('\n======================================================');
  if (allPassed) {
    console.log('✓ ALL TEST SUITES PASSED WITH ZERO ERRORS!');
  } else {
    console.error('✗ SOME TEST SUITES FAILED.');
    process.exit(1);
  }
}

main();
