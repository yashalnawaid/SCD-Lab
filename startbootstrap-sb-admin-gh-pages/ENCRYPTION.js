const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const mysql = require('mysql2/promise'); 

const app = express();
const port = 3000;

const SECRET_KEY = 'your_secret_key_here';
const algorithm = 'aes-256-cbc';

app.use(bodyParser.json());

function encryptData(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(SECRET_KEY), iv);
  let encryptedData = cipher.update(data, 'utf-8', 'hex');
  encryptedData += cipher.final('hex');
  return `${iv.toString('hex')}:${encryptedData}`;
}

function decryptData(encryptedData) {
  const [iv, encryptedText] = encryptedData.split(':');
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(SECRET_KEY), Buffer.from(iv, 'hex'));
  let decryptedData = decipher.update(encryptedText, 'hex', 'utf-8');
  decryptedData += decipher.final('utf-8');
  return decryptedData;
}

async function connectToDB() {
  try {
    const connection = await mysql.createConnection({
      host: 'your_mysql_host',
      user: 'your_mysql_user',
      password: 'your_mysql_password',
      database: 'your_database_name',
    });
    return connection;
  } catch (error) {
    console.error('Error connecting to the database:', error);
    return null;
  }
}


app.post('/encrypt', (req, res) => {
  const { data } = req.body;
  const encryptedData = encryptData(data);
  res.json({ encryptedData });
});

// API endpoint to decrypt data
app.post('/decrypt', (req, res) => {
  const { encryptedData } = req.body;
  const decryptedData = decryptData(encryptedData);
  res.json({ decryptedData });
});

// API endpoint to retrieve data from the database and encrypt it
app.get('/encryptedDataFromDB', async (req, res) => {
  const dbConnection = await connectToDB();
  if (!dbConnection) {
    return res.status(500).json({ error: 'Database connection failed' });
  }

  try {
    const [results] = await dbConnection.query('SELECT * FROM your_table');
    const encryptedResults = results.map((row) => {
      // Assuming you have a column named 'sensitive_data' in your_table
      const encryptedData = encryptData(row.sensitive_data);
      return { ...row, sensitive_data: encryptedData };
    });

    res.json(encryptedResults);
  } catch (error) {
    console.error('Error fetching data from the database:', error);
    res.status(500).json({ error: 'Database error' });
  } finally {
    dbConnection.end();
  }
});

const server = app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
