const express = require("express");
const bodyparser = require("body-parser");
const jwt = require("jsonwebtoken");
const { google } = require("googleapis");
const fs = require("fs");
const cors = require("cors");
const { JWT } = require("google-auth-library");
const { sheets } = require("googleapis/build/src/apis/sheets");
const app = express();
const path = require("path");

// PORT
const port = 3001;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// LOGIN ROUTE
const Auth = new google.auth.GoogleAuth({
  keyFile: "../backend/secretKey.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const JWT_SECRET = "SACHITS_9603081959"; // SECRET KEY

app.post("/login", async (req, res) => {
  const { userId, mobileNmbr } = req.body;

  try {
    const auth = await Auth.getClient();
    const sheets = google.sheets({ version: "v4", auth });

    // Fetch user data from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: "1XS4aVs-d0_Z5Meg4zY-mybCIxy-H7oF3Glc33VnQjsk",
      range: "Members Details!B2:C21",
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No user data found." });
    }

    // Check if any row matches both userId and mobileNmbr
    const isValidUser = rows.some(
      ([sheetUserId, sheetMobileNmbr]) =>
        sheetUserId === userId && sheetMobileNmbr === mobileNmbr
    );

    // FUNCTION FOR THE UPDATE RECEIPT
    async function getUpatedReceipt() {
      return sheets.spreadsheets.values.update({
        spreadsheetId: "1XS4aVs-d0_Z5Meg4zY-mybCIxy-H7oF3Glc33VnQjsk",
        range: "Reciept!c4",
        valueInputOption: "RAW",
        requestBody: {
          values: [[userId]],
        },
      });
    }

    if (isValidUser) {
      await getUpatedReceipt();
      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30" });
      res.status(200).json({ message: "Login successful", token });
    } else {
      console.log("Invalid credentials");
      res.status(401).json({ error: "Invalid user ID or mobile number." });
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    res.status(500).json({ error: "An error occurred during login." });
  }
});

// SHEETS ENDPOINT
const credentials = JSON.parse(fs.readFileSync("../backend/secretKey.json"));
const auth = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  ["https://www.googleapis.com/auth/spreadsheets.readonly"]
);

async function accessSheets() {
  try {
    console.log("Authorizing...");
    await auth.authorize();
    console.log("Authorized successfully.");

    const sheets = google.sheets({ version: "v4", auth });
    console.log("Fetching data from Google Sheets...");

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: "1XS4aVs-d0_Z5Meg4zY-mybCIxy-H7oF3Glc33VnQjsk",
      range: "Reciept!b4:f30",
    });

    console.log("Sheet Data:", response.data.values);
    return response.data.values;
  } catch (error) {
    console.error("Error accessing Google Sheets:", error.message);
    throw error;
  }
}

app.get("/sheets", async (req, res) => {
  try {
    const sheetsData = await accessSheets();
    console.log(sheetsData);
    res.status(200).json(sheetsData);
  } catch (err) {
    res.status(500).json({ error: "Failed to access Google Sheets" });
  }
});

app.listen(port, () => console.log(`Server is running on port ${port}`));
