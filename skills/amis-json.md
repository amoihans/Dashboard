# Amis JSON 生成技能

## 简介

amis 是百度开源的低代码前端框架，通过 JSON 配置即可生成完整的页面。本技能帮助 AI agent 根据自然语言描述生成符合 amis 规范的 JSON 配置。

**文档参考**: [amis 官方文档](https://aisuda.bce.baidu.com/amis/zh-CN/docs/index)

---

## 核心概念

### 页面结构

amis JSON 必须包含 `type` 字段指定渲染器类型。

```json
{
  "type": "page",
  "title": "页面标题",
  "body": ["组件内容"]
}
```

### 常用顶层类型

| type | 说明 | 文档位置 |
|------|------|----------|
| `page` | 页面容器 | [page.md](../amis_docs/components/page.md) |
| `crud` | 增删改查表格 | [crud.md](../amis_docs/components/crud.md) |
| `form` | 表单 | [form/index.md](../amis_docs/components/form/index.md) |
| `dialog` | 对话框 | [dialog.md](../amis_docs/components/dialog.md) |
| `wizard` | 分步向导 | |
| `app` | 多页应用 | |

---

## 组件分类速查

### 布局组件

| type | 说明 | 备注 |
|------|------|------|
| `page` | 页面容器 | 顶层入口 |
| `grid` | 水平分栏 | `columns` 数组 |
| `flex` | 弹性布局 | |
| `crud` | 数据表格 | 带 API 自动请求 |
| `table` | 静态表格 | 需搭配 service |
| `cards` | 卡片列表 | |
| `list` | 列表 | |
| `tabs` | 标签页 | `tabs` 数组 |
| `collapse` | 折叠面板 | |
| `carousel` | 轮播 | |

### 表单组件

| type | 说明 |
|------|------|
| `form` | 表单容器 |
| `input-text` | 文本输入 |
| `input-number` / `input-range` | 数字/范围输入 |
| `input-email` | 邮箱 |
| `input-password` | 密码 |
| `input-textarea` | 多行文本 |
| `input-date` | 日期 |
| `input-datetime` | 日期时间 |
| `input-time` | 时间 |
| `input-date-range` | 日期范围 |
| `select` / `input-select` | 下拉选择 |
| `multi-select` | 多选 |
| `checkbox` | 单个复选框 |
| `checkboxes` | 复选框组 |
| `radio` / `radios` | 单选框组 |
| `switch` | 开关 |
| `input-file` | 文件上传 |
| `input-image` | 图片上传 |
| `input-tree` | 树形选择 |
| `nested-select` | 树形下拉 |
| `input-city` | 城市选择 |
| `input-color` | 颜色选择 |
| `input-rating` | 评分 |
| `input-tag` | 标签输入 |
| `rich-text` / `editor` | 富文本/代码编辑器 |
| `input-repeat` | 周期重复 |
| `input-formula` | 公式 |
| `combo` | 组合编辑 |
| `condition-builder` | 条件构建器 |

### 展示组件

| type | 说明 |
|------|------|
| `plain` / `tpl` | 文本/模板 |
| `markdown` | Markdown |
| `progress` | 进度条 |
| `status` | 状态图标 |
| `tags` | 标签组 |
| `mapping` | 映射/枚举 |
| `image` | 图片 |
| `carousel` | 轮播 |
| `video` | 视频 |
| `audio` | 音频 |
| `qrcode` | 二维码 |
| `barcode` | 条形码 |
| `icon` | 图标 |
| `color` | 颜色块 |
| `json` | JSON 展示 |

### 操作组件

| type | 说明 |
|------|------|
| `button` | 按钮 |
| `submit` | 提交按钮 |
| `reset` | 重置按钮 |
| `action` | 行为按钮 |
| `button-toolbar` | 按钮工具栏 |
| `button-group` | 按钮组 |
| `dropdown-button` | 下拉按钮 |

### 容器组件

| type | 说明 |
|------|------|
| `dialog` | 对话框 |
| `drawer` | 抽屉 |
| `modal` | 模态框 |
| `alert` | 提示框 |
| `toast` | 轻提示 |
| `badge` | 徽标 |
| `avatar` | 头像 |
| `calendar` | 日历 |

---

## 常用属性

### 通用属性

| 属性 | 说明 |
|------|------|
| `type` | 组件类型（必须） |
| `name` | 字段名，用于数据绑定 |
| `label` | 标签文字 |
| `value` | 默认值 |
| `disabled` | 是否禁用 |
| `hidden` / `visible` | 显示/隐藏控制 |
| `className` | 自定义 CSS 类 |
| `id` | 组件唯一 ID |

### 布局相关

| 属性 | 说明 |
|------|------|
| `mode` | `normal` / `horizontal` / `inline` |
| `size` | `xs` / `sm` / `md` / `lg` |
| `labelWidth` | 标签宽度 |
| `labelAlign` | `left` / `right` |
| `columnCount` | 列数 |
| `gap` | 间距 |

### 数据相关

| 属性 | 说明 |
|------|------|
| `api` | API 地址（格式: `method:/path`） |
| `source` | 数据源表达式 |
| `data` | 静态数据 |
| `initApi` | 初始化 API |
| `value` | 默认值 |
| `options` | 选项数组 |

### 按钮相关

| 属性 | 说明 |
|------|------|
| `actionType` | `button` / `submit` / `reset` / `dialog` / `ajax` / `url` |
| `level` | `primary` / `secondary` / `info` / `success` / `warning` / `danger` / `light` / `dark` |
| `dialog` | 对话框配置 |
| `api` | API 请求配置 |
| `close` | 关闭弹窗 |

---

## API 格式

```
GET:/api/list
POST:/api/create
PUT:/api/update/$id
DELETE:/api/delete/$id
```

---

## 模板示例

### 1. 页面 + 网格布局

```json
{
  "type": "page",
  "title": "页面标题",
  "toolbar": ["顶部工具栏"],
  "body": [
    {
      "type": "grid",
      "columns": [
        { "body": ["组件1", "组件2"] },
        { "body": ["组件3"] }
      ]
    }
  ],
  "aside": ["侧边栏内容"]
}
```

### 2. CRUD 增删改查表格

```json
{
  "type": "page",
  "body": {
    "type": "crud",
    "api": "get:/api/users",
    "columns": [
      {
        "name": "id",
        "label": "ID",
        "width": 80
      },
      {
        "name": "name",
        "label": "姓名"
      },
      {
        "name": "email",
        "label": "邮箱"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "mapping",
        "map": {
          "1": "<span class='label label-success'>启用</span>",
          "0": "<span class='label label-danger'>禁用</span>"
        }
      },
      {
        "type": "operation",
        "label": "操作",
        "buttons": [
          {
            "type": "button",
            "label": "编辑",
            "actionType": "dialog",
            "dialog": {
              "title": "编辑用户",
              "body": {
                "type": "form",
                "api": "put:/api/users/$id",
                "body": [
                  { "type": "input-text", "name": "name", "label": "姓名" },
                  { "type": "input-email", "name": "email", "label": "邮箱" }
                ]
              }
            }
          },
          {
            "type": "button",
            "label": "删除",
            "actionType": "ajax",
            "api": "delete:/api/users/$id",
            "level": "danger"
          }
        ]
      }
    ],
    "filter": {
      "body": [
        { "type": "input-text", "name": "keyword", "placeholder": "搜索..." },
        { "type": "button", "label": "搜索", "actionType": "submit", "level": "primary" }
      ]
    },
    "headerToolbar": [
      {
        "type": "button",
        "label": "新增用户",
        "actionType": "dialog",
        "level": "primary",
        "dialog": {
          "title": "新增用户",
          "body": {
            "type": "form",
            "api": "post:/api/users",
            "body": [
              { "type": "input-text", "name": "name", "label": "姓名", "required": true },
              { "type": "input-email", "name": "email", "label": "邮箱", "required": true }
            ]
          }
        }
      }
    ]
  }
}
```

### 3. 表单

```json
{
  "type": "page",
  "body": {
    "type": "form",
    "api": "post:/api/submit",
    "title": "用户信息",
    "mode": "horizontal",
    "labelWidth": 120,
    "body": [
      {
        "type": "input-text",
        "name": "username",
        "label": "用户名",
        "required": true,
        "placeholder": "请输入用户名"
      },
      {
        "type": "input-password",
        "name": "password",
        "label": "密码",
        "required": true
      },
      {
        "type": "input-email",
        "name": "email",
        "label": "邮箱",
        "required": true,
        "validations": {
          "isEmail": true
        }
      },
      {
        "type": "select",
        "name": "role",
        "label": "角色",
        "options": [
          { "label": "管理员", "value": "admin" },
          { "label": "普通用户", "value": "user" },
          { "label": "访客", "value": "guest" }
        ]
      },
      {
        "type": "radios",
        "name": "gender",
        "label": "性别",
        "options": [
          { "label": "男", "value": "male" },
          { "label": "女", "value": "female" }
        ]
      },
      {
        "type": "checkbox",
        "name": "agree",
        "label": "同意协议",
        "option": "我已阅读并同意相关协议"
      }
    ],
    "actions": [
      { "type": "submit", "label": "提交", "level": "primary" },
      { "type": "reset", "label": "重置" }
    ]
  }
}
```

### 4. 对话框

```json
{
  "type": "button",
  "label": "打开对话框",
  "actionType": "dialog",
  "dialog": {
    "title": "对话框标题",
    "size": "md",
    "body": [
      { "type": "tpl", "tpl": "对话框内容" }
    ],
    "actions": [
      {
        "type": "button",
        "actionType": "confirm",
        "label": "确定",
        "primary": true
      },
      {
        "type": "button",
        "actionType": "cancel",
        "label": "取消"
      }
    ]
  }
}
```

### 5. 标签页

```json
{
  "type": "tabs",
  "tabs": [
    {
      "title": "标签页1",
      "tab": "内容1"
    },
    {
      "title": "标签页2",
      "tab": "内容2"
    },
    {
      "title": "标签页3",
      "tab": "内容3"
    }
  ]
}
```

### 6. Grid 网格布局

```json
{
  "type": "grid",
  "columns": [
    {
      "columnClassName": "bg-blue-100",
      "body": [
        { "type": "tpl", "tpl": "第一栏" }
      ]
    },
    {
      "columnClassName": "bg-green-100",
      "body": [
        { "type": "tpl", "tpl": "第二栏" }
      ]
    }
  ]
}
```

### 7. 按钮组

```json
{
  "type": "button-toolbar",
  "buttons": [
    { "type": "button", "label": "按钮1", "level": "primary" },
    { "type": "button", "label": "按钮2", "level": "default" },
    { "type": "button", "label": "危险", "level": "danger" }
  ]
}
```

### 8. 卡片列表

```json
{
  "type": "crud",
  "api": "get:/api/cards",
  "mode": "cards",
  "columns": [
    {
      "name": "title",
      "label": "标题",
      "type": "text"
    },
    {
      "name": "description",
      "label": "描述"
    },
    {
      "type": "image",
      "name": "image",
      "label": "图片"
    }
  ]
}
```

---

## 组件选项格式

### select / radio / checkboxes 选项

```json
"options": [
  { "label": "显示文本", "value": "实际值" },
  { "label": "选项2", "value": "value2", "disabled": true }
]
```

### mapping 映射

```json
"map": {
  "key1": "显示值1",
  "key2": "<span class='label'>显示值2</span>",
  "*": "默认值"
}
```

### date 日期格式

```json
{
  "type": "input-date",
  "format": "YYYY-MM-DD",
  "inputFormat": "YYYY-MM-DD",
  "valueFormat": "X"
}
```

---

## 常用表达式

- `${fieldName}` - 获取字段值
- `${fieldName|default:'默认值'}` - 带默认值
- `${fieldName|raw}` - 原始值
- `${fieldName|json}` - JSON 序列化
- `${fieldName|number}` - 数字格式化
- `${fieldName|truncate:10}` - 截断

---

## 事件与动作

### 按钮 actionType

| actionType | 说明 |
|------------|------|
| `button` | 普通按钮 |
| `submit` | 提交表单 |
| `reset` | 重置表单 |
| `dialog` | 打开对话框 |
| `ajax` | 发送 AJAX 请求 |
| `url` | 跳转链接 |
| `reload` | 刷新组件 |
| `setValue` | 设置值 |

### 事件绑定

```json
{
  "type": "button",
  "label": "点击",
  "onEvent": {
    "click": {
      "actions": [
        {
          "actionType": "toast",
          "args": {
            "msgType": "success",
            "msg": "操作成功"
          }
        }
      ]
    }
  }
}
```

---

## 生成检查清单

生成 JSON 时确保：

1. ✅ 最外层有 `type` 字段
2. ✅ 组件嵌套使用 `body`、`columns` 或 `tabs`
3. ✅ `name` 属性用于数据绑定
4. ✅ `options` 格式正确（label/value 对）
5. ✅ API 路径格式正确（如 `get:/api/xxx`）
6. ✅ `actions` 包含提交/重置按钮
7. ✅ CRUD 有 `columns` 定义列
8. ✅ 按钮有 `actionType` 指定行为
9. ✅ JSON 语法正确（引号、逗号、括号配对）

---

## 组件文档索引

完整组件文档位于 `amis_docs/components/` 目录下：

- [page.md](../amis_docs/components/page.md) - 页面容器
- [form/index.md](../amis_docs/components/form/index.md) - 表单
- [crud.md](../amis_docs/components/crud.md) - 数据表格
- [table.md](../amis_docs/components/table.md) - 静态表格
- [dialog.md](../amis_docs/components/dialog.md) - 对话框
- [button.md](../amis_docs/components/button.md) - 按钮
- [tabs.md](../amis_docs/components/tabs.md) - 标签页
- [grid.md](../amis_docs/components/grid.md) - 网格布局

---

## 响应格式

生成的 JSON 应：

1. 使用 2 空格缩进
2. 属性按重要程度排序（type > name > label > 其他）
3. 包含必要的注释说明复杂配置
4. 提供完整的可执行 JSON
