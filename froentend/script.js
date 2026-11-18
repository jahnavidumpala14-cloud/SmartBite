
// =====================================
// SMARTBITE - MAIN JAVASCRIPT
// =====================================

// 1. HOMEPAGE
function showMessage() {
    alert("Welcome to SmartBite! Let's save food together.");
}


// 2. DATABASE USING LOCAL STORAGE

function getDonations() {
    try {
        return JSON.parse(
            localStorage.getItem("smartbiteDonations")
        ) || [];
    } catch (error) {
        console.error("Error reading donations:", error);
        return [];
    }
}

function saveDonations(donations) {
    localStorage.setItem(
        "smartbiteDonations",
        JSON.stringify(donations)
    );
}


// 3. REGISTRATION


const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const user = {
            name: document.getElementById("name").value.trim(),
            email: document.getElementById("email").value.trim(),
            phone: document.getElementById("phone").value.trim(),
            organization: document.getElementById("organization").value.trim(),
            role: document.getElementById("role").value,
            password: document.getElementById("password").value
        };

        const message = document.getElementById("message");
        message.textContent = "Registering...";

        try {
            const response = await fetch("http://127.0.0.1:5000/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(user)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Registration failed");
            }

            message.textContent = result.message + " You can now log in.";
            registerForm.reset();

        } catch (error) {
            message.textContent = "Error: " + error.message;
        }
    });
}

// 4. LOGIN


// 4. LOGIN
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;
        const message = document.getElementById("loginMessage");

        message.textContent = "Logging in...";

        try {
            const response = await fetch(
                "http://127.0.0.1:5000/api/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Login failed");
            }

            localStorage.setItem("userName", result.name);
            localStorage.setItem("userEmail", result.email);
            localStorage.setItem("userRole", result.role);

            message.textContent = "Login successful!";

            if (result.role === "donor") {
                window.location.href = "donor.html";
            } else if (result.role === "ngo") {
                window.location.href = "ngo.html";
            } else {
                message.textContent = "Invalid account type.";
            }

        } catch (error) {
            message.textContent = "Error: " + error.message;
        }
    });
}



// 5. DONOR DASHBOARD

const API_URL = "http://127.0.0.1:5000/api/donations";

const donationForm = document.getElementById("donationForm");


// Display donations saved in the backend database

async function displayDonations() {
    const list = document.getElementById("donationList");

    if (!list) return;

    list.innerHTML = "<p>Loading donations...</p>";

    try {
        const donorEmail = localStorage.getItem("userEmail");

if (!donorEmail) {
    throw new Error("Please log in again.");
}

const response = await fetch(
    API_URL + "?donor_email=" + encodeURIComponent(donorEmail)
);

        if (!response.ok) {
            throw new Error("Could not load donations");
        }

        const donations = await response.json();
// Update Donation Summary
const total = donations.length;

const availableCount = donations.filter(
    item => item.status === "Available"
).length;

const requestedCount = donations.filter(
    item => item.status === "Requested"
).length;

document.getElementById("totalDonations").textContent = total;
document.getElementById("availableDonations").textContent = availableCount;
document.getElementById("requestedDonations").textContent = requestedCount;
        list.innerHTML = "";

        if (donations.length === 0) {
            list.textContent = "No donations added yet.";
            return;
        }

        donations.forEach(function(item) {
            const card = document.createElement("div");
            card.className = "donation-card";

            const title = document.createElement("h3");
            title.textContent = item.food_name;

            const quantity = document.createElement("p");
            quantity.textContent =
                "Quantity: " + item.quantity + " meals";

            const location = document.createElement("p");
            location.textContent =
                "Pickup Location: " + item.location;

            const expiry = document.createElement("p");
            expiry.textContent =
                "Expiry: " + item.expiry;

            const type = document.createElement("p");
            type.textContent =
                "Food Type: " + item.food_type;

            const status = document.createElement("p");
            status.textContent =
                "Donation Status: " + item.status;

            if (item.status === "Requested") {
                status.style.color = "green";
                status.style.fontWeight = "bold";
            } else {
                status.style.color = "orange";
                status.style.fontWeight = "bold";
            }

            card.append(
                title,
                quantity,
                location,
                expiry,
                type,
                status
            );

            list.appendChild(card);
        });

    } catch (error) {
        console.error("Donor Dashboard error:", error);
        list.textContent =
            "Unable to load donations. Check Flask server.";
    }
}

