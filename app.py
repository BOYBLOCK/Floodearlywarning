import os
from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, "dist")

app = Flask(__name__, static_folder=None)

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

# ---- Locked results from Objectives 1 and 2 ----
CATCHMENT_AREA_KM2 = 3.92
COMPOSITE_C = 0.95
TRIGGERS_MM_HR = [            # (critical intensity, level) - highest first
    (70.72, "high"),
    (68.68, "moderate"),
    (62.06, "low"),
]

MESSAGES = {
    "normal": {
        "label": "NORMAL",
        "summary": "No flood-inducing runoff expected at this rainfall.",
        "actions": [
            "No flood-risk action needed right now.",
            "Keep monitoring; check again if the rain intensifies or persists.",
            "Keep drains and drainage channels free of refuse.",
        ],
    },
    "low": {
        "label": "LOW RISK",
        "summary": "Rainfall is approaching flood-inducing levels.",
        "actions": [
            "Stay alert and keep checking the rainfall.",
            "Avoid low-lying areas and drainage channels where possible.",
            "Prepare to move valuables and vehicles to higher ground.",
        ],
    },
    "moderate": {
        "label": "MODERATE RISK",
        "summary": "Flood-inducing surface runoff is likely.",
        "actions": [
            "Be on high alert and avoid flood-prone roads and crossings.",
            "Move valuables, vehicles and livestock to higher ground now.",
            "Contact your local emergency management authority if water is rising.",
        ],
    },
    "high": {
        "label": "HIGH RISK",
        "summary": "Critical rainfall intensity reached; flooding is highly likely.",
        "actions": [
            "Contact the relevant emergency / government authority immediately.",
            "Move to higher ground or a safe building; never walk or drive through flood water.",
            "Switch off electrical appliances if water is entering buildings.",
            "Follow official instructions and help neighbours who need assistance.",
        ],
    },
}


def classify(intensity):
    for limit, level in TRIGGERS_MM_HR:
        if intensity >= limit:
            return level
    return "normal"


@app.route("/")
def home():
    if os.path.isdir(DIST_DIR) and os.path.exists(os.path.join(DIST_DIR, "index.html")):
        return send_from_directory(DIST_DIR, "index.html")
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/assets/<path:filename>")
def assets(filename):
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.isdir(assets_dir) and os.path.exists(os.path.join(assets_dir, filename)):
        return send_from_directory(assets_dir, filename)
    return ("Not found", 404)


@app.route("/api/health", methods=["GET", "OPTIONS"])
def health():
    if request.method == "OPTIONS":
        return ("", 204)
    return jsonify(status="ok", service="Oluyole Flood Early Warning Backend")


@app.route("/api/assess", methods=["POST", "OPTIONS"])
def assess():
    if request.method == "OPTIONS":
        return ("", 204)

    d = request.get_json(silent=True) or {}
    try:
        if d.get("intensity") not in (None, ""):
            i = float(d["intensity"])
        else:
            mm, hrs = float(d["rainfall_mm"]), float(d["duration_hrs"])
            if hrs <= 0:
                return jsonify(error="Duration must be greater than zero."), 400
            i = mm / hrs
    except (KeyError, TypeError, ValueError):
        return jsonify(error="Enter a rainfall intensity (mm/hr), or rainfall depth (mm) and duration (hours)."), 400
    if i < 0:
        return jsonify(error="Rainfall cannot be negative."), 400
    level = classify(i)
    q = COMPOSITE_C * i * CATCHMENT_AREA_KM2 / 3.6   # Rational Method, m3/s
    m = MESSAGES[level]
    return jsonify(
        level=level,
        label=m["label"],
        summary=m["summary"],
        actions=m["actions"],
        intensity=round(i, 2),
        runoff_m3s=round(q, 2),
    )


@app.route("/favicon.ico")
def favicon():
    return "", 204


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

