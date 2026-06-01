from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from datetime import date, datetime
import re
import os
import anthropic

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///patients.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ── Model ──────────────────────────────────────────────────────────────────────
class Patient(db.Model):
    id           = db.Column(db.Integer, primary_key=True)
    full_name    = db.Column(db.String(120), nullable=False)
    dob          = db.Column(db.String(10),  nullable=False)
    email        = db.Column(db.String(120), nullable=False)
    glucose      = db.Column(db.Float,       nullable=False)
    haemoglobin  = db.Column(db.Float,       nullable=False)
    cholesterol  = db.Column(db.Float,       nullable=False)
    remarks      = db.Column(db.Text,        default='')
    created_at   = db.Column(db.DateTime,    default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':          self.id,
            'full_name':   self.full_name,
            'dob':         self.dob,
            'email':       self.email,
            'glucose':     self.glucose,
            'haemoglobin': self.haemoglobin,
            'cholesterol': self.cholesterol,
            'remarks':     self.remarks,
            'created_at':  self.created_at.strftime('%Y-%m-%d %H:%M')
        }

# ── Validation helpers ─────────────────────────────────────────────────────────
def validate_email(email):
    return re.match(r'^[\w\.-]+@[\w\.-]+\.\w{2,}$', email)

def validate_dob(dob_str):
    try:
        dob = datetime.strptime(dob_str, '%Y-%m-%d').date()
        return dob < date.today()
    except ValueError:
        return False

def validate_numeric(value, min_val=0, max_val=9999):
    try:
        v = float(value)
        return min_val <= v <= max_val
    except (TypeError, ValueError):
        return False

# ── AI Health Prediction ───────────────────────────────────────────────────────
def get_health_prediction(full_name, dob, glucose, haemoglobin, cholesterol):
    api_key = os.environ.get('ANTHROPIC_API_KEY', '')
    if not api_key:
        return generate_rule_based_remark(glucose, haemoglobin, cholesterol)

    try:
        client = anthropic.Anthropic(api_key=api_key)
        age = date.today().year - int(dob[:4])

        prompt = f"""You are a clinical AI assistant. Analyse these patient blood test results and provide a brief health risk assessment.

Patient: {full_name}, Age: {age}
Blood Test Results:
- Glucose: {glucose} mg/dL  (Normal: 70–99 fasting)
- Haemoglobin: {haemoglobin} g/dL  (Normal: Men 13.5–17.5, Women 12–15.5)
- Cholesterol: {cholesterol} mg/dL  (Desirable: <200, Borderline: 200–239, High: ≥240)

Provide a concise health assessment (2–3 sentences) covering:
1. Whether each value is normal, borderline, or abnormal
2. Possible health risks indicated
3. A brief recommendation

Keep it factual and professional. Do not diagnose — this is a risk screening tool."""

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text.strip()

    except Exception as e:
        return generate_rule_based_remark(glucose, haemoglobin, cholesterol)

def generate_rule_based_remark(glucose, haemoglobin, cholesterol):
    """Fallback if no API key is set."""
    issues = []
    if glucose < 70:
        issues.append("low glucose (hypoglycaemia risk)")
    elif glucose > 125:
        issues.append("elevated glucose (diabetes risk)")

    if haemoglobin < 12:
        issues.append("low haemoglobin (anaemia risk)")
    elif haemoglobin > 17.5:
        issues.append("high haemoglobin (polycythaemia risk)")

    if cholesterol >= 240:
        issues.append("high cholesterol (cardiovascular risk)")
    elif cholesterol >= 200:
        issues.append("borderline cholesterol")

    if not issues:
        return "All blood test values are within normal ranges. No immediate health risks detected. Continue regular health monitoring."
    return f"Detected: {', '.join(issues)}. Please consult a healthcare professional for further evaluation and personalised advice."

# ── Routes ─────────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/patients', methods=['GET'])
def get_patients():
    patients = Patient.query.order_by(Patient.created_at.desc()).all()
    return jsonify([p.to_dict() for p in patients])

@app.route('/api/patients/<int:pid>', methods=['GET'])
def get_patient(pid):
    p = Patient.query.get_or_404(pid)
    return jsonify(p.to_dict())

@app.route('/api/patients', methods=['POST'])
def create_patient():
    data = request.get_json()
    errors = _validate(data)
    if errors:
        return jsonify({'error': errors}), 400

    remarks = get_health_prediction(
        data['full_name'], data['dob'],
        float(data['glucose']), float(data['haemoglobin']), float(data['cholesterol'])
    )

    p = Patient(
        full_name   = data['full_name'].strip(),
        dob         = data['dob'],
        email       = data['email'].strip().lower(),
        glucose     = float(data['glucose']),
        haemoglobin = float(data['haemoglobin']),
        cholesterol = float(data['cholesterol']),
        remarks     = remarks
    )
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201

@app.route('/api/patients/<int:pid>', methods=['PUT'])
def update_patient(pid):
    p = Patient.query.get_or_404(pid)
    data = request.get_json()
    errors = _validate(data)
    if errors:
        return jsonify({'error': errors}), 400

    p.full_name   = data['full_name'].strip()
    p.dob         = data['dob']
    p.email       = data['email'].strip().lower()
    p.glucose     = float(data['glucose'])
    p.haemoglobin = float(data['haemoglobin'])
    p.cholesterol = float(data['cholesterol'])
    p.remarks     = get_health_prediction(
        p.full_name, p.dob, p.glucose, p.haemoglobin, p.cholesterol
    )
    db.session.commit()
    return jsonify(p.to_dict())

@app.route('/api/patients/<int:pid>', methods=['DELETE'])
def delete_patient(pid):
    p = Patient.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    return jsonify({'message': 'Patient record deleted successfully.'})

def _validate(data):
    errs = []
    if not data.get('full_name', '').strip():
        errs.append('Full name is required.')
    if not validate_email(data.get('email', '')):
        errs.append('Invalid email address.')
    if not validate_dob(data.get('dob', '')):
        errs.append('Date of birth must be a valid past date.')
    for field, label in [('glucose', 'Glucose'), ('haemoglobin', 'Haemoglobin'), ('cholesterol', 'Cholesterol')]:
        if not validate_numeric(data.get(field)):
            errs.append(f'{label} must be a positive number.')
    return errs

# ── Init ───────────────────────────────────────────────────────────────────────
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, port=5000)