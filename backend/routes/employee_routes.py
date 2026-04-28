from flask import Blueprint, jsonify

from database import read_db
from services.employees import enrich_employees

bp = Blueprint("employees_api", __name__)


@bp.get("/employees")
def employees():
    return jsonify(enrich_employees(read_db()))
