"""
Agent 记忆系统
参考 learn-claude-code s09 Memory System
采用文件持久化 + 提示词注入模式
"""
import re
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field

# 记忆存储根目录
MEMORY_DIR = Path("backend/.memory")
MEMORY_TYPES = ("user", "feedback", "project", "reference")
MAX_INDEX_LINES = 200


@dataclass
class MemoryEntry:
    """记忆条目"""
    name: str
    description: str
    mem_type: str
    content: str
    file: str = ""


class MemoryManager:
    """
    记忆管理器 - 从文件加载、构建提示词、保存记忆

    存储结构：
    .memory/
        MEMORY.md          # 索引文件
        canvas_context.md  # 画布上下文
        user_preferences.md
        ...
    """

    def __init__(self, memory_dir: Path = MEMORY_DIR):
        self.memory_dir = memory_dir
        self.memories: dict[str, MemoryEntry] = {}

    def load_all(self):
        """会话启动时加载所有记忆"""
        self.memories = {}
        if not self.memory_dir.exists():
            return

        for md_file in sorted(self.memory_dir.glob("*.md")):
            if md_file.name == "MEMORY.md":
                continue
            try:
                parsed = self._parse_frontmatter(md_file.read_text(encoding='utf-8'))
                if parsed:
                    name = parsed.get("name", md_file.stem)
                    self.memories[name] = MemoryEntry(
                        name=name,
                        description=parsed.get("description", ""),
                        mem_type=parsed.get("type", "project"),
                        content=parsed.get("content", ""),
                        file=md_file.name,
                    )
            except UnicodeDecodeError:
                # 忽略编码错误的文件
                print(f"[Memory] Skipping file with encoding error: {md_file.name}")
                continue

        count = len(self.memories)
        if count > 0:
            print(f"[Memory loaded: {count} memories from {self.memory_dir}]")

    def load_memory_prompt(self) -> str:
        """
        构建注入到 system prompt 的记忆段落

        格式：
        # Memories (persistent across sessions)

        ## [user]
        ### theme_preference: 主题偏好
        偏好暗色主题...
        ...
        """
        if not self.memories:
            return ""

        sections = ["# Memories (persistent across sessions)", ""]

        for mem_type in MEMORY_TYPES:
            typed = {k: v for k, v in self.memories.items() if v.mem_type == mem_type}
            if not typed:
                continue
            sections.append(f"## [{mem_type}]")
            for name, mem in typed.items():
                sections.append(f"### {name}: {mem.description}")
                if mem.content.strip():
                    sections.append(mem.content.strip())
                sections.append("")

        return "\n".join(sections)

    def save_memory(self, name: str, description: str, mem_type: str, content: str) -> str:
        """
        保存记忆到磁盘

        Args:
            name: 记忆标识符
            description: 一行描述
            mem_type: 记忆类型 (user/feedback/project/reference)
            content: 记忆内容

        Returns:
            状态消息
        """
        if mem_type not in MEMORY_TYPES:
            return f"Error: type must be one of {MEMORY_TYPES}"

        safe_name = re.sub(r"[^a-zA-Z0-9_-]", "_", name.lower())
        if not safe_name:
            return "Error: invalid memory name"

        self.memory_dir.mkdir(parents=True, exist_ok=True)

        # 写入记忆文件（带 frontmatter）
        frontmatter = (
            f"---\n"
            f"name: {name}\n"
            f"description: {description}\n"
            f"type: {mem_type}\n"
            f"---\n"
            f"{content}\n"
        )
        file_name = f"{safe_name}.md"
        file_path = self.memory_dir / file_name
        file_path.write_text(frontmatter, encoding='utf-8')

        # 更新内存
        self.memories[name] = MemoryEntry(
            name=name,
            description=description,
            mem_type=mem_type,
            content=content,
            file=file_name,
        )

        # 重建索引
        self._rebuild_index()

        return f"Saved memory '{name}' [{mem_type}]"

    def get_canvas_context(self) -> str:
        """获取当前画布状态摘要"""
        if not self.memories.get("canvas_context"):
            return ""
        return self.memories["canvas_context"].content

    def update_canvas_context(self, components: list, layout: list):
        """
        更新画布上下文记忆

        Args:
            components: 组件配置列表
            layout: 布局列表
        """
        summary = []
        for i, comp in enumerate(components):
            summary.append(
                f"{i+1}. {comp.get('type', 'unknown')} - "
                f"ID: {comp.get('id', '')} - "
                f"标题: {comp.get('title', '未命名')} - "
                f"位置: ({comp.get('layout', {}).get('x', 0)}, {comp.get('layout', {}).get('y', 0)})"
            )
        content = "\n".join(summary) if summary else "（空画布）"

        self.save_memory(
            name="canvas_context",
            description="当前画布组件状态",
            mem_type="project",
            content=content
        )

    def resolve_component_reference(self, user_message: str) -> Optional[dict]:
        """
        根据用户描述解析组件引用

        用户说"把那个折线图删掉" → 从 canvas_context 中查找 type='line' 的组件

        Returns:
            {"componentId": "xxx", "source": "canvas_context"} 或 None
        """
        canvas_ctx = self.get_canvas_context()
        if not canvas_ctx:
            return None

        user_msg_lower = user_message.lower()

        # 组件类型映射
        type_mapping = {
            "折线图": "line",
            "柱状图": "bar",
            "饼图": "pie",
            "仪表盘": "gauge",
            "k线图": "candlestick",
            "k线": "candlestick",
            "数字卡片": "number",
            "表格": "table",
            "自定义组件": "custom",
            "卡片": "custom",
            "自定义": "custom",
        }

        # 查找匹配的类型
        matched_type = None
        for chinese_name, type_id in type_mapping.items():
            if chinese_name in user_msg_lower:
                matched_type = type_id
                break

        if matched_type:
            # 在 canvas_context 中查找匹配类型的组件
            lines = canvas_ctx.split("\n")
            for line in reversed(lines):
                if matched_type in line:
                    # 提取 ID
                    match = re.search(r"ID: (\w+)", line)
                    if match:
                        return {"componentId": match.group(1), "source": "canvas_context"}

        # 按标题查找：提取标题关键词
        # 查找包含"删除"、"移动"、"更新"等动词后的名词短语
        # 例如："删除销售图表" → 查找标题包含"销售"的组件
        # 例如："移动左边的卡片" → 查找标题包含"卡片"的组件

        # 移除常见动词和位置词
        stop_words = ["删除", "移动", "更新", "调整", "改变", "修改", "添加", "左上角", "右上角", "中间", "左边", "右边", "上面", "下面", "那个", "这个", "这个", "的"]
        clean_msg = user_msg_lower
        for word in stop_words:
            clean_msg = clean_msg.replace(word, "")

        clean_msg = clean_msg.strip()
        if len(clean_msg) > 1:  # 有实际关键词
            # 查找标题包含关键词的组件
            lines = canvas_ctx.split("\n")
            for line in lines:
                # 从canvas_context中提取标题：标题: xxxx
                title_match = re.search(r"标题: (.+?)(?= -|$)", line)
                if title_match:
                    title = title_match.group(1).lower()
                    if clean_msg in title:
                        # 提取 ID
                        id_match = re.search(r"ID: (\w+)", line)
                        if id_match:
                            return {"componentId": id_match.group(1), "source": "title_match", "matched_keyword": clean_msg}

        # 处理序数词
        if "第一个" in user_msg_lower:
            lines = canvas_ctx.split("\n")
            if lines:
                match = re.search(r"ID: (\w+)", lines[0])
                if match:
                    return {"componentId": match.group(1), "source": "first_component"}

        if "最近一个" in user_msg_lower or "最后一个" in user_msg_lower:
            lines = canvas_ctx.split("\n")
            if lines:
                match = re.search(r"ID: (\w+)", lines[-1])
                if match:
                    return {"componentId": match.group(1), "source": "last_component"}

        return None

    def _parse_frontmatter(self, text: str) -> Optional[dict]:
        """解析 --- 分隔的 frontmatter"""
        match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)", text, re.DOTALL)
        if not match:
            return None
        header, body = match.group(1), match.group(2)
        result = {"content": body.strip()}
        for line in header.splitlines():
            if ":" in line:
                key, _, value = line.partition(":")
                result[key.strip()] = value.strip()
        return result

    def _rebuild_index(self):
        """重建 MEMORY.md 索引"""
        lines = ["# Memory Index", ""]
        for name, mem in self.memories.items():
            lines.append(f"- {name}: {mem.description} [{mem.mem_type}]")
            if len(lines) >= MAX_INDEX_LINES:
                lines.append(f"... (truncated at {MAX_INDEX_LINES} lines)")
                break
        self.memory_dir.mkdir(parents=True, exist_ok=True)
        try:
            (self.memory_dir / "MEMORY.md").write_text("\n".join(lines) + "\n", encoding='utf-8')
        except Exception as e:
            print(f"[Memory] Failed to write MEMORY.md: {e}")

    def add_user_message(self, content: str):
        """添加用户消息到对话历史"""
        self._add_conversation_item("user", content)

    def add_assistant_message(self, content: str):
        """添加助手消息到对话历史"""
        self._add_conversation_item("assistant", content)

    def _add_conversation_item(self, role: str, content: str):
        """内部方法：添加对话条目"""
        # 对话历史存储在 conversation_history.md
        conv_file = self.memory_dir / "conversation_history.md"
        self.memory_dir.mkdir(parents=True, exist_ok=True)

        timestamp = "unknown"  # 简化处理

        if conv_file.exists():
            existing = conv_file.read_text(encoding='utf-8')
        else:
            existing = ""

        new_entry = f"- **{role}**: {content}\n"
        updated = existing + new_entry

        # 限制对话历史长度（保留最近 100 条）
        lines = updated.split("\n")
        if len(lines) > 150:  # 留一些余量
            lines = lines[-100:]
            updated = "\n".join(lines)

        conv_file.write_text(updated, encoding='utf-8')

    def get_conversation_history(self) -> str:
        """获取对话历史（用于上下文）"""
        conv_file = self.memory_dir / "conversation_history.md"
        if not conv_file.exists():
            return ""
        return conv_file.read_text(encoding='utf-8')


# 全局记忆管理器实例
memory_mgr = MemoryManager()
