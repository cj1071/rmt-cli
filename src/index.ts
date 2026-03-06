#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';

type TemplateKey = 'v6-gbase' | 'v7-dm';

const TEMPLATE_MAP: Record<TemplateKey, string> = {
  'v6-gbase': 'template-v6-gbase',
  'v7-dm': 'template-v7-dm'
};

const TEMPLATE_CHOICES: Array<{ name: string; value: TemplateKey }> = [
  { name: 'v6-gbase (iPLAT4J V6 + GBase8s)', value: 'v6-gbase' },
  { name: 'v7-dm (iPLAT4J V7 + DM)', value: 'v7-dm' }
];

const SKIP_NAMES = new Set(['.idea', '.git', 'target', 'node_modules', '.DS_Store']);

interface CreateOptionsInput {
  template?: string;
  name?: string;
  groupId?: string;
  artifactId?: string;
  projectName?: string;
  moduleName?: string;
  output?: string;
  skipValidate?: boolean;
  force?: boolean;
  templateDir?: string;
}

interface CreateOptionsResolved {
  template: TemplateKey;
  name: string;
  groupId: string;
  artifactId: string;
  projectName: string;
  moduleName: string;
  output: string;
  skipValidate: boolean;
  force: boolean;
  templateDir?: string;
}

const cliVersion = readCliVersion();

const program = new Command();
program
  .name('rmt')
  .description('iPLAT4J project scaffolding CLI')
  .version(cliVersion, '-v, --version', 'Show version')
  .helpOption('-h, --help', 'Show help');

program
  .command('create')
  .description('Create a project from built-in templates')
  .option('-t, --template <template>', 'Template key: v6-gbase | v7-dm')
  .option('-n, --name <name>', 'Output project folder name')
  .option('-g, --groupId <groupId>', 'Root Maven groupId')
  .option('-a, --artifactId <artifactId>', 'Root Maven artifactId')
  .option('-p, --projectName <projectName>', 'Base package token: com.baosight.<projectName>')
  .option('-m, --moduleName <moduleName>', 'Service package token: com.baosight.<projectName>.<moduleName>')
  .option('-o, --output <directory>', 'Parent output directory')
  .option('--template-dir <directory>', 'Override built-in template root directory')
  .option('--skip-validate', 'Skip: mvn -DskipTests validate', false)
  .option('--force', 'Overwrite non-empty target directory', false)
  .addHelpText(
    'after',
    `\nInteractive order when omitted:\n  template -> name -> groupId -> artifactId -> projectName -> moduleName\n\nExample:\n  rmt create --template v6-gbase --name rmplat4j-v6-gbase \\\n    --groupId com.baosight.rmplat4j --artifactId rmplat4j-parent \\\n    --projectName rmplat4j --moduleName rm`
  )
  .action(async (rawOptions: CreateOptionsInput) => {
    try {
      const options = await resolveCreateOptions(rawOptions);
      validateOptions(options);

      const templatePath = resolveTemplatePath(options.template, options.templateDir);
      const outputDir = path.resolve(options.output);
      const targetDir = path.join(outputDir, options.name);

      ensureWritableTarget(targetDir, options.force);

      logInfo(`Using template: ${options.template}`);
      logInfo(`Template path: ${templatePath}`);

      copyTemplate(templatePath, targetDir);
      applyProjectTransform(targetDir, options);

      logSuccess(`Project generated: ${targetDir}`);

      if (!options.skipValidate) {
        runMavenValidate(targetDir);
      } else {
        logWarn('Skipped Maven validate by --skip-validate.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logError(message);
      process.exitCode = 1;
    }
  });

if (process.argv.length <= 2) {
  program.outputHelp();
} else {
  program.parseAsync(process.argv).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    logError(message);
    process.exitCode = 1;
  });
}

