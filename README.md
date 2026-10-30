# SVG Editor CLI

高级软件工程 Lab1 Phase 1：使用 TypeScript 和面向对象设计实现命令行 SVG 编辑器。

## 当前进度

里程碑 1：架构草案与项目骨架。当前可执行 `help`，支持逐行输入、整行注释、双引号参数和统一错误输出。
`init`、图形编辑、文件读写、`undo/redo` 尚未实现；这不是作业最终版本。

## 本地运行

需要 Node.js 22 或更高版本和 npm。在本文件所在的项目根目录运行：

```sh
npm ci
npm run cli
```

交互终端显示 `svg>`，输入 `help` 查看当前进度与完整命令规划，使用 Ctrl-D 结束输入。
也可以通过标准输入回放脚本；此时不输出启动横幅和提示符，方便检查结果：

```sh
printf 'help\n' | npm run cli --silent
```

检查命令：

```sh
npm run typecheck
npm test
npm run build
```

`npm run check` 一次执行类型检查、构建和测试。编译产物位于 `dist/`，不提交到 Git。

## 文档

- [作业原文](phase_cli_1.md)
- [架构方案、过程记录、自查与质量保证](doc/README.md)
- [PlantUML 模块依赖图源文件](doc/architecture.puml)

开发按里程碑分步提交并推送。完成全部要求且验收通过后，才创建并推送 `final` 标签。
