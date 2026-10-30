# SVG Editor CLI

高级软件工程 Lab1 Phase 1：使用 TypeScript 和面向对象设计实现命令行 SVG 编辑器。

## 当前进度

里程碑 3：已接入 `init/create/tree/move`，可以在终端创建六种图形、建立嵌套容器、查看结构树并移动图形或整组。
48 项测试通过：28 项模型测试、18 项命令/会话测试、原有 2 项 CLI 测试。

模型层还支持缩放、属性修改、分组/解组、重新归属、删除、层叠顺序和独立快照，这些编辑命令将在后续接入。
文件读写和 `undo/redo` 尚未实现，`help` 会区分当前可用命令与后续计划。

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

## 命令行示例

启动 `npm run cli` 后依次输入（不需要输入 `svg>`）：

```text
init 800 600
create g node
create rect box 120 100 160 60 #4a90d9 in node
create text label 155 135 "开始" in node
move node 0 100
tree
```

最后的结构树为：

```text
svg (800x600)
└── g#node
    ├── rect#box x=120 y=200 w=160 h=60 fill=#4a90d9
    └── text#label (155,235) "开始"
```

`tree node` 只显示指定子树；`init` 默认 800×600，`init 400` 默认高度为 600。
重新 `init` 会创建空文档；参数非法则保留原文档。`create` 的尾部可使用 `in <containerId>`，支持任意层级嵌套。
文字含空格时用双引号，整行 `#` 注释和十六进制颜色参数可同时使用。

回放作业中的双节点流程图（本阶段支持的创建、移动和查看部分）：

```sh
npm run cli --silent < examples/milestone3.commands
```

## 检查

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
