from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
DB_PATH = DATA / "db.json"
SEED_PATH = DATA / "seed.json"

STALE_DAYS = 3
STUCK_STAGE_DAYS = 5
DEADLINE_NEAR_DAYS = 3
LOW_PROGRESS_THRESHOLD = 40
MAX_SUGGESTED_ACTIVE = 6
WORKLOAD_UNIT = 18
