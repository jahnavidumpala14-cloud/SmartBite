
import urllib.request
import json

url = "http://127.0.0.1:5000/api/donations"

data = {
    "food_name": "Vegetable Rice",
    "quantity": 5,
    "location": "Chennai",
    "expiry": "2026-11-18",
    "food_type": "Cooked",
    "description": "Freshly prepared food"
}

req = urllib.request.Request(
    url,
    data=json.dumps(data).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    response = urllib.request.urlopen(req)
    print("Status:", response.status)
    print("Response:", response.read().decode())

except Exception as e:
    print("Error:", e)
