"""
Run: python -m app.seed
Seeds 20 Indian clients with realistic data. Idempotent — skips if data exists.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date, timedelta
from app.database import SessionLocal, engine, Base
from app.models import Client, Portfolio, Holding, Goal, LifeEvent

Base.metadata.create_all(bind=engine)

TODAY = date.today()


def d(days_ago: int) -> date:
    return TODAY - timedelta(days=days_ago)


def seed():
    db = SessionLocal()

    if db.query(Client).count() > 0:
        print("✓ Seed data already exists. Skipping.")
        db.close()
        return

    clients_data = [

        # ── 1. Priya Sharma — THE DEMO CLIENT ──────────────────────────────────
        # HNI, equity drift +8%, home purchase goal 18mo, underfunded
        {
            "client": dict(name="Priya Sharma", age=34, segment="HNI",
                           risk_score=6, risk_category="Moderate"),
            "portfolio": dict(total_value=8_500_000,
                              equity_pct=73, debt_pct=20, cash_pct=7,
                              target_equity_pct=65, target_debt_pct=25, target_cash_pct=10),
            "holdings": [
                dict(fund_name="Mirae Asset Large Cap Fund", fund_category="Large Cap",
                     fund_house="Mirae Asset", current_value=2_800_000, target_pct=30, current_pct=33,
                     nav_per_unit=58.40, units_held=round(2_800_000/58.40, 3)),
                dict(fund_name="Parag Parikh Flexi Cap Fund", fund_category="Flexi Cap",
                     fund_house="PPFAS", current_value=2_400_000, target_pct=25, current_pct=28,
                     nav_per_unit=72.15, units_held=round(2_400_000/72.15, 3)),
                dict(fund_name="SBI Small Cap Fund", fund_category="Small Cap",
                     fund_house="SBI MF", current_value=1_000_000, target_pct=10, current_pct=12,
                     nav_per_unit=38.60, units_held=round(1_000_000/38.60, 3)),
                dict(fund_name="HDFC Corporate Bond Fund", fund_category="Corporate Bond",
                     fund_house="HDFC MF", current_value=1_700_000, target_pct=25, current_pct=20,
                     nav_per_unit=22.80, units_held=round(1_700_000/22.80, 3)),
                dict(fund_name="Liquid BeES", fund_category="Liquid",
                     fund_house="Nippon India", current_value=600_000, target_pct=10, current_pct=7,
                     nav_per_unit=1045.50, units_held=round(600_000/1045.50, 3)),
            ],
            "goals": [
                dict(goal_name="Home Purchase", target_amount=12_000_000,
                     target_date=TODAY + timedelta(days=548), monthly_sip=75_000,
                     last_sip_date=d(12), probability_pct=62),
                dict(goal_name="Child Education", target_amount=5_000_000,
                     target_date=TODAY + timedelta(days=3650), monthly_sip=25_000,
                     last_sip_date=d(12), probability_pct=81),
            ],
            "life_events": [],
        },

        # ── 2. Rahul Mehta — HNI, equity drift +6%, missed SIP ──────────────────
        {
            "client": dict(name="Rahul Mehta", age=42, segment="HNI",
                           risk_score=5, risk_category="Moderate"),
            "portfolio": dict(total_value=15_200_000,
                              equity_pct=71, debt_pct=22, cash_pct=7,
                              target_equity_pct=65, target_debt_pct=27, target_cash_pct=8),
            "holdings": [
                dict(fund_name="ICICI Pru Bluechip Fund", fund_category="Large Cap",
                     fund_house="ICICI Prudential", current_value=5_800_000, target_pct=35, current_pct=38,
                     nav_per_unit=63.20, units_held=round(5_800_000/63.20, 3)),
                dict(fund_name="Axis Flexi Cap Fund", fund_category="Flexi Cap",
                     fund_house="Axis MF", current_value=4_200_000, target_pct=30, current_pct=28,
                     nav_per_unit=88.75, units_held=round(4_200_000/88.75, 3)),
                dict(fund_name="HDFC Short Term Debt Fund", fund_category="Short Duration",
                     fund_house="HDFC MF", current_value=3_500_000, target_pct=22, current_pct=23,
                     nav_per_unit=28.40, units_held=round(3_500_000/28.40, 3)),
                dict(fund_name="Aditya Birla Liquid Fund", fund_category="Liquid",
                     fund_house="Aditya Birla", current_value=1_700_000, target_pct=13, current_pct=11,
                     nav_per_unit=1062.30, units_held=round(1_700_000/1062.30, 3)),
            ],
            "goals": [
                dict(goal_name="Retirement Corpus", target_amount=50_000_000,
                     target_date=TODAY + timedelta(days=5475), monthly_sip=150_000,
                     last_sip_date=d(42), probability_pct=74),
            ],
            "life_events": [],
        },

        # ── 3. Anita Patel — Retail, missed SIP 47d, underfunded goal ───────────
        {
            "client": dict(name="Anita Patel", age=29, segment="Retail",
                           risk_score=7, risk_category="Aggressive"),
            "portfolio": dict(total_value=1_850_000,
                              equity_pct=80, debt_pct=15, cash_pct=5,
                              target_equity_pct=75, target_debt_pct=20, target_cash_pct=5),
            "holdings": [
                dict(fund_name="Nippon India Small Cap Fund", fund_category="Small Cap",
                     fund_house="Nippon India", current_value=900_000, target_pct=45, current_pct=49,
                     nav_per_unit=42.15, units_held=round(900_000/42.15, 3)),
                dict(fund_name="Motilal Oswal Flexi Cap Fund", fund_category="Flexi Cap",
                     fund_house="Motilal Oswal", current_value=580_000, target_pct=30, current_pct=31,
                     nav_per_unit=65.80, units_held=round(580_000/65.80, 3)),
                dict(fund_name="HDFC Gilt Fund", fund_category="Gilt",
                     fund_house="HDFC MF", current_value=370_000, target_pct=25, current_pct=20,
                     nav_per_unit=31.20, units_held=round(370_000/31.20, 3)),
            ],
            "goals": [
                dict(goal_name="Marriage Fund", target_amount=2_500_000,
                     target_date=TODAY + timedelta(days=730), monthly_sip=35_000,
                     last_sip_date=d(47), probability_pct=55),
            ],
            "life_events": [],
        },

        # ── 4. Vikram Singh — HNI, retirement goal critically underfunded ────────
        {
            "client": dict(name="Vikram Singh", age=55, segment="HNI",
                           risk_score=4, risk_category="Conservative"),
            "portfolio": dict(total_value=22_000_000,
                              equity_pct=38, debt_pct=50, cash_pct=12,
                              target_equity_pct=40, target_debt_pct=50, target_cash_pct=10),
            "holdings": [
                dict(fund_name="SBI Bluechip Fund", fund_category="Large Cap",
                     fund_house="SBI MF", current_value=8_360_000, target_pct=38, current_pct=38,
                     nav_per_unit=55.90, units_held=round(8_360_000/55.90, 3)),
                dict(fund_name="ICICI Pru Corporate Bond Fund", fund_category="Corporate Bond",
                     fund_house="ICICI Prudential", current_value=11_000_000, target_pct=50, current_pct=50,
                     nav_per_unit=25.60, units_held=round(11_000_000/25.60, 3)),
                dict(fund_name="Kotak Liquid Fund", fund_category="Liquid",
                     fund_house="Kotak MF", current_value=2_640_000, target_pct=12, current_pct=12,
                     nav_per_unit=1078.40, units_held=round(2_640_000/1078.40, 3)),
            ],
            "goals": [
                dict(goal_name="Retirement at 60", target_amount=80_000_000,
                     target_date=TODAY + timedelta(days=1825), monthly_sip=200_000,
                     last_sip_date=d(15), probability_pct=48),
            ],
            "life_events": [],
        },

        # ── 5. Sunita Reddy — Retail, new child (life event 20d ago) ────────────
        {
            "client": dict(name="Sunita Reddy", age=31, segment="Retail",
                           risk_score=6, risk_category="Moderate"),
            "portfolio": dict(total_value=2_300_000,
                              equity_pct=65, debt_pct=25, cash_pct=10,
                              target_equity_pct=65, target_debt_pct=25, target_cash_pct=10),
            "holdings": [
                dict(fund_name="Mirae Asset Emerging Bluechip", fund_category="Large & Mid Cap",
                     fund_house="Mirae Asset", current_value=1_000_000, target_pct=43, current_pct=43,
                     nav_per_unit=74.30, units_held=round(1_000_000/74.30, 3)),
                dict(fund_name="Axis ELSS Tax Saver Fund", fund_category="ELSS",
                     fund_house="Axis MF", current_value=500_000, target_pct=22, current_pct=22,
                     nav_per_unit=61.45, units_held=round(500_000/61.45, 3)),
                dict(fund_name="HDFC Medium Term Debt Fund", fund_category="Medium Duration",
                     fund_house="HDFC MF", current_value=575_000, target_pct=25, current_pct=25,
                     nav_per_unit=27.15, units_held=round(575_000/27.15, 3)),
                dict(fund_name="ICICI Pru Liquid Fund", fund_category="Liquid",
                     fund_house="ICICI Prudential", current_value=225_000, target_pct=10, current_pct=10,
                     nav_per_unit=1055.20, units_held=round(225_000/1055.20, 3)),
            ],
            "goals": [
                dict(goal_name="Child Education Fund", target_amount=4_000_000,
                     target_date=TODAY + timedelta(days=6570), monthly_sip=15_000,
                     last_sip_date=d(18), probability_pct=77),
            ],
            "life_events": [
                dict(event_type="new_child", event_date=d(20),
                     notes="First child born. May need to review insurance and emergency fund."),
            ],
        },

        # ── 6. Arjun Kapoor — HNI, equity drift +7% ─────────────────────────────
        {
            "client": dict(name="Arjun Kapoor", age=38, segment="HNI",
                           risk_score=7, risk_category="Aggressive"),
            "portfolio": dict(total_value=18_500_000,
                              equity_pct=82, debt_pct=13, cash_pct=5,
                              target_equity_pct=75, target_debt_pct=20, target_cash_pct=5),
            "holdings": [
                dict(fund_name="Quant Small Cap Fund", fund_category="Small Cap",
                     fund_house="Quant MF", current_value=5_200_000, target_pct=25, current_pct=28,
                     nav_per_unit=52.75, units_held=round(5_200_000/52.75, 3)),
                dict(fund_name="Parag Parikh Flexi Cap Fund", fund_category="Flexi Cap",
                     fund_house="PPFAS", current_value=6_100_000, target_pct=30, current_pct=33,
                     nav_per_unit=72.15, units_held=round(6_100_000/72.15, 3)),
                dict(fund_name="Mirae Asset Large Cap Fund", fund_category="Large Cap",
                     fund_house="Mirae Asset", current_value=3_900_000, target_pct=20, current_pct=21,
                     nav_per_unit=58.40, units_held=round(3_900_000/58.40, 3)),
                dict(fund_name="HDFC Short Term Debt Fund", fund_category="Short Duration",
                     fund_house="HDFC MF", current_value=2_405_000, target_pct=13, current_pct=13,
                     nav_per_unit=28.40, units_held=round(2_405_000/28.40, 3)),
                dict(fund_name="Kotak Liquid Fund", fund_category="Liquid",
                     fund_house="Kotak MF", current_value=895_000, target_pct=5, current_pct=5,
                     nav_per_unit=1078.40, units_held=round(895_000/1078.40, 3)),
            ],
            "goals": [
                dict(goal_name="Early Retirement at 50", target_amount=100_000_000,
                     target_date=TODAY + timedelta(days=4380), monthly_sip=300_000,
                     last_sip_date=d(8), probability_pct=71),
            ],
            "life_events": [],
        },

        # ── 7. Meera Nair — Retail, missed SIP 53d, two goals ───────────────────
        {
            "client": dict(name="Meera Nair", age=26, segment="Retail",
                           risk_score=6, risk_category="Moderate"),
            "portfolio": dict(total_value=950_000,
                              equity_pct=70, debt_pct=20, cash_pct=10,
                              target_equity_pct=70, target_debt_pct=20, target_cash_pct=10),
            "holdings": [
                dict(fund_name="Axis Flexi Cap Fund", fund_category="Flexi Cap",
                     fund_house="Axis MF", current_value=500_000, target_pct=52, current_pct=53,
                     nav_per_unit=88.75, units_held=round(500_000/88.75, 3)),
                dict(fund_name="Nippon India Gilt Securities Fund", fund_category="Gilt",
                     fund_house="Nippon India", current_value=190_000, target_pct=20, current_pct=20,
                     nav_per_unit=33.60, units_held=round(190_000/33.60, 3)),
                dict(fund_name="Aditya Birla Liquid Fund", fund_category="Liquid",
                     fund_house="Aditya Birla", current_value=260_000, target_pct=28, current_pct=27,
                     nav_per_unit=1062.30, units_held=round(260_000/1062.30, 3)),
            ],
            "goals": [
                dict(goal_name="Emergency Fund Top-Up", target_amount=500_000,
                     target_date=TODAY + timedelta(days=365), monthly_sip=12_000,
                     last_sip_date=d(53), probability_pct=63),
                dict(goal_name="International Trip", target_amount=350_000,
                     target_date=TODAY + timedelta(days=180), monthly_sip=20_000,
                     last_sip_date=d(53), probability_pct=45),
            ],
            "life_events": [],
        },

        # ── 8. Rajesh Kumar — HNI, multiple problems ─────────────────────────────
        {
            "client": dict(name="Rajesh Kumar", age=48, segment="HNI",
                           risk_score=5, risk_category="Moderate"),
            "portfolio": dict(total_value=35_000_000,
                              equity_pct=72, debt_pct=20, cash_pct=8,
                              target_equity_pct=60, target_debt_pct=30, target_cash_pct=10),
            "holdings": [
                dict(fund_name="ICICI Pru Bluechip Fund", fund_category="Large Cap",
                     fund_house="ICICI Prudential", current_value=12_600_000, target_pct=32, current_pct=36,
                     nav_per_unit=63.20, units_held=round(12_600_000/63.20, 3)),
                dict(fund_name="SBI Flexi Cap Fund", fund_category="Flexi Cap",
                     fund_house="SBI MF", current_value=12_600_000, target_pct=28, current_pct=36,
                     nav_per_unit=95.40, units_held=round(12_600_000/95.40, 3)),
                dict(fund_name="HDFC Corporate Bond Fund", fund_category="Corporate Bond",
                     fund_house="HDFC MF", current_value=7_000_000, target_pct=30, current_pct=20,
                     nav_per_unit=22.80, units_held=round(7_000_000/22.80, 3)),
                dict(fund_name="Kotak Liquid Fund", fund_category="Liquid",
                     fund_house="Kotak MF", current_value=2_800_000, target_pct=10, current_pct=8,
                     nav_per_unit=1078.40, units_held=round(2_800_000/1078.40, 3)),
            ],
            "goals": [
                dict(goal_name="Daughter's Wedding", target_amount=5_000_000,
                     target_date=TODAY + timedelta(days=548), monthly_sip=80_000,
                     last_sip_date=d(38), probability_pct=66),
                dict(goal_name="Retirement", target_amount=60_000_000,
                     target_date=TODAY + timedelta(days=3650), monthly_sip=150_000,
                     last_sip_date=d(38), probability_pct=72),
            ],
            "life_events": [
                dict(event_type="job_change", event_date=d(30),
                     notes="Changed to a new company. Variable income structure. Bonus timing uncertain."),
            ],
        },

        # ── 9. Pooja Gupta — Retail, goal underfunded 58% ────────────────────────
        {
            "client": dict(name="Pooja Gupta", age=33, segment="Retail",
                           risk_score=5, risk_category="Moderate"),
            "portfolio": dict(total_value=1_600_000,
                              equity_pct=60, debt_pct=30, cash_pct=10,
                              target_equity_pct=60, target_debt_pct=30, target_cash_pct=10),
            "holdings": [
                dict(fund_name="Mirae Asset Large Cap Fund", fund_category="Large Cap",
                     fund_house="Mirae Asset", current_value=720_000, target_pct=45, current_pct=45,
                     nav_per_unit=58.40, units_held=round(720_000/58.40, 3)),
                dict(fund_name="HDFC Corporate Bond Fund", fund_category="Corporate Bond",
                     fund_house="HDFC MF", current_value=480_000, target_pct=30, current_pct=30,
                     nav_per_unit=22.80, units_held=round(480_000/22.80, 3)),
                dict(fund_name="ICICI Pru Liquid Fund", fund_category="Liquid",
                     fund_house="ICICI Prudential", current_value=400_000, target_pct=25, current_pct=25,
                     nav_per_unit=1055.20, units_held=round(400_000/1055.20, 3)),
            ],
            "goals": [
                dict(goal_name="Home Down Payment", target_amount=3_000_000,
                     target_date=TODAY + timedelta(days=913), monthly_sip=40_000,
                     last_sip_date=d(14), probability_pct=58),
            ],
            "life_events": [],
        },

        # ── 10. Sanjay Joshi — HNI, job change 25d ago, SIP missed ──────────────
        {
            "client": dict(name="Sanjay Joshi", age=40, segment="HNI",
                           risk_score=6, risk_category="Moderate"),
            "portfolio": dict(total_value=12_000_000,
                              equity_pct=68, debt_pct=24, cash_pct=8,
                              target_equity_pct=65, target_debt_pct=25, target_cash_pct=10),
            "holdings": [
                dict(fund_name="Parag Parikh Flexi Cap Fund", fund_category="Flexi Cap",
                     fund_house="PPFAS", current_value=4_800_000, target_pct=38, current_pct=40,
                     nav_per_unit=72.15, units_held=round(4_800_000/72.15, 3)),
                dict(fund_name="Axis ELSS Tax Saver Fund", fund_category="ELSS",
                     fund_house="Axis MF", current_value=3_360_000, target_pct=30, current_pct=28,
                     nav_per_unit=61.45, units_held=round(3_360_000/61.45, 3)),
                dict(fund_name="HDFC Short Term Debt Fund", fund_category="Short Duration",
                     fund_house="HDFC MF", current_value=2_880_000, target_pct=25, current_pct=24,
                     nav_per_unit=28.40, units_held=round(2_880_000/28.40, 3)),
                dict(fund_name="Aditya Birla Liquid Fund", fund_category="Liquid",
                     fund_house="Aditya Birla", current_value=960_000, target_pct=8, current_pct=8,
                     nav_per_unit=1062.30, units_held=round(960_000/1062.30, 3)),
            ],
            "goals": [
                dict(goal_name="Retirement", target_amount=40_000_000,
                     target_date=TODAY + timedelta(days=5475), monthly_sip=120_000,
                     last_sip_date=d(40), probability_pct=76),
                dict(goal_name="Children's Education", target_amount=8_000_000,
                     target_date=TODAY + timedelta(days=3285), monthly_sip=50_000,
                     last_sip_date=d(40), probability_pct=79),
            ],
            "life_events": [
                dict(event_type="job_change", event_date=d(25),
                     notes="Left MNC, joined startup as VP. Salary unchanged but ESOP-heavy. RSU vesting in 2 years."),
            ],
        },

        # ── 11. Lakshmi Iyer — Retail, healthy ──────────────────────────────────
        {
            "client": dict(name="Lakshmi Iyer", age=27, segment="Retail",
                           risk_score=7, risk_category="Aggressive"),
            "portfolio": dict(total_value=1_200_000,
                              equity_pct=80, debt_pct=15, cash_pct=5,
                              target_equity_pct=80, target_debt_pct=15, target_cash_pct=5),
            "holdings": [
                dict(fund_name="Nippon India Small Cap Fund", fund_category="Small Cap",
                     fund_house="Nippon India", current_value=600_000, target_pct=50, current_pct=50,
                     nav_per_unit=42.15, units_held=round(600_000/42.15, 3)),
                dict(fund_name="Mirae Asset Emerging Bluechip", fund_category="Large & Mid Cap",
                     fund_house="Mirae Asset", current_value=360_000, target_pct=30, current_pct=30,
                     nav_per_unit=74.30, units_held=round(360_000/74.30, 3)),
                dict(fund_name="HDFC Short Term Debt Fund", fund_category="Short Duration",
                     fund_house="HDFC MF", current_value=240_000, target_pct=20, current_pct=20,
                     nav_per_unit=28.40, units_held=round(240_000/28.40, 3)),
            ],
            "goals": [
                dict(goal_name="Wealth Creation", target_amount=10_000_000,
                     target_date=TODAY + timedelta(days=5475), monthly_sip=20_000,
                     last_sip_date=d(5), probability_pct=85),
            ],
            "life_events": [],
        },

        # ── 12. Deepak Sharma — HNI, healthy ────────────────────────────────────
        {
            "client": dict(name="Deepak Sharma", age=45, segment="HNI",
                           risk_score=4, risk_category="Conservative"),
            "portfolio": dict(total_value=28_000_000,
                              equity_pct=42, debt_pct=48, cash_pct=10,
                              target_equity_pct=40, target_debt_pct=50, target_cash_pct=10),
            "holdings": [
                dict(fund_name="SBI Bluechip Fund", fund_category="Large Cap",
                     fund_house="SBI MF", current_value=11_760_000, target_pct=40, current_pct=42,
                     nav_per_unit=55.90, units_held=round(11_760_000/55.90, 3)),
                dict(fund_name="ICICI Pru Corporate Bond Fund", fund_category="Corporate Bond",
                     fund_house="ICICI Prudential", current_value=13_440_000, target_pct=48, current_pct=48,
                     nav_per_unit=25.60, units_held=round(13_440_000/25.60, 3)),
                dict(fund_name="HDFC Liquid Fund", fund_category="Liquid",
                     fund_house="HDFC MF", current_value=2_800_000, target_pct=12, current_pct=10,
                     nav_per_unit=1090.50, units_held=round(2_800_000/1090.50, 3)),
            ],
            "goals": [
                dict(goal_name="Retirement", target_amount=70_000_000,
                     target_date=TODAY + timedelta(days=5475), monthly_sip=250_000,
                     last_sip_date=d(10), probability_pct=88),
            ],
            "life_events": [],
        },

        # ── 13. Kavita Rao — Retail, healthy ─────────────────────────────────────
        {
            "client": dict(name="Kavita Rao", age=35, segment="Retail",
                           risk_score=5, risk_category="Moderate"),
            "portfolio": dict(total_value=2_100_000,
                              equity_pct=62, debt_pct=28, cash_pct=10,
                              target_equity_pct=60, target_debt_pct=30, target_cash_pct=10),
            "holdings": [
                dict(fund_name="Axis Flexi Cap Fund", fund_category="Flexi Cap",
                     fund_house="Axis MF", current_value=1_050_000, target_pct=50, current_pct=50,
                     nav_per_unit=88.75, units_held=round(1_050_000/88.75, 3)),
                dict(fund_name="HDFC Corporate Bond Fund", fund_category="Corporate Bond",
                     fund_house="HDFC MF", current_value=630_000, target_pct=30, current_pct=30,
                     nav_per_unit=22.80, units_held=round(630_000/22.80, 3)),
                dict(fund_name="ICICI Pru Liquid Fund", fund_category="Liquid",
                     fund_house="ICICI Prudential", current_value=420_000, target_pct=20, current_pct=20,
                     nav_per_unit=1055.20, units_held=round(420_000/1055.20, 3)),
            ],
            "goals": [
                dict(goal_name="Child's Education", target_amount=3_500_000,
                     target_date=TODAY + timedelta(days=4015), monthly_sip=18_000,
                     last_sip_date=d(8), probability_pct=83),
            ],
            "life_events": [],
        },

        # ── 14. Amit Saxena — HNI, equity drift +5.5% ────────────────────────────
        {
            "client": dict(name="Amit Saxena", age=37, segment="HNI",
                           risk_score=6, risk_category="Moderate"),
            "portfolio": dict(total_value=11_000_000,
                              equity_pct=70.5, debt_pct=22, cash_pct=7.5,
                              target_equity_pct=65, target_debt_pct=27, target_cash_pct=8),
            "holdings": [
                dict(fund_name="Mirae Asset Large Cap Fund", fund_category="Large Cap",
                     fund_house="Mirae Asset", current_value=4_290_000, target_pct=36, current_pct=39,
                     nav_per_unit=58.40, units_held=round(4_290_000/58.40, 3)),
                dict(fund_name="PPFAS Flexi Cap Fund", fund_category="Flexi Cap",
                     fund_house="PPFAS", current_value=3_465_000, target_pct=30, current_pct=31.5,
                     nav_per_unit=72.15, units_held=round(3_465_000/72.15, 3)),
                dict(fund_name="HDFC Short Term Debt Fund", fund_category="Short Duration",
                     fund_house="HDFC MF", current_value=2_420_000, target_pct=22, current_pct=22,
                     nav_per_unit=28.40, units_held=round(2_420_000/28.40, 3)),
                dict(fund_name="Kotak Liquid Fund", fund_category="Liquid",
                     fund_house="Kotak MF", current_value=825_000, target_pct=7, current_pct=7.5,
                     nav_per_unit=1078.40, units_held=round(825_000/1078.40, 3)),
            ],
            "goals": [
                dict(goal_name="Second Property", target_amount=15_000_000,
                     target_date=TODAY + timedelta(days=1825), monthly_sip=100_000,
                     last_sip_date=d(11), probability_pct=74),
            ],
            "life_events": [],
        },

        # ── 15. Preethi Venkat — Retail, missed SIP 41d ──────────────────────────
        {
            "client": dict(name="Preethi Venkat", age=28, segment="Retail",
                           risk_score=7, risk_category="Aggressive"),
            "portfolio": dict(total_value=780_000,
                              equity_pct=78, debt_pct=15, cash_pct=7,
                              target_equity_pct=75, target_debt_pct=18, target_cash_pct=7),
            "holdings": [
                dict(fund_name="Quant Active Fund", fund_category="Flexi Cap",
                     fund_house="Quant MF", current_value=400_000, target_pct=50, current_pct=51,
                     nav_per_unit=81.30, units_held=round(400_000/81.30, 3)),
                dict(fund_name="SBI Small Cap Fund", fund_category="Small Cap",
                     fund_house="SBI MF", current_value=208_000, target_pct=25, current_pct=27,
                     nav_per_unit=38.60, units_held=round(208_000/38.60, 3)),
                dict(fund_name="Nippon India Gilt Fund", fund_category="Gilt",
                     fund_house="Nippon India", current_value=117_000, target_pct=15, current_pct=15,
                     nav_per_unit=33.60, units_held=round(117_000/33.60, 3)),
                dict(fund_name="Aditya Birla Liquid Fund", fund_category="Liquid",
                     fund_house="Aditya Birla", current_value=55_000, target_pct=7, current_pct=7,
                     nav_per_unit=1062.30, units_held=round(55_000/1062.30, 3)),
            ],
            "goals": [
                dict(goal_name="Wealth Accumulation", target_amount=5_000_000,
                     target_date=TODAY + timedelta(days=3650), monthly_sip=12_000,
                     last_sip_date=d(41), probability_pct=78),
            ],
            "life_events": [],
        },

        # ── 16. Nikhil Bose — HNI, underfunded goal 64% ──────────────────────────
        {
            "client": dict(name="Nikhil Bose", age=44, segment="HNI",
                           risk_score=5, risk_category="Moderate"),
            "portfolio": dict(total_value=16_000_000,
                              equity_pct=62, debt_pct=30, cash_pct=8,
                              target_equity_pct=60, target_debt_pct=32, target_cash_pct=8),
            "holdings": [
                dict(fund_name="ICICI Pru Bluechip Fund", fund_category="Large Cap",
                     fund_house="ICICI Prudential", current_value=6_400_000, target_pct=40, current_pct=40,
                     nav_per_unit=63.20, units_held=round(6_400_000/63.20, 3)),
                dict(fund_name="SBI Flexi Cap Fund", fund_category="Flexi Cap",
                     fund_house="SBI MF", current_value=3_520_000, target_pct=22, current_pct=22,
                     nav_per_unit=95.40, units_held=round(3_520_000/95.40, 3)),
                dict(fund_name="HDFC Corporate Bond Fund", fund_category="Corporate Bond",
                     fund_house="HDFC MF", current_value=4_800_000, target_pct=30, current_pct=30,
                     nav_per_unit=22.80, units_held=round(4_800_000/22.80, 3)),
                dict(fund_name="Aditya Birla Liquid Fund", fund_category="Liquid",
                     fund_house="Aditya Birla", current_value=1_280_000, target_pct=8, current_pct=8,
                     nav_per_unit=1062.30, units_held=round(1_280_000/1062.30, 3)),
            ],
            "goals": [
                dict(goal_name="Son's Overseas Education", target_amount=20_000_000,
                     target_date=TODAY + timedelta(days=1460), monthly_sip=180_000,
                     last_sip_date=d(20), probability_pct=64),
            ],
            "life_events": [],
        },

        # ── 17. Shreya Malhotra — Retail, healthy ────────────────────────────────
        {
            "client": dict(name="Shreya Malhotra", age=24, segment="Retail",
                           risk_score=8, risk_category="Aggressive"),
            "portfolio": dict(total_value=600_000,
                              equity_pct=90, debt_pct=5, cash_pct=5,
                              target_equity_pct=90, target_debt_pct=5, target_cash_pct=5),
            "holdings": [
                dict(fund_name="Axis Small Cap Fund", fund_category="Small Cap",
                     fund_house="Axis MF", current_value=360_000, target_pct=60, current_pct=60,
                     nav_per_unit=45.80, units_held=round(360_000/45.80, 3)),
                dict(fund_name="Mirae Asset Emerging Bluechip", fund_category="Large & Mid Cap",
                     fund_house="Mirae Asset", current_value=180_000, target_pct=30, current_pct=30,
                     nav_per_unit=74.30, units_held=round(180_000/74.30, 3)),
                dict(fund_name="ICICI Pru Liquid Fund", fund_category="Liquid",
                     fund_house="ICICI Prudential", current_value=60_000, target_pct=10, current_pct=10,
                     nav_per_unit=1055.20, units_held=round(60_000/1055.20, 3)),
            ],
            "goals": [
                dict(goal_name="First Home", target_amount=6_000_000,
                     target_date=TODAY + timedelta(days=2920), monthly_sip=10_000,
                     last_sip_date=d(7), probability_pct=80),
            ],
            "life_events": [],
        },

        # ── 18. Rajan Choudhary — HNI, recent marriage 15d ago ───────────────────
        {
            "client": dict(name="Rajan Choudhary", age=32, segment="HNI",
                           risk_score=6, risk_category="Moderate"),
            "portfolio": dict(total_value=9_500_000,
                              equity_pct=68, debt_pct=24, cash_pct=8,
                              target_equity_pct=65, target_debt_pct=25, target_cash_pct=10),
            "holdings": [
                dict(fund_name="Parag Parikh Flexi Cap Fund", fund_category="Flexi Cap",
                     fund_house="PPFAS", current_value=3_800_000, target_pct=40, current_pct=40,
                     nav_per_unit=72.15, units_held=round(3_800_000/72.15, 3)),
                dict(fund_name="HDFC Mid Cap Opportunities Fund", fund_category="Mid Cap",
                     fund_house="HDFC MF", current_value=2_660_000, target_pct=26, current_pct=28,
                     nav_per_unit=67.30, units_held=round(2_660_000/67.30, 3)),
                dict(fund_name="ICICI Pru Corporate Bond Fund", fund_category="Corporate Bond",
                     fund_house="ICICI Prudential", current_value=2_280_000, target_pct=24, current_pct=24,
                     nav_per_unit=25.60, units_held=round(2_280_000/25.60, 3)),
                dict(fund_name="Kotak Liquid Fund", fund_category="Liquid",
                     fund_house="Kotak MF", current_value=760_000, target_pct=8, current_pct=8,
                     nav_per_unit=1078.40, units_held=round(760_000/1078.40, 3)),
            ],
            "goals": [
                dict(goal_name="Home Purchase", target_amount=10_000_000,
                     target_date=TODAY + timedelta(days=730), monthly_sip=80_000,
                     last_sip_date=d(12), probability_pct=72),
            ],
            "life_events": [
                dict(event_type="marriage", event_date=d(15),
                     notes="Recently married. Spouse is also working. Joint financial planning needed. Goals may shift."),
            ],
        },

        # ── 19. Aisha Khan — Retail, healthy ─────────────────────────────────────
        {
            "client": dict(name="Aisha Khan", age=30, segment="Retail",
                           risk_score=5, risk_category="Moderate"),
            "portfolio": dict(total_value=1_450_000,
                              equity_pct=63, debt_pct=27, cash_pct=10,
                              target_equity_pct=60, target_debt_pct=30, target_cash_pct=10),
            "holdings": [
                dict(fund_name="Axis Flexi Cap Fund", fund_category="Flexi Cap",
                     fund_house="Axis MF", current_value=725_000, target_pct=50, current_pct=50,
                     nav_per_unit=88.75, units_held=round(725_000/88.75, 3)),
                dict(fund_name="HDFC Corporate Bond Fund", fund_category="Corporate Bond",
                     fund_house="HDFC MF", current_value=391_500, target_pct=27, current_pct=27,
                     nav_per_unit=22.80, units_held=round(391_500/22.80, 3)),
                dict(fund_name="ICICI Pru Liquid Fund", fund_category="Liquid",
                     fund_house="ICICI Prudential", current_value=333_500, target_pct=23, current_pct=23,
                     nav_per_unit=1055.20, units_held=round(333_500/1055.20, 3)),
            ],
            "goals": [
                dict(goal_name="Business Startup Fund", target_amount=2_000_000,
                     target_date=TODAY + timedelta(days=1095), monthly_sip=22_000,
                     last_sip_date=d(9), probability_pct=82),
            ],
            "life_events": [],
        },

        # ── 20. Ganesh Murthy — HNI, equity drift +9%, missed SIP, underfunded ───
        {
            "client": dict(name="Ganesh Murthy", age=52, segment="HNI",
                           risk_score=4, risk_category="Conservative"),
            "portfolio": dict(total_value=42_000_000,
                              equity_pct=54, debt_pct=38, cash_pct=8,
                              target_equity_pct=45, target_debt_pct=45, target_cash_pct=10),
            "holdings": [
                dict(fund_name="SBI Bluechip Fund", fund_category="Large Cap",
                     fund_house="SBI MF", current_value=14_700_000, target_pct=33, current_pct=35,
                     nav_per_unit=55.90, units_held=round(14_700_000/55.90, 3)),
                dict(fund_name="ICICI Pru Bluechip Fund", fund_category="Large Cap",
                     fund_house="ICICI Prudential", current_value=7_980_000, target_pct=17, current_pct=19,
                     nav_per_unit=63.20, units_held=round(7_980_000/63.20, 3)),
                dict(fund_name="Axis Flexi Cap Fund", fund_category="Flexi Cap",
                     fund_house="Axis MF", current_value=3_780_000, target_pct=7, current_pct=9,
                     nav_per_unit=88.75, units_held=round(3_780_000/88.75, 3)),
                dict(fund_name="HDFC Corporate Bond Fund", fund_category="Corporate Bond",
                     fund_house="HDFC MF", current_value=10_080_000, target_pct=24, current_pct=24,
                     nav_per_unit=22.80, units_held=round(10_080_000/22.80, 3)),
                dict(fund_name="ICICI Pru Corporate Bond Fund", fund_category="Corporate Bond",
                     fund_house="ICICI Prudential", current_value=4_200_000, target_pct=10, current_pct=10,
                     nav_per_unit=25.60, units_held=round(4_200_000/25.60, 3)),
                dict(fund_name="Kotak Liquid Fund", fund_category="Liquid",
                     fund_house="Kotak MF", current_value=1_260_000, target_pct=3, current_pct=3,
                     nav_per_unit=1078.40, units_held=round(1_260_000/1078.40, 3)),
            ],
            "goals": [
                dict(goal_name="Retirement at 58", target_amount=100_000_000,
                     target_date=TODAY + timedelta(days=2190), monthly_sip=400_000,
                     last_sip_date=d(45), probability_pct=52),
                dict(goal_name="Charitable Trust Setup", target_amount=10_000_000,
                     target_date=TODAY + timedelta(days=3650), monthly_sip=50_000,
                     last_sip_date=d(45), probability_pct=79),
            ],
            "life_events": [],
        },
    ]

    for data in clients_data:
        c = Client(**data["client"])
        db.add(c)
        db.flush()

        p_data = data["portfolio"]
        p = Portfolio(client_id=c.id, **p_data)
        db.add(p)
        db.flush()

        for h_data in data["holdings"]:
            db.add(Holding(portfolio_id=p.id, **h_data))

        for g_data in data["goals"]:
            db.add(Goal(client_id=c.id, **g_data))

        for e_data in data.get("life_events", []):
            db.add(LifeEvent(client_id=c.id, **e_data))

    db.commit()
    db.close()
    print(f"✓ Seeded {len(clients_data)} clients successfully.")


if __name__ == "__main__":
    seed()
