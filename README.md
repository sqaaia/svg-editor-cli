# SVG Editor CLI

高级软件工程 Lab1 Phase 1：使用 TypeScript 和面向对象设计实现命令行 SVG 编辑器。

## 当前进度

里程碑 2：图形模型与分组已实现，包含六种图形、递归移动/缩放、属性白名单、唯一 ID、
分组/解组、重新归属、删除、层叠顺序及独立文档快照。28 项模型测试和 2 项 CLI 测试通过。

命令行目前仍只可执行 `help`，支持逐行输入、整行注释、双引号参数和统一错误输出。
模型操作尚未接入 CLI；`init/create/tree/move` 的命令接入是下一步。文件读写和 `undo/redo` 也尚未实现。

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

## 模型使用示例

构建后，可在 Node.js 的 ES module 中调用模型：

```js
import { SvgDocument } from './dist/model/SvgDocument.js';
import { Group } from './dist/model/Group.js';
import { Rect } from './dist/model/Rect.js';
import { Text } from './dist/model/Text.js';

const document = new SvgDocument();
document.add(new Group('node'));
document.add(new Rect('box', 120, 100, 160, 60), 'node');
document.add(new Text('label', 155, 135, '开始'), 'node');
document.move('node', 0, 100);
console.log(document.get('label').attributes); // { x: 155, y: 235 }
```

图形对象不可变：直接调用 `shape.move/scale/set` 会返回新对象。修改当前文档应调用 `document` 的对应方法；
编辑后通过 `document.get(id)` 获取最新对象。读取到的属性和子节点数组不能用于绕过模型修改状态。

## 文档

- [作业原文](phase_cli_1.md)
- [架构方案、过程记录、自查与质量保证](doc/README.md)
- [PlantUML 模块依赖图源文件](doc/architecture.puml)

开发按里程碑分步提交并推送。完成全部要求且验收通过后，才创建并推送 `final` 标签。
