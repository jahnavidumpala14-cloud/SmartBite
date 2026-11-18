from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import os

app = Flask(__name__)
CORS(app)

# Database location
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "smartbite.db")


# Connect to database
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# Create donations table


# Create donations and users tables
def create_table():
    conn = get_db_connection()

    # Donations table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS donations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            food_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            location TEXT NOT NULL,
            expiry TEXT NOT NULL,
            food_type TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'Available'
        )
    """)
    # Add donor_email to existing databases if missing
    columns = [
        row["name"]
        for row in conn.execute(
            "PRAGMA table_info(donations)"
        ).fetchall()
    ]

    if "donor_email" not in columns:
        conn.execute(
            "ALTER TABLE donations ADD COLUMN donor_email TEXT"
        )
    # Users table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT NOT NULL,
            organization TEXT NOT NULL,
            role TEXT NOT NULL,
            password TEXT NOT NULL
        )
    """)

    # NGO requests table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ngo_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            donation_id INTEGER NOT NULL UNIQUE,
            ngo_email TEXT NOT NULL,
            FOREIGN KEY (donation_id) REFERENCES donations(id)
        )
    """)

    # Save and close database
    conn.commit()
    conn.close()

# Home API
@app.route("/")
def home():
    return jsonify({
        "message": "Welcome to SmartBite Backend!",
        "status": "Running successfully"
    })

# API 1: Add a food donation

# API 1: Add a food donation
@app.route("/api/donations", methods=["POST"])
def add_donation():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON data"}), 400

    required_fields = [
        "food_name",
        "quantity",
        "location",
        "expiry",
        "food_type"
    ]

    for field in required_fields:
        if field not in data or not str(data[field]).strip():
            return jsonify({"error": f"{field} is required"}), 400

    # Get donor email
    donor_email = str(data.get("donor_email", "")).strip().lower()

    if not donor_email:
        return jsonify({"error": "Donor email is required"}), 400

    # Validate quantity
    try:
        quantity = int(data["quantity"])
        if quantity <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "Quantity must be positive"}), 400

    conn = get_db_connection()

    # Verify donor account
    donor = conn.execute(
        "SELECT id FROM users WHERE email = ? AND role = 'donor'",
        (donor_email,)
    ).fetchone()

    if donor is None:
        conn.close()
        return jsonify({"error": "Valid donor account not found"}), 400

    # Save donation
    cursor = conn.execute("""
        INSERT INTO donations
        (food_name, quantity, location, expiry,
         food_type, description, donor_email)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        data["food_name"],
        quantity,
        data["location"],
        data["expiry"],
        data["food_type"],
        data.get("description", ""),
        donor_email
    ))

    donation_id = cursor.lastrowid

    conn.commit()
    conn.close()

    return jsonify({
        "message": "Donation added successfully!",
        "donation_id": donation_id
    }), 201


# API 2: Get all food donations
@app.route("/api/donations", methods=["GET"])
def get_donations():
    conn = get_db_connection()

    donations = conn.execute(
        "SELECT * FROM donations ORDER BY id DESC"
    ).fetchall()

    conn.close()

    return jsonify([dict(donation) for donation in donations])


# API 3: NGO requests a food donation
@app.route("/api/donations/<int:donation_id>/request", methods=["PUT"])
def request_donation(donation_id):
    data = request.get_json(silent=True) or {}
    ngo_email = str(data.get("ngo_email", "")).strip().lower()

    if not ngo_email:
        return jsonify({"error": "NGO email is required"}), 400

    conn = get_db_connection()

    try:
        ngo = conn.execute(
            "SELECT id FROM users WHERE email = ? AND role = 'ngo'",
            (ngo_email,)
        ).fetchone()

        if ngo is None:
            return jsonify({"error": "Valid NGO account not found"}), 400

        donation = conn.execute(
            "SELECT * FROM donations WHERE id = ?",
            (donation_id,)
        ).fetchone()

        if donation is None:
            return jsonify({"error": "Donation not found"}), 404

        if donation["status"] != "Available":
            return jsonify({"error": "Donation is not available"}), 400

        conn.execute("""
            UPDATE donations
            SET status = 'Requested'
            WHERE id = ? AND status = 'Available'
        """, (donation_id,))

        if conn.execute("SELECT changes()").fetchone()[0] == 0:
            return jsonify({"error": "Donation is no longer available"}), 400

        conn.execute("""
            INSERT INTO ngo_requests (donation_id, ngo_email)
            VALUES (?, ?)
        """, (donation_id, ngo_email))

        conn.commit()

        return jsonify({
            "message": "Food request submitted successfully!"
        }), 200

    except sqlite3.IntegrityError:
        conn.rollback()
        return jsonify({"error": "This donation has already been requested"}), 400

    finally:
        conn.close()


# API 4: Get food requested by an NGO
@app.route("/api/ngo/requests", methods=["GET"])
def get_ngo_requests():
    ngo_email = request.args.get("ngo_email", "").strip().lower()

    if not ngo_email:
        return jsonify({"error": "NGO email is required"}), 400

    conn = get_db_connection()

    try:
        requests_list = conn.execute("""
            SELECT donations.*
            FROM donations
            JOIN ngo_requests
            ON donations.id = ngo_requests.donation_id
            WHERE ngo_requests.ngo_email = ?
            ORDER BY ngo_requests.id DESC
        """, (ngo_email,)).fetchall()

        return jsonify([dict(item) for item in requests_list])

    finally:
        conn.close()



# API 4: Register a new user
@app.route("/api/register", methods=["POST"])
def register_user():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid registration data"}), 400

    required_fields = [
        "name", "email", "phone",
        "organization", "role", "password"
    ]

    for field in required_fields:
        if not str(data.get(field, "")).strip():
            return jsonify({"error": field + " is required"}), 400

    name = data["name"].strip()
    email = data["email"].strip().lower()
    phone = data["phone"].strip()
    organization = data["organization"].strip()
    role = data["role"].strip().lower()
    password = data["password"]

    if role not in ["donor", "ngo"]:
        return jsonify({"error": "Invalid account type"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must contain at least 6 characters"}), 400

    hashed_password = generate_password_hash(password)

    conn = get_db_connection()

    try:
        conn.execute("""
            INSERT INTO users
            (name, email, phone, organization, role, password)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            name, email, phone,
            organization, role, hashed_password
        ))

        conn.commit()

        return jsonify({
            "message": "Registration successful!"
        }), 201

    except sqlite3.IntegrityError:
        return jsonify({
            "error": "This email is already registered."
        }), 409

    finally:
        conn.close()

# API 5: User Login
@app.route("/api/login", methods=["POST"])
def login_user():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid login data"}), 400

    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({
            "error": "Email and password are required"
        }), 400

    conn = get_db_connection()

    try:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (email,)
        ).fetchone()

        if user is None:
            return jsonify({
                "error": "Account not found"
            }), 404

        if not check_password_hash(user["password"], password):
            return jsonify({
                "error": "Incorrect password"
            }), 401

        return jsonify({
            "message": "Login successful!",
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }), 200

    finally:
        conn.close()

# Start server
if __name__ == "__main__":
    create_table()
    print("SmartBite database initialized!")
    app.run(debug=True)
