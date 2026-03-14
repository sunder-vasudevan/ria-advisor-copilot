import random
import math
from datetime import date


def monte_carlo_goal_probability(
    current_value: float,
    monthly_sip: float,
    target_amount: float,
    target_date: date,
    annual_return_rate: float = 0.12,
    simulations: int = 1000,
) -> float:
    """
    Run Monte Carlo simulation to estimate goal success probability.

    Models monthly portfolio growth with random return variation (±5% std dev
    around the assumed annual rate), compounding SIP contributions monthly.

    Returns probability as a float 0–100.
    """
    today = date.today()
    months = (target_date.year - today.year) * 12 + (target_date.month - today.month)
    if months <= 0:
        return 0.0

    monthly_return = annual_return_rate / 12
    monthly_std_dev = 0.05 / math.sqrt(12)  # annualised 5% vol → monthly

    successes = 0
    for _ in range(simulations):
        value = current_value
        for _ in range(months):
            r = random.gauss(monthly_return, monthly_std_dev)
            value = value * (1 + r) + monthly_sip
        if value >= target_amount:
            successes += 1

    return round((successes / simulations) * 100, 1)
