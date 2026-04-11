"""
原子操作执行器
负责执行 ADD_COMPONENT, REMOVE_COMPONENT 等原子操作
"""
import uuid
import json
from abc import ABC, abstractmethod
from typing import Any, Optional
from dataclasses import dataclass


# 默认组件配置
DEFAULT_CHART_CONFIG = {
    "line": {"grid": {"top": 40, "right": 30, "bottom": 30, "left": 50}, "tooltip": {"trigger": "axis"}},
    "bar": {"grid": {"top": 40, "right": 30, "bottom": 30, "left": 50}, "tooltip": {"trigger": "axis"}},
    "pie": {"tooltip": {"trigger": "item"}, "series": [{"type": "pie", "radius": "60%", "data": []}]},
    "gauge": {"series": [{"type": "gauge", "startAngle": 180, "endAngle": 0, "max": 100, "data": [{"value": 0}]}]},
    "candlestick": {"xAxis": {"type": "category", "data": []}, "yAxis": {"type": "value"}, "series": [{"type": "candlestick", "data": []}]},
    "number": {"displayValue": 0, "unit": ""},
    "table": {"columns": [], "dataSource": []},
}

DEFAULT_SQL = {
    "line": "SELECT month as name, sales as value FROM monthly_sales ORDER BY month",
    "bar": "SELECT region as name, q1 as value FROM regional_sales",
    "pie": "SELECT category as name, revenue as value FROM product_revenue",
    "gauge": "SELECT value FROM kpi_metrics WHERE metric_name='营业收入完成率'",
    "candlestick": "SELECT trade_date as date, open_price as open, close_price as close, high_price as high, low_price as low FROM stock_price ORDER BY trade_date",
    "number": "SELECT value FROM kpi_metrics WHERE metric_name='全年营收'",
    "table": "SELECT department, employee_count, avg_salary, total_salary FROM department_stats",
}

DEFAULT_TITLES = {
    "line": "折线图",
    "bar": "柱状图",
    "pie": "饼图",
    "gauge": "仪表盘",
    "candlestick": "K线图",
    "number": "数字卡片",
    "table": "表格",
}


def generate_id() -> str:
    """生成随机 ID"""
    return uuid.uuid4().hex[:8]


@dataclass
class OperationResult:
    """操作结果"""
    success: bool
    message: str
    data: Optional[dict] = None
    error: Optional[str] = None


class AtomicOperation(ABC):
    """原子操作基类"""

    @property
    @abstractmethod
    def operation_id(self) -> str:
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        pass

    @abstractmethod
    async def execute(self, params: dict, state: dict) -> tuple[OperationResult, dict]:
        """
        执行操作

        Args:
            params: 操作参数
            state: 当前状态 {components, layout}

        Returns:
            (结果, 新状态)
        """
        pass

    async def validate(self, params: dict) -> tuple[bool, str]:
        """验证参数是否合法"""
        return True, ""


class AddComponentOperation(AtomicOperation):
    """添加组件操作"""

    @property
    def operation_id(self) -> str:
        return "ADD_COMPONENT"

    @property
    def description(self) -> str:
        return "在画布上添加新组件"

    async def execute(self, params: dict, state: dict) -> tuple[OperationResult, dict]:
        comp_type = params.get("type")
        if comp_type not in DEFAULT_TITLES:
            return OperationResult(False, f"不支持的组件类型: {comp_type}"), state

        position = params.get("position", {"x": 0, "y": 0})
        size = params.get("size", {"w": 6, "h": 4})

        component_id = generate_id()
        layout_item = {
            "i": component_id,
            "x": position.get("x", 0),
            "y": position.get("y", 0),
            "w": size.get("w", 6),
            "h": size.get("h", 4),
            "minW": 2,
            "minH": 2,
        }

        data_source = {
            "sourceType": params.get("dataSource", {}).get("sourceType", "finance-sql"),
            "sql": params.get("dataSource", {}).get("sql") or DEFAULT_SQL.get(comp_type, ""),
        }

        new_component = {
            "id": component_id,
            "type": comp_type,
            "title": params.get("title") or DEFAULT_TITLES.get(comp_type, "图表"),
            "layout": layout_item,
            "dataSource": data_source,
            "chartConfig": params.get("chartConfig") or DEFAULT_CHART_CONFIG.get(comp_type, {}),
            "refreshInterval": 0,
        }

        new_components = state.get("components", []) + [new_component]
        new_layout = state.get("layout", []) + [layout_item]

        new_state = {
            "components": new_components,
            "layout": new_layout,
        }

        return OperationResult(
            True,
            f"已添加 {DEFAULT_TITLES.get(comp_type, '图表')} (ID: {component_id})",
            {"componentId": component_id}
        ), new_state


