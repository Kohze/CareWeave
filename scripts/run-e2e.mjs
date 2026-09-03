import { spawn } from 'node:child_process';

const address = 'http://127.0.0.1:4173';

async function isReady() {
	try {
		const response = await fetch(address);
		return response.ok;
	} catch {
		return false;
	}
}

async function waitForServer() {
	for (let attempt = 0; attempt < 80; attempt += 1) {
		if (await isReady()) return;
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	throw new Error('Timed out waiting for the ClearDay preview server.');
}

function completion(child) {
	return new Promise((resolve, reject) => {
		child.once('error', reject);
		child.once('exit', (code) => resolve(code ?? 1));
	});
}

const alreadyRunning = await isReady();
const server = alreadyRunning
	? undefined
	: spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1'], {
			stdio: 'inherit',
			windowsHide: true
		});

try {
	await waitForServer();
	const runner = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], {
		stdio: 'inherit',
		windowsHide: true,
		env: { ...process.env, CLEARDAY_EXTERNAL_SERVER: '1' }
	});
	process.exitCode = await completion(runner);
} finally {
	server?.kill();
}
