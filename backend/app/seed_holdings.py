# Default holdings seed — shared by advisor client creation, personal signup, and backfill migration.
# 10 stocks + 10 MFs from the INSTRUMENTS list + Bitcoin + ₹5L cash on portfolio.

DEFAULT_CASH_BALANCE = 500000.0  # ₹5,00,000

# 10 stocks (all from INSTRUMENTS list)
DEFAULT_STOCKS = [
    {"asset_code": "RELIANCE",   "fund_name": "Reliance Industries Ltd",  "fund_category": "NIFTY 50",       "fund_house": "NSE",  "nav": 1540.0,   "units": 15.0},
    {"asset_code": "HDFCBANK",   "fund_name": "HDFC Bank Ltd",             "fund_category": "NIFTY 50",       "fund_house": "NSE",  "nav": 1420.0,   "units": 20.0},
    {"asset_code": "INFY",       "fund_name": "Infosys Ltd",               "fund_category": "NIFTY 50",       "fund_house": "NSE",  "nav": 1350.0,   "units": 18.0},
    {"asset_code": "TCS",        "fund_name": "TCS Ltd",                   "fund_category": "NIFTY 50",       "fund_house": "NSE",  "nav": 3780.0,   "units": 5.0},
    {"asset_code": "ICICIBANK",  "fund_name": "ICICI Bank Ltd",            "fund_category": "NIFTY 50",       "fund_house": "NSE",  "nav": 1080.0,   "units": 25.0},
    {"asset_code": "ZOMATO",     "fund_name": "Zomato Ltd",                "fund_category": "NIFTY Next 50",  "fund_house": "NSE",  "nav": 182.0,    "units": 120.0},
    {"asset_code": "DLF",        "fund_name": "DLF Ltd",                   "fund_category": "NIFTY Next 50",  "fund_house": "NSE",  "nav": 780.0,    "units": 30.0},
    {"asset_code": "TRENT",      "fund_name": "Trent Ltd",                 "fund_category": "NIFTY Next 50",  "fund_house": "NSE",  "nav": 4100.0,   "units": 4.0},
    {"asset_code": "TATAPOWER",  "fund_name": "Tata Power Ltd",            "fund_category": "NIFTY 100",      "fund_house": "NSE",  "nav": 420.0,    "units": 50.0},
    {"asset_code": "LT",         "fund_name": "Larsen & Toubro Ltd",       "fund_category": "NIFTY 100",      "fund_house": "NSE",  "nav": 3650.0,   "units": 6.0},
]

# 10 MFs (randomly selected from the 20 in INSTRUMENTS list)
DEFAULT_MFS = [
    {"asset_code": "INF179K01BB8", "fund_name": "HDFC Index Fund – NIFTY 50",        "fund_category": "NIFTY 50 Index",       "fund_house": "HDFC MF",        "nav": 197.42,  "units": 500.0},
    {"asset_code": "INF789F1AUV1", "fund_name": "UTI Nifty 50 Index Fund",           "fund_category": "NIFTY 50 Index",       "fund_house": "UTI MF",         "nav": 182.15,  "units": 400.0},
    {"asset_code": "INF109KC1KT4", "fund_name": "ICICI Nifty Next 50 Index Fund",    "fund_category": "NIFTY Next 50 Index",  "fund_house": "ICICI Prudential","nav": 36.18,   "units": 1200.0},
    {"asset_code": "INF174KA1P60", "fund_name": "Kotak Nifty Midcap 150 Index Fund", "fund_category": "NIFTY Midcap 150",     "fund_house": "Kotak MF",       "nav": 21.77,   "units": 2000.0},
    {"asset_code": "INF204KB15I0", "fund_name": "Nippon India Nifty Smallcap 250",   "fund_category": "NIFTY Smallcap 250",   "fund_house": "Nippon India",   "nav": 18.92,   "units": 1500.0},
    {"asset_code": "INF109K01AN8", "fund_name": "ICICI Prudential Gilt Fund",         "fund_category": "Gilt",                 "fund_house": "ICICI Prudential","nav": 78.14,   "units": 300.0},
    {"asset_code": "INF200K01WZ9", "fund_name": "SBI Banking & PSU Debt Fund",        "fund_category": "Banking & PSU",        "fund_house": "SBI MF",         "nav": 29.47,   "units": 800.0},
    {"asset_code": "INF179K01DW3", "fund_name": "HDFC Corporate Bond Fund",           "fund_category": "Corporate Bond",       "fund_house": "HDFC MF",        "nav": 24.12,   "units": 1000.0},
    {"asset_code": "INF109K01MM2", "fund_name": "ICICI Short Term Fund",              "fund_category": "Short Duration",       "fund_house": "ICICI Prudential","nav": 46.83,   "units": 600.0},
    {"asset_code": "INF209K01VY3", "fund_name": "Aditya Birla Money Manager Fund",    "fund_category": "Money Market",         "fund_house": "Aditya Birla",   "nav": 311.25,  "units": 100.0},
]

DEFAULT_BITCOIN = {"asset_code": "BTC", "fund_name": "Bitcoin (BTC)", "fund_category": "Crypto", "fund_house": "External Wallet", "nav": 6800000.0, "units": 0.05}


def build_default_holdings(portfolio_id: int) -> list[dict]:
    """Return a list of holding dicts ready for INSERT, covering 10 stocks + 10 MFs + BTC."""
    rows = []
    for item in DEFAULT_STOCKS:
        rows.append({
            "portfolio_id": portfolio_id,
            "asset_code": item["asset_code"],
            "asset_type": "stock",
            "fund_name": item["fund_name"],
            "fund_category": item["fund_category"],
            "fund_house": item["fund_house"],
            "units_held": item["units"],
            "nav_per_unit": item["nav"],
            "price_per_unit": item["nav"],
            "current_value": round(item["units"] * item["nav"], 2),
            "target_pct": 2.0,
            "current_pct": 2.0,
        })
    for item in DEFAULT_MFS:
        rows.append({
            "portfolio_id": portfolio_id,
            "asset_code": item["asset_code"],
            "asset_type": "mutual_fund",
            "fund_name": item["fund_name"],
            "fund_category": item["fund_category"],
            "fund_house": item["fund_house"],
            "units_held": item["units"],
            "nav_per_unit": item["nav"],
            "price_per_unit": item["nav"],
            "current_value": round(item["units"] * item["nav"], 2),
            "target_pct": 3.0,
            "current_pct": 3.0,
        })
    btc = DEFAULT_BITCOIN
    rows.append({
        "portfolio_id": portfolio_id,
        "asset_code": btc["asset_code"],
        "asset_type": "crypto",
        "fund_name": btc["fund_name"],
        "fund_category": btc["fund_category"],
        "fund_house": btc["fund_house"],
        "units_held": btc["units"],
        "nav_per_unit": btc["nav"],
        "price_per_unit": btc["nav"],
        "current_value": round(btc["units"] * btc["nav"], 2),
        "target_pct": 5.0,
        "current_pct": 5.0,
    })
    return rows
