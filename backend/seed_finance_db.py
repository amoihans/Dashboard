"""
财经数据模拟数据库初始化脚本
运行方式: python seed_finance_db.py
"""
import sqlite3
import os
import random
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "finance.db")


def create_tables(conn: sqlite3.Connection):
    cursor = conn.cursor()

    # 月度销售数据 (供折线图、柱状图使用)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS monthly_sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            month TEXT NOT NULL,
            sales REAL NOT NULL,
            profit REAL NOT NULL,
            cost REAL NOT NULL
        )
    """)

    # 产品营收分布 (供饼图使用)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS product_revenue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            revenue REAL NOT NULL,
            percentage REAL NOT NULL
        )
    """)

    # KPI 指标 (供仪表盘、数字卡片使用)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS kpi_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_name TEXT NOT NULL,
            value REAL NOT NULL,
            target REAL NOT NULL,
            unit TEXT DEFAULT ''
        )
    """)

    # 股票/K线数据 (供K线图使用)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS stock_price (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trade_date TEXT NOT NULL,
            open_price REAL NOT NULL,
            close_price REAL NOT NULL,
            high_price REAL NOT NULL,
            low_price REAL NOT NULL,
            volume INTEGER NOT NULL
        )
    """)

    # 部门人员统计 (供表格使用)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS department_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            department TEXT NOT NULL,
            employee_count INTEGER NOT NULL,
            avg_salary REAL NOT NULL,
            total_salary REAL NOT NULL
        )
    """)

    # 区域销售 (供折线图、柱状图使用)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS regional_sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            region TEXT NOT NULL,
            q1 REAL NOT NULL,
            q2 REAL NOT NULL,
            q3 REAL NOT NULL,
            q4 REAL NOT NULL
        )
    """)

    conn.commit()


def seed_monthly_sales(conn: sqlite3.Connection):
    cursor = conn.cursor()
    # 清空现有数据
    cursor.execute("DELETE FROM monthly_sales")

    months = ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06",
              "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"]
    base_sales = 8500
    data = []
    for month in months:
        sales = base_sales + random.randint(-800, 1200)
        profit = sales * random.uniform(0.18, 0.28)
        cost = sales - profit
        data.append((month, round(sales, 2), round(profit, 2), round(cost, 2)))
    cursor.executemany("INSERT INTO monthly_sales (month, sales, profit, cost) VALUES (?, ?, ?, ?)", data)
    conn.commit()


