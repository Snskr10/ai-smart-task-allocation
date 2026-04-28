from flask import Blueprint, jsonify

from database import read_db
from services.dashboard import build_manager_dashboard

bp = Blueprint("dashboard_api", __name__)


@bp.get("/dashboard/manager")
def dashboard_manager():
    return jsonify(build_manager_dashboard(read_db()))
