const express = require('express');
const dotenv = require('dotenv');
const { Client } = require('pg');
const multer = require('multer'); 
const path = require('path');

dotenv.config();
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const db = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function connectToDatabase() {
  try {
    await db.connect();
    console.log("Database connected successfully");
  } catch (err) {
    console.error('Connection error:', err.stack);
  }
}

connectToDatabase();

const upload = multer({
  dest: 'public/uploads/', 
});

// Create users table if it doesn't exist
db.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(100),
    profile_photo VARCHAR(255)
  );
`)
  .then(() => console.log('Users table created successfully'))
  .catch(err => console.error('Error creating users table:', err.stack));

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', upload.single('profilePhoto'), async (req, res) => {
  const { username, email, password } = req.body;
  const profilePhotoPath = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    await db.query(
      `INSERT INTO users (username, email, password, profile_photo) VALUES ($1, $2, $3, $4)`,
      [username, email, password, profilePhotoPath]
    );
    res.redirect('/login');
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).send('Error registering user');
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query(
      `SELECT * FROM users WHERE email = $1 AND password = $2`,
      [email, password]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      res.render('profile', { user });
    } else {
      res.send('Invalid login credentials');
    }
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).send('Error logging in');
  }
});

app.get('/profile', async (req, res) => {
    res.render('profile', { user: null });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