def seed_product_revenue(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM product_revenue")

    categories = [
        ("电子产品", 4230000, 35.2),
        ("服装服饰", 2150000, 17.9),
        ("食品饮料", 1890000, 15.7),
        ("家居用品", 1560000, 13.0),
        ("美妆护肤", 980000, 8.2),
        ("运动户外", 720000, 6.0),
        ("图书文具", 450000, 3.7),
    ]
    # 修正百分比使其和为100
    categories = [
        ("电子产品", 4230000, 35.2),
        ("服装服饰", 2150000, 17.9),
        ("食品饮料", 1890000, 15.7),
        ("家居用品", 1560000, 13.0),
        ("美妆护肤", 980000, 8.2),
        ("运动户外", 720000, 6.0),
        ("图书文具", 450000, 3.7),
        ("其他", 65000, 0.3),
    ]
    cursor.executemany(
        "INSERT INTO product_revenue (category, revenue, percentage) VALUES (?, ?, ?)",
        categories
    )
    conn.commit()


def seed_kpi_metrics(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM kpi_metrics")

    metrics = [
        ("营业收入完成率", 87.5, 100, "%"),
        ("净利润率", 23.4, 30, "%"),
        ("用户增长率", 156000, 200000, "人"),
        ("存货周转天数", 45, 30, "天"),
        ("客户满意度", 92.3, 95, "%"),
        ("研发投入占比", 8.7, 10, "%"),
        ("员工离职率", 3.2, 5, "%"),
        ("全年营收", 12.45, 15, "亿元"),
        ("毛利率", 42.8, 45, "%"),
        ("订单准时率", 96.7, 98, "%"),
    ]
    cursor.executemany(
        "INSERT INTO kpi_metrics (metric_name, value, target, unit) VALUES (?, ?, ?, ?)",
        metrics
    )
    conn.commit()


def seed_stock_price(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM stock_price")

    # 生成近30个交易日的K线数据
    base_price = 50.0
    data = []
    current_date = datetime(2025, 3, 1)
    for i in range(30):
        date_str = current_date.strftime("%Y-%m-%d")
        open_price = round(base_price + random.uniform(-2, 2), 2)
        close_price = round(open_price + random.uniform(-3, 3), 2)
        high_price = round(max(open_price, close_price) + random.uniform(0, 1.5), 2)
        low_price = round(min(open_price, close_price) - random.uniform(0, 1.5), 2)
        volume = random.randint(5000000, 15000000)
        data.append((date_str, open_price, close_price, high_price, low_price, volume))
        current_date += timedelta(days=random.choice([1, 1, 1, 1, 3]))  # 跳过周末
    cursor.executemany(
        "INSERT INTO stock_price (trade_date, open_price, close_price, high_price, low_price, volume) VALUES (?, ?, ?, ?, ?, ?)",
        data
    )
    conn.commit()


def seed_department_stats(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM department_stats")

    departments = [
        ("技术研发部", 128, 28500, 3648000),
        ("市场营销部", 56, 18500, 1036000),
        ("销售部", 89, 15200, 1352800),
        ("财务部", 24, 22000, 528000),
        ("人力资源部", 18, 16800, 302400),
        ("运营部", 45, 17500, 787500),
        ("产品部", 32, 25000, 800000),
        ("行政部", 15, 12000, 180000),
    ]
    cursor.executemany(
        "INSERT INTO department_stats (department, employee_count, avg_salary, total_salary) VALUES (?, ?, ?, ?)",
        departments
    )
    conn.commit()


def seed_regional_sales(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM regional_sales")

    regions = [
        ("华东地区", 3200, 3500, 3800, 4200),
        ("华南地区", 2800, 3100, 2900, 3400),
        ("华北地区", 2500, 2700, 2600, 3000),
        ("西南地区", 1800, 2000, 2200, 2500),
        ("东北地区", 1200, 1400, 1300, 1600),
        ("西北地区", 900, 1100, 1000, 1300),
    ]
    cursor.executemany(
        "INSERT INTO regional_sales (region, q1, q2, q3, q4) VALUES (?, ?, ?, ?, ?)",
        regions
    )
    conn.commit()


def main():
    # 删除旧数据库（如果存在）
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"已删除旧数据库: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    print("创建数据表...")
    create_tables(conn)

    print("填充月度销售数据...")
    seed_monthly_sales(conn)

    print("填充产品营收数据...")
    seed_product_revenue(conn)

    print("填充KPI指标数据...")
    seed_kpi_metrics(conn)

    print("填充股票K线数据...")
    seed_stock_price(conn)

    print("填充部门统计数据...")
    seed_department_stats(conn)

    print("填充区域销售数据...")
    seed_regional_sales(conn)

    conn.close()
    print(f"\n财经模拟数据库创建完成: {DB_PATH}")
    print("\n可用表:")
    print("  - monthly_sales      (月度销售，字段: month, sales, profit, cost)")
    print("  - product_revenue    (产品营收，字段: category, revenue, percentage)")
    print("  - kpi_metrics        (KPI指标，字段: metric_name, value, target, unit)")
    print("  - stock_price        (股票K线，字段: trade_date, open_price, close_price, high_price, low_price, volume)")
    print("  - department_stats   (部门统计，字段: department, employee_count, avg_salary, total_salary)")
    print("  - regional_sales     (区域销售，字段: region, q1, q2, q3, q4)")


if __name__ == "__main__":
    main()
