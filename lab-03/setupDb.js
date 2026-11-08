const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "books.db");

const setupDatabase = async () => {
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    await db.exec(`
      DROP TABLE IF EXISTS book;
      CREATE TABLE book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        price INTEGER NOT NULL,
        pages INTEGER NOT NULL
      );
    `);

    const books = [
      ["The Great Gatsby", "F. Scott Fitzgerald", 350, 180],
      ["To Kill a Mockingbird", "Harper Lee", 450, 281],
      ["1984", "George Orwell", 299, 328],
      ["The Alchemist", "Paulo Coelho", 320, 208],
      ["The Catcher in the Rye", "J.D. Salinger", 420, 234],
      ["The Hobbit", "J.R.R. Tolkien", 550, 310],
      ["Clean Code", "Robert C. Martin", 750, 464],
      ["JavaScript: The Good Parts", "Douglas Crockford", 620, 176],
      ["Atomic Habits", "James Clear", 499, 320],
      ["Design Patterns", "Erich Gamma", 850, 395],
    ];

    for (const book of books) {
      await db.run(
        `INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)`,
        book
      );
    }

    console.log("Database initialized and seeded successfully.");
    await db.close();
  } catch (error) {
    console.error("Database setup failed:", error.message);
    process.exit(1);
  }
};

setupDatabase();
