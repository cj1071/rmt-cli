const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'dist', 'index.js');
const tempRoot = path.join(os.tmpdir(), `rmt-e2e-${Date.now()}`);

function runCreate(args) {
  const result = spawnSync('node', [cliPath, 'create', ...args], {
    encoding: 'utf8',
    cwd: repoRoot
  });

  if (result.status !== 0) {
    throw new Error(
      `create failed: ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
  }
}

function expectExists(filePath) {
  assert.ok(fs.existsSync(filePath), `expected exists: ${filePath}`);
}

function expectNotExists(filePath) {
  assert.ok(!fs.existsSync(filePath), `expected not exists: ${filePath}`);
}

function projectDir(name) {
  return path.join(tempRoot, name);
}

try {
  fs.mkdirSync(tempRoot, { recursive: true });

  runCreate([
    '--template',
    'v6-gbase',
    '--name',
    'case-default',
    '--groupId',
    'com.baosight.irailmetro',
    '--artifactId',
    'rmplat4j-parent',
    '--projectName',
    'rmplat4j',
    '--moduleName',
    'rm',
    '--output',
    tempRoot,
    '--skip-validate',
    '--force'
  ]);

  const defaultRoot = projectDir('case-default');
  expectExists(
    path.join(
      defaultRoot,
      'rmplat4j-service',
      'src',
      'main',
      'resources',
      'META-INF',
      'resources',
      'RM'
    )
  );
  expectNotExists(path.join(defaultRoot, 'rmplat4j-service', 'src', 'main', 'resources', 'rm'));
  expectNotExists(
    path.join(
      defaultRoot,
      'rmplat4j-service',
      'src',
      'main',
      'resources',
      'META-INF',
      'resources',
      'DM',
      'DMDEMO01.jsp'
    )
  );
  expectExists(
    path.join(
      defaultRoot,
      'rmplat4j-web',
      'src',
      'main',
      'java',
      'com',
      'baosight',
      'rmplat4j',
      'Rmplat4jApplication.java'
    )
  );
  expectNotExists(
    path.join(defaultRoot, 'rmplat4j-service', 'src', 'main', 'java', 'com', 'baosight', 'demo')
  );

  runCreate([
    '--template',
    'v6-gbase',
    '--name',
    'case-keep-demo',
    '--groupId',
    'com.baosight.irailmetro',
    '--artifactId',
    'rmplat4j-parent',
    '--projectName',
    'rmplat4j',
    '--moduleName',
    'rm',
    '--output',
    tempRoot,
    '--skip-validate',
    '--force',
    '--keep-demo'
  ]);

  const keepRoot = projectDir('case-keep-demo');
  expectExists(
    path.join(
      keepRoot,
      'rmplat4j-service',
      'src',
      'main',
      'resources',
      'META-INF',
      'resources',
      'RM'
    )
  );
  expectExists(
    path.join(
      keepRoot,
      'rmplat4j-service',
      'src',
      'main',
      'resources',
      'META-INF',
      'resources',
      'DM',
      'DMDEMO01.jsp'
    )
  );
  expectExists(
    path.join(keepRoot, 'rmplat4j-service', 'src', 'main', 'java', 'com', 'baosight', 'demo')
  );
  expectExists(
    path.join(
      keepRoot,
      'rmplat4j-web',
      'src',
      'main',
      'java',
      'com',
      'baosight',
      'rmplat4j',
      'Rmplat4jApplication.java'
    )
  );

  runCreate([
    '--template',
    'v6-gbase',
    '--name',
    'case-project-demo',
    '--groupId',
    'com.baosight.demo',
    '--artifactId',
    'demo-parent',
    '--projectName',
    'demo',
    '--moduleName',
    'dm',
    '--output',
    tempRoot,
    '--skip-validate',
    '--force'
  ]);

  const projectDemoRoot = projectDir('case-project-demo');
  expectExists(
    path.join(
      projectDemoRoot,
      'demo-web',
      'src',
      'main',
      'java',
      'com',
      'baosight',
      'demo',
      'DemoApplication.java'
    )
  );
  expectNotExists(
    path.join(
      projectDemoRoot,
      'demo-service',
      'src',
      'main',
      'resources',
      'META-INF',
      'resources',
      'DM',
      'DMDEMO01.jsp'
    )
  );

  console.log('e2e passed');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
