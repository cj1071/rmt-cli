# rmt-cli

iPLAT4J 模板脚手架命令行工具（TypeScript + tsup）。

## 特性

- 内置模板：`v6-gbase`、`v7-dm`
- 命令参数：`commander`
- 交互输入：`inquirer`
- 终端美化：`chalk`
- 默认执行：`mvn -DskipTests validate`

## 安装与本地调试

```bash
cd rmt-cli
pnpm i
pnpm link --global
```

## 命令

```bash
rmt -h
rmt -v
rmt create --help
```

## 创建项目

```bash
rmt create --template v6-gbase --name rmplat4j-v6-gbase \
  --groupId com.baosight.rmplat4j \
  --artifactId rmplat4j-parent \
  --projectName rmplat4j \
  --moduleName rm
```

不带参数时按顺序交互：

1. template
2. name
3. groupId
4. artifactId
5. projectName
6. moduleName

## 规则

1. 包名：`com.baosight.<projectName>`
2. service 包：`com.baosight.<projectName>.<moduleName>`
3. 模块 artifactId：`<projectName>-bom/common/service/web`

## 可选参数

- `--skip-validate`：跳过 `mvn -DskipTests validate`
- `--force`：目标目录非空时覆盖
- `--output <dir>`：指定输出父目录
- `--template-dir <dir>`：覆盖内置模板目录

## 发布建议

GitHub：

```bash
git add .
git commit -m "feat: upgrade rmt-cli with tsup and built-in templates"
git push
```

npm：

```bash
pnpm run check
pnpm run build
npm publish --access public
```

说明：
- `package.json` 已通过 `files` 字段限制发布内容（`dist` + `templates` + `README.md`）。
- 发布前会执行 `prepublishOnly`，自动做类型检查和构建。