async function resolveCreateOptions(raw: CreateOptionsInput): Promise<CreateOptionsResolved> {
  const options: CreateOptionsInput = {
    output: process.cwd(),
    skipValidate: false,
    force: false,
    ...raw
  };

  const needInteractive =
    !options.template ||
    !options.name ||
    !options.groupId ||
    !options.artifactId ||
    !options.projectName ||
    !options.moduleName;

  if (needInteractive) {
    printInteractiveGuide();
  }

  if (!options.template) {
    const templateAnswer = await inquirer.prompt<{ template: TemplateKey }>([
      {
        type: 'list',
        name: 'template',
        message: 'template',
        choices: TEMPLATE_CHOICES
      }
    ]);
    options.template = templateAnswer.template;
  }

  if (!options.name) {
    options.name = await askInput('name', undefined);
  }

  if (!options.groupId) {
    options.groupId = await askInput('groupId', 'com.baosight.demo');
  }

  if (!options.artifactId) {
    options.artifactId = await askInput('artifactId', options.name);
  }

  if (!options.projectName) {
    const defaultProjectName = deriveProjectNameFromGroupId(options.groupId);
    options.projectName = await askInput('projectName', defaultProjectName || 'demo');
  }

  if (!options.moduleName) {
    options.moduleName = await askInput('moduleName', 'dm');
  }

  return {
    template: normalizeTemplateKey(options.template),
    name: requiredValue(options.name, 'name'),
    groupId: requiredValue(options.groupId, 'groupId'),
    artifactId: requiredValue(options.artifactId, 'artifactId'),
    projectName: requiredValue(options.projectName, 'projectName'),
    moduleName: requiredValue(options.moduleName, 'moduleName'),
    output: requiredValue(options.output, 'output'),
    skipValidate: Boolean(options.skipValidate),
    force: Boolean(options.force),
    templateDir: options.templateDir
  };
}

function printInteractiveGuide(): void {
  const lines = [
    '',
    chalk.blue('================ 交互式创建说明 ================'),
    `${chalk.cyan('template')}   (${chalk.gray('--template, -t')})   模板类型：v6-gbase（V6+GBase）或 v7-dm（V7+达梦）`,
    `${chalk.cyan('name')}       (${chalk.gray('--name, -n')})       生成项目的目录名称`,
    `${chalk.cyan('groupId')}    (${chalk.gray('--groupId, -g')})    根工程 Maven groupId，例如 com.baosight.rmplat4j`,
    `${chalk.cyan('artifactId')} (${chalk.gray('--artifactId, -a')}) 根工程 Maven artifactId，例如 rmplat4j-parent`,
    `${chalk.cyan('projectName')}(${chalk.gray('--projectName, -p')}) 包名项目段，生成 com.baosight.<projectName>`,
    `${chalk.cyan('moduleName')} (${chalk.gray('--moduleName, -m')}) service 包模块段，生成 com.baosight.<projectName>.<moduleName>`,
    chalk.gray('提示：直接回车可接受默认值（若有）。'),
    chalk.blue('================================================'),
    ''
  ];

  for (const line of lines) {
    console.log(line);
  }
}

async function askInput(message: string, defaultValue?: string): Promise<string> {
  const answer = await inquirer.prompt<{ value: string }>([
    {
      type: 'input',
      name: 'value',
      message,
      default: defaultValue
    }
  ]);

  return String(answer.value ?? '').trim();
}

function requiredValue(value: string | undefined, key: string): string {
  if (!value || !value.trim()) {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function normalizeTemplateKey(value: string): TemplateKey {
  if (value === 'v6-gbase' || value === 'v7-dm') {
    return value;
  }
  throw new Error(`Invalid template: ${value}. Allowed: ${Object.keys(TEMPLATE_MAP).join(', ')}`);
}

function validateOptions(options: CreateOptionsResolved): void {
  if (!/^[a-zA-Z0-9_.-]+$/.test(options.name)) {
    throw new Error(`Invalid name: ${options.name}`);
  }

  if (!/^[a-zA-Z_][a-zA-Z0-9_.-]*$/.test(options.groupId)) {
    throw new Error(`Invalid groupId: ${options.groupId}`);
  }

  if (!/^[a-zA-Z0-9_.-]+$/.test(options.artifactId)) {
    throw new Error(`Invalid artifactId: ${options.artifactId}`);
  }

  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(options.projectName)) {
    throw new Error(`Invalid projectName: ${options.projectName}. Use Java package segment format.`);
  }

  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(options.moduleName)) {
    throw new Error(`Invalid moduleName: ${options.moduleName}. Use Java package segment format.`);
  }
}

