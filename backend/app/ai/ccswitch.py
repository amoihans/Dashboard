"""
cc-switch 配置读取模块
从 ~/.cc-switch/cc-switch.db 读取 AI Provider 配置
"""
import sqlite3
import json
import os
from pathlib import Path
from typing import Optional

CC_SWITCH_DB_PATH = Path.home() / ".cc-switch" / "cc-switch.db"


class CCSwitchConfig:
    """cc-switch 配置读取器"""

    @staticmethod
    def get_current_provider(app_type: str = "claude") -> Optional[dict]:
        """
        从 cc-switch 数据库获取当前激活的 provider 配置

        Returns:
            {
                "name": str,
                "api_key": str,
                "base_url": str,
                "model": str,
                "api_format": "anthropic" | "openai"
            }
        """
        if not CC_SWITCH_DB_PATH.exists():
            return None

        try:
            conn = sqlite3.connect(str(CC_SWITCH_DB_PATH))
            cursor = conn.cursor()

            cursor.execute(
                "SELECT name, settings_config FROM providers WHERE app_type = ? AND is_current = 1 LIMIT 1",
                (app_type,)
            )
            row = cursor.fetchone()
            conn.close()

            if not row:
                return None

            name, settings_config_json = row
            settings = json.loads(settings_config_json)
            env = settings.get("env", {})
            meta = settings.get("meta", {})

            return {
                "name": name,
                "api_key": env.get("ANTHROPIC_AUTH_TOKEN", ""),
                "base_url": env.get("ANTHROPIC_BASE_URL", ""),
                "model": env.get("ANTHROPIC_MODEL") or env.get("ANTHROPIC_DEFAULT_SONNET_MODEL", ""),
                "api_format": meta.get("apiFormat", "anthropic"),
            }

        except Exception as e:
            print(f"Error reading cc-switch config: {e}")
            return None

    @staticmethod
    def get_all_providers(app_type: str = "claude") -> list[dict]:
        """获取所有已配置的 providers"""
        if not CC_SWITCH_DB_PATH.exists():
            return []

        try:
            conn = sqlite3.connect(str(CC_SWITCH_DB_PATH))
            cursor = conn.cursor()

            cursor.execute(
                "SELECT name, settings_config, is_current FROM providers WHERE app_type = ? ORDER BY sort_index",
                (app_type,)
            )
            rows = cursor.fetchall()
            conn.close()

            providers = []
            for name, settings_config_json, is_current in rows:
                settings = json.loads(settings_config_json)
                env = settings.get("env", {})
                meta = settings.get("meta", {})

                providers.append({
                    "name": name,
                    "api_key": env.get("ANTHROPIC_AUTH_TOKEN", ""),
                    "base_url": env.get("ANTHROPIC_BASE_URL", ""),
                    "model": env.get("ANTHROPIC_MODEL") or env.get("ANTHROPIC_DEFAULT_SONNET_MODEL", ""),
                    "api_format": meta.get("apiFormat", "anthropic"),
                    "is_current": bool(is_current),
                })

            return providers

        except Exception as e:
            print(f"Error reading cc-switch providers: {e}")
            return []

    @staticmethod
    def is_available() -> bool:
        """检查 cc-switch 是否可用"""
        return CC_SWITCH_DB_PATH.exists()
