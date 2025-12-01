import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { spawn } from 'child_process';
import path from 'path';

// Increase default timeout for build test
jest.setTimeout(120000);

test('renders main container and loading state', () => {
  render(<App />);

  // The app renders a <main> element — assert it exists
  expect(screen.getByRole('main')).toBeInTheDocument();

  // The initial app shows a loading placeholder in this environment
  expect(screen.getByText(/loading\.\.\.|loading/i)).toBeInTheDocument();
});

// This test ensures the frontend build completes successfully.
// It runs the project's build script (`npm run build`) and fails the test if the process exits with a non-zero code.
test('project builds successfully', async () => {
  const projectRoot = path.resolve(__dirname, '..', '..');

  const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    const build = spawn('npm', ['run', 'build'], { cwd: projectRoot, shell: true });

    let stdout = '';
    let stderr = '';

    build.stdout.on('data', (data) => { stdout += data.toString(); });
    build.stderr.on('data', (data) => { stderr += data.toString(); });

    build.on('close', (code) => resolve({ code, stdout, stderr }));
  });

  expect(result.code).toBe(0);
  // Assert the build reported success (match project's esbuild script output)
  expect(result.stdout + result.stderr).toMatch(/build complete|⚡ build complete/i);
});