function deriveProjectNameFromGroupId(groupId?: string): string {
  if (!groupId || !groupId.includes('.')) {
    return '';
  }
  const parts = groupId.split('.').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

function resolveTemplatePath(template: TemplateKey, templateDir?: string): string {
  const templateFolderName = TEMPLATE_MAP[template];

  if (templateDir) {
    const customRoot = path.resolve(templateDir);
    const directPath = path.join(customRoot, templateFolderName);

    if (isDirectory(directPath)) {
      return directPath;
    }

    if (isDirectory(customRoot) && path.basename(customRoot) === templateFolderName) {
      return customRoot;
    }

    throw new Error(
      `Template not found in --template-dir. Expected ${directPath} or directory named ${templateFolderName}.`
    );
  }

  const bundledPath = path.resolve(__dirname, '..', 'templates', templateFolderName);
  if (isDirectory(bundledPath)) {
    return bundledPath;
  }

  throw new Error(`Built-in template not found: ${bundledPath}`);
}

function isDirectory(dirPath: string): boolean {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

function ensureWritableTarget(targetDir: string, force: boolean): void {
  if (!fs.existsSync(targetDir)) {
    return;
  }

  const entries = fs.readdirSync(targetDir);
  if (entries.length === 0) {
    return;
  }

  if (!force) {
    throw new Error(`Target exists and is not empty: ${targetDir}. Use --force to continue.`);
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
}

function copyTemplate(srcDir: string, destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_NAMES.has(entry.name)) {
      continue;
    }

    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyTemplate(srcPath, destPath);
      continue;
    }

    if (entry.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(srcPath);
      fs.symlinkSync(linkTarget, destPath);
      continue;
    }

    fs.copyFileSync(srcPath, destPath);
  }
}

function applyProjectTransform(targetDir: string, options: CreateOptionsResolved): void {
  const moduleArtifacts = {
    bom: `${options.projectName}-bom`,
    common: `${options.projectName}-common`,
    service: `${options.projectName}-service`,
    web: `${options.projectName}-web`
  };

  renameModuleDirectories(targetDir, moduleArtifacts);

  const basePackage = `com.baosight.${options.projectName}`;
  const servicePackage = `com.baosight.${options.projectName}.${options.moduleName}`;

  const files = listFilesRecursively(targetDir);
  for (const filePath of files) {
    rewriteFileContent(filePath, {
      groupId: options.groupId,
      artifactId: options.artifactId,
      projectName: options.projectName,
      moduleArtifacts,
      basePackage,
      servicePackage
    });
  }

  renameJavaPackageDirs(targetDir, moduleArtifacts, options.projectName, options.moduleName);
}

function renameModuleDirectories(
  targetDir: string,
  moduleArtifacts: { bom: string; common: string; service: string; web: string }
): void {
  const mappings: Array<[string, string]> = [
    ['demo-bom', moduleArtifacts.bom],
    ['demo-common', moduleArtifacts.common],
    ['demo-service', moduleArtifacts.service],
    ['demo-web', moduleArtifacts.web]
  ];

  for (const [oldName, newName] of mappings) {
    const oldPath = path.join(targetDir, oldName);
    const newPath = path.join(targetDir, newName);

    if (!fs.existsSync(oldPath)) {
      continue;
    }

    fs.renameSync(oldPath, newPath);
  }
}

