from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

# -----------------------------
# DATABASE CONNECTION
# -----------------------------
try:
    conn = psycopg2.connect(
        host="localhost",
        database="online_yoga",
        user="postgres",
        password="1008",  # 🔴 change this
        port="5432"
    )
    cursor = conn.cursor()

    
    print("✅ Database connected successfully")

except Exception as e:
    print("❌ Database connection failed:", e)


# -----------------------------
# HOME ROUTE
# -----------------------------
@app.route('/')
def home():
    return "Backend is running successfully 🚀"


# -----------------------------
# REGISTER ROUTE
# -----------------------------
@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()

        name = data.get('name')
        email = data.get('email')
        password = data.get('password')

        if not name or not email or not password:
            return jsonify({"error": "All fields are required"}), 400

        # Check if user exists
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"error": "Email already exists"}), 409

        hashed_password = generate_password_hash(password)

        cursor.execute(
            "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",
            (name, email, hashed_password)
        )
        conn.commit()

        return jsonify({"message": "Registration successful"}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500


# -----------------------------
# LOGIN ROUTE
# -----------------------------
@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()

        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400

        cursor.execute("SELECT id, name, email, password FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if user is None:
            return jsonify({"error": "Invalid email"}), 401

        user_id, name, user_email, hashed_password = user

        if check_password_hash(hashed_password, password):
            return jsonify({
                "message": "Login successful",
                "user": {
                    "id": user_id,
                    "name": name,
                    "email": user_email
                }
            }), 200
        else:
            return jsonify({"error": "Wrong password"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -----------------------------
# CONTACT ROUTE
# -----------------------------
@app.route('/contact', methods=['POST'])
def contact():
    try:
        data = request.get_json()

        name = data.get('name')
        email = data.get('email')
        message = data.get('message')

        if not name or not email or not message:
            return jsonify({"error": "All fields required"}), 400

        cursor.execute(
            "INSERT INTO contact_messages (name, email, message) VALUES (%s, %s, %s)",
            (name, email, message)
        )
        conn.commit()

        return jsonify({"message": "Message sent successfully"}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500


# -----------------------------
# RUN SERVER
# -----------------------------
if __name__ == '__main__':
    print("🔥 Starting server...")
    app.run(debug=True)