class RemoveComponentOperation(AtomicOperation):
    """删除组件操作"""

    @property
    def operation_id(self) -> str:
        return "REMOVE_COMPONENT"

    @property
    def description(self) -> str:
        return "删除画布上的组件"

    async def validate(self, params: dict) -> tuple[bool, str]:
        if not params.get("componentId"):
            return False, "缺少 componentId 参数"
        return True, ""

    async def execute(self, params: dict, state: dict) -> tuple[OperationResult, dict]:
        component_id = params.get("componentId")
        components = state.get("components", [])
        layout = state.get("layout", [])

        # 查找组件
        comp = next((c for c in components if c.get("id") == component_id), None)
        if not comp:
            return OperationResult(False, f"未找到组件: {component_id}"), state

        new_components = [c for c in components if c.get("id") != component_id]
        new_layout = [l for l in layout if l.get("i") != component_id]

        new_state = {
            "components": new_components,
            "layout": new_layout,
        }

        return OperationResult(
            True,
            f"已删除组件: {comp.get('title', '未知')}",
            {"removedId": component_id}
        ), new_state


class UpdateComponentOperation(AtomicOperation):
    """更新组件操作"""

    @property
    def operation_id(self) -> str:
        return "UPDATE_COMPONENT"

    @property
    def description(self) -> str:
        return "更新组件属性"

    async def validate(self, params: dict) -> tuple[bool, str]:
        if not params.get("componentId"):
            return False, "缺少 componentId 参数"
        return True, ""

    async def execute(self, params: dict, state: dict) -> tuple[OperationResult, dict]:
        component_id = params.get("componentId")
        updates = params.get("updates", {})
        components = state.get("components", [])

        # 查找并更新组件
        comp_index = next((i for i, c in enumerate(components) if c.get("id") == component_id), None)
        if comp_index is None:
            return OperationResult(False, f"未找到组件: {component_id}"), state

        new_components = components.copy()
        old_comp = new_components[comp_index]

        # 深度合并 updates
        if "title" in updates:
            old_comp["title"] = updates["title"]
        if "dataSource" in updates:
            old_comp["dataSource"] = {**old_comp.get("dataSource", {}), **updates["dataSource"]}
        if "chartConfig" in updates:
            old_comp["chartConfig"] = {**old_comp.get("chartConfig", {}), **updates["chartConfig"]}

        new_state = {
            **state,
            "components": new_components,
        }

        return OperationResult(
            True,
            f"已更新组件: {old_comp.get('title', '未知')}",
            {"componentId": component_id, "updatedFields": list(updates.keys())}
        ), new_state


class MoveComponentOperation(AtomicOperation):
    """移动组件操作"""

    @property
    def operation_id(self) -> str:
        return "MOVE_COMPONENT"

    @property
    def description(self) -> str:
        return "移动组件位置"

    async def validate(self, params: dict) -> tuple[bool, str]:
        if not params.get("componentId"):
            return False, "缺少 componentId 参数"
        if not params.get("position"):
            return False, "缺少 position 参数"
        return True, ""

    async def execute(self, params: dict, state: dict) -> tuple[OperationResult, dict]:
        component_id = params.get("componentId")
        position = params.get("position", {})
        components = state.get("components", [])
        layout = state.get("layout", [])

        # 更新组件的 layout
        new_components = components.copy()
        new_layout = layout.copy()

        for i, c in enumerate(new_components):
            if c.get("id") == component_id:
                if "layout" not in new_components[i]:
                    new_components[i]["layout"] = {}
                new_components[i]["layout"]["x"] = position.get("x", 0)
                new_components[i]["layout"]["y"] = position.get("y", 0)
                break

        for i, l in enumerate(new_layout):
            if l.get("i") == component_id:
                new_layout[i]["x"] = position.get("x", 0)
                new_layout[i]["y"] = position.get("y", 0)
                break

        new_state = {
            **state,
            "components": new_components,
            "layout": new_layout,
        }

        return OperationResult(
            True,
            f"已移动组件到 ({position.get('x', 0)}, {position.get('y', 0)})",
            {"componentId": component_id, "position": position}
        ), new_state