function rewriteFileContent(
  filePath: string,
  context: {
    groupId: string;
    artifactId: string;
    projectName: string;
    moduleArtifacts: { bom: string; common: string; service: string; web: string };
    basePackage: string;
    servicePackage: string;
  }
): void {
  if (!isTextFile(filePath)) {
    return;
  }

  const isPom = path.basename(filePath) === 'pom.xml';
  const original = fs.readFileSync(filePath, 'utf8');
  let content = original;

  content = replaceAll(content, 'demo-parent', context.artifactId);
  content = replaceAll(content, 'demo-bom', context.moduleArtifacts.bom);
  content = replaceAll(content, 'demo-common', context.moduleArtifacts.common);
  content = replaceAll(content, 'demo-service', context.moduleArtifacts.service);
  content = replaceAll(content, 'demo-web', context.moduleArtifacts.web);

  content = replaceAll(content, 'demo.bom.version', `${context.projectName}.bom.version`);
  content = replaceAll(content, 'demo.common.version', `${context.projectName}.common.version`);
  content = replaceAll(content, 'demo.service.version', `${context.projectName}.service.version`);
  content = replaceAll(content, 'demo.web.version', `${context.projectName}.web.version`);

  if (isPom) {
    content = replaceAll(content, 'com.baosight.demo', context.groupId);
  } else {
    content = replaceAll(content, 'com.baosight.demo.dm', context.servicePackage);
    content = replaceAll(content, 'com.baosight.demo', context.basePackage);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

function replaceAll(content: string, source: string, target: string): string {
  if (source === target) {
    return content;
  }
  return content.split(source).join(target);
}

function renameJavaPackageDirs(
  targetDir: string,
  moduleArtifacts: { bom: string; common: string; service: string; web: string },
  projectName: string,
  moduleName: string
): void {
  const commonBase = path.join(targetDir, moduleArtifacts.common, 'src', 'main', 'java', 'com', 'baosight');
  const webBase = path.join(targetDir, moduleArtifacts.web, 'src', 'main', 'java', 'com', 'baosight');
  const serviceBase = path.join(targetDir, moduleArtifacts.service, 'src', 'main', 'java', 'com', 'baosight');

  moveDir(path.join(commonBase, 'demo'), path.join(commonBase, projectName));
  moveDir(path.join(webBase, 'demo'), path.join(webBase, projectName));
  moveDir(path.join(serviceBase, 'demo', 'dm'), path.join(serviceBase, projectName, moduleName));

  removeIfEmpty(path.join(serviceBase, 'demo'));
}

function moveDir(srcDir: string, destDir: string): void {
  if (!isDirectory(srcDir)) {
    return;
  }

  fs.mkdirSync(path.dirname(destDir), { recursive: true });

  if (!fs.existsSync(destDir)) {
    fs.renameSync(srcDir, destDir);
    return;
  }

  fs.cpSync(srcDir, destDir, { recursive: true, force: true });
  fs.rmSync(srcDir, { recursive: true, force: true });
}

function removeIfEmpty(dirPath: string): void {
  if (!isDirectory(dirPath)) {
    return;
  }

  if (fs.readdirSync(dirPath).length === 0) {
    fs.rmdirSync(dirPath);
  }
}

function listFilesRecursively(rootDir: string): string[] {
  const files: string[] = [];

  const walk = (dirPath: string): void => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_NAMES.has(entry.name)) {
        continue;
      }

      const nextPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walk(nextPath);
      } else if (entry.isFile()) {
        files.push(nextPath);
      }
    }
  };

  walk(rootDir);
  return files;
}

function isTextFile(filePath: string): boolean {
  const binaryExtensions = new Set([
    '.jar',
    '.war',
    '.class',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.ico',
    '.bmp',
    '.pdf',
    '.zip',
    '.gz',
    '.7z',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.so',
    '.dylib',
    '.dll'
  ]);

  if (binaryExtensions.has(path.extname(filePath).toLowerCase())) {
    return false;
  }

  const buffer = fs.readFileSync(filePath);
  const checkLength = Math.min(buffer.length, 8000);
  for (let i = 0; i < checkLength; i += 1) {
    if (buffer[i] === 0) {
      return false;
    }
  }

  return true;
}

function runMavenValidate(targetDir: string): void {
  logInfo('Running: mvn -DskipTests validate');
  const result = spawnSync('mvn', ['-DskipTests', 'validate'], {
    cwd: targetDir,
    stdio: 'inherit'
  });

  if (result.error) {
    throw new Error(`Project generated, but Maven validate failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Project generated, but Maven validate failed (exit code ${result.status ?? 'unknown'}).`);
  }

  logSuccess('Maven validate passed.');
}

function readCliVersion(): string {
  try {
    const packagePath = path.resolve(__dirname, '..', 'package.json');
    const json = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as { version?: string };
    return json.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function logInfo(message: string): void {
  console.log(`${chalk.cyan('[INFO]')} ${message}`);
}

function logWarn(message: string): void {
  console.log(`${chalk.yellow('[WARN]')} ${message}`);
}

function logSuccess(message: string): void {
  console.log(`${chalk.green('[OK]')} ${message}`);
}

function logError(message: string): void {
  console.error(`${chalk.red('[ERROR]')} ${message}`);
}
