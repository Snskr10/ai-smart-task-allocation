import os

from flask import Flask
from flask_cors import CORS

from database import ensure_db
from routes.alert_routes import bp as alerts_bp
from routes.auth_routes import bp as auth_bp
from routes.dashboard_routes import bp as dashboard_bp
from routes.employee_routes import bp as employee_bp
from routes.ml_routes import bp as ml_bp
from routes.project_routes import bp as projects_bp
from routes.sprint_routes import bp as sprints_bp
from routes.task_routes import bp as tasks_bp


def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}})
    app.register_blueprint(auth_bp)
    app.register_blueprint(employee_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(sprints_bp)
    app.register_blueprint(ml_bp)

    @app.get("/health")
    def health():
        from services.ml_model import status as ml_status
        return {
            "status": "ok",
            "version": "2.0.0",
            "ml": ml_status(),
        }

    return app


app = create_app()

if __name__ == "__main__":
    ensure_db()
    port = int(os.environ.get("PORT", "3001"))
    app.run(host="0.0.0.0", port=port, debug=True)