class ResizeComponentOperation(AtomicOperation):
    """调整组件大小操作"""

    @property
    def operation_id(self) -> str:
        return "RESIZE_COMPONENT"

    @property
    def description(self) -> str:
        return "调整组件大小"

    async def validate(self, params: dict) -> tuple[bool, str]:
        if not params.get("componentId"):
            return False, "缺少 componentId 参数"
        if not params.get("size"):
            return False, "缺少 size 参数"
        return True, ""

    async def execute(self, params: dict, state: dict) -> tuple[OperationResult, dict]:
        component_id = params.get("componentId")
        size = params.get("size", {})
        components = state.get("components", [])
        layout = state.get("layout", [])

        # 更新组件的 layout
        new_components = components.copy()
        new_layout = layout.copy()

        for i, c in enumerate(new_components):
            if c.get("id") == component_id:
                if "layout" not in new_components[i]:
                    new_components[i]["layout"] = {}
                new_components[i]["layout"]["w"] = size.get("w", 6)
                new_components[i]["layout"]["h"] = size.get("h", 4)
                break

        for i, l in enumerate(new_layout):
            if l.get("i") == component_id:
                new_layout[i]["w"] = size.get("w", 6)
                new_layout[i]["h"] = size.get("h", 4)
                break

        new_state = {
            **state,
            "components": new_components,
            "layout": new_layout,
        }

        return OperationResult(
            True,
            f"已调整组件大小为 {size.get('w', 6)}x{size.get('h', 4)}",
            {"componentId": component_id, "size": size}
        ), new_state


class UpdateThemeOperation(AtomicOperation):
    """更新主题操作"""

    @property
    def operation_id(self) -> str:
        return "UPDATE_THEME"

    @property
    def description(self) -> str:
        return "更新大屏主题"

    async def validate(self, params: dict) -> tuple[bool, str]:
        valid_themes = ["dark", "light", "blue", "green", "purple", "red"]
        if params.get("theme") not in valid_themes:
            return False, f"无效的主题: {params.get('theme')}"
        return True, ""

    async def execute(self, params: dict, state: dict) -> tuple[OperationResult, dict]:
        new_state = {
            **state,
            "theme": params.get("theme", "light"),
        }

        theme_names = {
            "dark": "暗色",
            "light": "亮色",
            "blue": "科技蓝",
            "green": "翠绿",
            "purple": "梦幻紫",
            "red": "警戒红",
        }

        return OperationResult(
            True,
            f"已切换到 {theme_names.get(params.get('theme', ''), params.get('theme'))} 主题",
            {"theme": params.get("theme")}
        ), new_state


class OperationExecutor:
    """
    操作执行器，管理所有原子操作
    """

    def __init__(self):
        self.operations: dict[str, AtomicOperation] = {}
        self._register_operations()

    def _register_operations(self):
        """注册所有原子操作"""
        self.operations["ADD_COMPONENT"] = AddComponentOperation()
        self.operations["REMOVE_COMPONENT"] = RemoveComponentOperation()
        self.operations["UPDATE_COMPONENT"] = UpdateComponentOperation()
        self.operations["MOVE_COMPONENT"] = MoveComponentOperation()
        self.operations["RESIZE_COMPONENT"] = ResizeComponentOperation()
        self.operations["UPDATE_THEME"] = UpdateThemeOperation()

    async def execute(self, operation_id: str, params: dict, state: dict) -> tuple[OperationResult, dict]:
        """
        执行单个操作

        Args:
            operation_id: 操作类型
            params: 操作参数
            state: 当前状态

        Returns:
            (结果, 新状态)
        """
        if operation_id not in self.operations:
            return OperationResult(False, f"未知操作: {operation_id}"), state

        op = self.operations[operation_id]

        # 验证参数
        valid, msg = await op.validate(params)
        if not valid:
            return OperationResult(False, f"参数验证失败: {msg}"), state

        # 执行操作
        return await op.execute(params, state)

    async def execute_batch(self, operations: list[dict], initial_state: dict) -> list[tuple[OperationResult, dict]]:
        """
        批量执行操作

        Args:
            operations: 操作列表，每个元素包含 operation 和 params
            initial_state: 初始状态

        Returns:
            [(结果, 新状态), ...]
        """
        results = []
        current_state = initial_state

        for op_spec in operations:
            operation_id = op_spec.get("operation")
            params = op_spec.get("params", {})
            result, current_state = await self.execute(operation_id, params, current_state)
            results.append((result, current_state))

        return results