// Submit donation to Flask backend
if (donationForm) {

    donationForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const foodName = document.getElementById("foodName").value;
        const quantity = Number(document.getElementById("quantity").value);
        const location = document.getElementById("location").value;
        const expiry = document.getElementById("expiry").value;
        const foodType = document.getElementById("foodType").value;
        const description = document.getElementById("description").value;

        if (new Date(expiry) <= new Date()) {
            alert("Please select a future expiry date and time.");
            return;
        }
const donation = {
    food_name: foodName,
    quantity: quantity,
    location: location,
    expiry: expiry,
    food_type: foodType,
    description: description,
    donor_email: localStorage.getItem("userEmail")
};
        const message = document.getElementById("donationMessage");
        message.textContent = "Submitting donation...";

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(donation)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Donation could not be saved.");
            }

            message.textContent = "Donation saved successfully!";

            donationForm.reset();

            // Reload donations from the database
            await displayDonations();

        } catch (error) {
            console.error("Donation error:", error);
            message.textContent = "Error: " + error.message;
        }
    });

    displayDonations();
}

 // AUTO-REFRESH DONOR DASHBOARD EVERY 10 SECONDS

setInterval(function() {
    const donorList = document.getElementById("donationList");

    if (donorList) {
        displayDonations();
    }
}, 10000);


// 6. NGO DASHBOARD

const NGO_API_URL = "http://127.0.0.1:5000/api/donations";

async function displayNGODonations() {
    const list = document.getElementById("ngoDonationList");

    if (!list) return;

    list.innerHTML = "<p>Loading donations...</p>";

    try {
        const response = await fetch(NGO_API_URL);

        if (!response.ok) {
            throw new Error("Could not load donations");
        }

        const donations = await response.json();
// Update Donation Summary

        const available = donations.filter(function(item) {
            return item.status === "Available" &&
                   new Date(item.expiry) > new Date();
        });

        list.innerHTML = "";

        if (available.length === 0) {
            list.textContent = "No available food donations currently.";
            return;
        }

        available.forEach(function(item) {
            const card = document.createElement("div");
            card.className = "ngo-card";

            const title = document.createElement("h3");
            title.textContent = item.food_name;

            const quantity = document.createElement("p");
            quantity.textContent = "Quantity: " + item.quantity + " meals";

            const location = document.createElement("p");
            location.textContent = "Pickup Location: " + item.location;

            const type = document.createElement("p");
            type.textContent = "Food Type: " + item.food_type;

            const expiry = document.createElement("p");
            expiry.textContent = "Expiry: " + item.expiry;

            const description = document.createElement("p");
            description.textContent = "Description: " + item.description;

           
const button = document.createElement("button");
button.textContent = "Request Food";

button.addEventListener("click", async function() {
    button.disabled = true;
    button.textContent = "Requesting...";

    try {
        const requestResponse = await fetch(
            NGO_API_URL + "/" + item.id + "/request",
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    ngo_email: localStorage.getItem("userEmail")
                })
            }
        );

        const result = await requestResponse.json();

        if (!requestResponse.ok) {
            throw new Error(result.error || "Request failed");
        }

        alert("Food request submitted successfully!");

        await displayNGODonations();

        if (typeof displayNGORequestedFood === "function") {
            await displayNGORequestedFood();
        }

    } catch (error) {
        alert(error.message);
        button.disabled = false;
        button.textContent = "Request Food";
    }
});


            card.append(
                title,
                quantity,
                location,
                type,
                expiry,
                description,
                button
            );

            list.appendChild(card);
        });

    } catch (error) {
        console.error("NGO Dashboard error:", error);
        list.textContent = "Unable to load donations. Check Flask server.";
    }
}

// Display food requested by the logged-in NGO
async function displayNGORequestedFood() {

    const list = document.getElementById("ngoRequestedList");

    if (!list) return;

    const ngoEmail = localStorage.getItem("userEmail");

    if (!ngoEmail) {
        list.textContent = "Please log in again.";
        return;
    }

    list.innerHTML = "<p>Loading requested food...</p>";

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/api/ngo/requests?ngo_email=" +
            encodeURIComponent(ngoEmail)
        );

        if (!response.ok) {
            throw new Error("Could not load requested food.");
        }

        const requests = await response.json();

        list.innerHTML = "";

        if (requests.length === 0) {
            list.textContent = "You have not requested any food yet.";
            return;
        }

        requests.forEach(function(item) {

            const card = document.createElement("div");
            card.className = "ngo-card";

            const title = document.createElement("h3");
            title.textContent = item.food_name;

            const quantity = document.createElement("p");
            quantity.textContent = "Quantity: " + item.quantity + " meals";

            const location = document.createElement("p");
            location.textContent = "Pickup Location: " + item.location;

            const type = document.createElement("p");
            type.textContent = "Food Type: " + item.food_type;

            const expiry = document.createElement("p");
            expiry.textContent = "Expiry: " + item.expiry;

            const description = document.createElement("p");
            description.textContent = "Description: " + item.description;

            const status = document.createElement("p");
            status.textContent = "Status: " + item.status;

            card.append(
                title,
                quantity,
                location,
                type,
                expiry,
                description,
                status
            );

            list.appendChild(card);
        });

    } catch (error) {

        console.error("Requested Food Error:", error);
        list.textContent = "Unable to load requested food.";
    }
}

displayNGODonations();
displayNGORequestedFood();

