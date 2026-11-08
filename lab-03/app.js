const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "books.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running on port 3000");
    });
  } catch (error) {
    console.error(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.get("/books/", async (request, response) => {
  try {
    const {
      search_q = "",
      order_by = "id",
      order = "ASC",
      limit = 10,
      offset = 0,
      min_price,
      max_price,
    } = request.query;

    const allowedColumns = ["id", "title", "author", "price", "pages"];
    const validOrderBy = allowedColumns.includes(order_by) ? order_by : "id";
    const validOrder = order.toUpperCase() === "DESC" ? "DESC" : "ASC";
    const parsedLimit = parseInt(limit, 10) || 10;
    const parsedOffset = parseInt(offset, 10) || 0;

    let getBooksQuery = "";
    let queryParams = [];

    if (min_price !== undefined && max_price !== undefined) {
      getBooksQuery = `
        SELECT *
        FROM book
        WHERE title LIKE ? AND price BETWEEN ? AND ?
        ORDER BY ${validOrderBy} ${validOrder}
        LIMIT ? OFFSET ?;
      `;
      queryParams = [
        `%${search_q}%`,
        Number(min_price),
        Number(max_price),
        parsedLimit,
        parsedOffset,
      ];
    } else if (min_price !== undefined) {
      getBooksQuery = `
        SELECT *
        FROM book
        WHERE title LIKE ? AND price >= ?
        ORDER BY ${validOrderBy} ${validOrder}
        LIMIT ? OFFSET ?;
      `;
      queryParams = [
        `%${search_q}%`,
        Number(min_price),
        parsedLimit,
        parsedOffset,
      ];
    } else if (max_price !== undefined) {
      getBooksQuery = `
        SELECT *
        FROM book
        WHERE title LIKE ? AND price <= ?
        ORDER BY ${validOrderBy} ${validOrder}
        LIMIT ? OFFSET ?;
      `;
      queryParams = [
        `%${search_q}%`,
        Number(max_price),
        parsedLimit,
        parsedOffset,
      ];
    } else {
      getBooksQuery = `
        SELECT *
        FROM book
        WHERE title LIKE ?
        ORDER BY ${validOrderBy} ${validOrder}
        LIMIT ? OFFSET ?;
      `;
      queryParams = [`%${search_q}%`, parsedLimit, parsedOffset];
    }

    const books = await db.all(getBooksQuery, queryParams);
    response.status(200).json(books);
  } catch (error) {
    response.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/books/:bookId/", async (request, response) => {
  try {
    const { bookId } = request.params;
    const getBookQuery = `SELECT * FROM book WHERE id = ?;`;
    const book = await db.get(getBookQuery, [bookId]);

    if (!book) {
      return response.status(404).json({ message: "Book Not Found" });
    }

    response.status(200).json(book);
  } catch (error) {
    response.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/books/", async (request, response) => {
  try {
    const { title, author, price, pages } = request.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return response
        .status(400)
        .json({ message: "Invalid Request: Title is required" });
    }

    if (!author || typeof author !== "string" || author.trim() === "") {
      return response
        .status(400)
        .json({ message: "Invalid Request: Author is required" });
    }

    if (
      price === undefined ||
      price === null ||
      typeof price !== "number" ||
      isNaN(price) ||
      price < 0
    ) {
      return response.status(400).json({
        message: "Invalid Request: Price must be a non-negative number",
      });
    }

    const pagesValue =
      pages !== undefined &&
      typeof pages === "number" &&
      !isNaN(pages) &&
      pages > 0
        ? pages
        : 0;

    const addBookQuery = `
      INSERT INTO book (title, author, price, pages)
      VALUES (?, ?, ?, ?);
    `;

    const dbResponse = await db.run(addBookQuery, [
      title.trim(),
      author.trim(),
      price,
      pagesValue,
    ]);

    response.status(201).json({
      bookId: dbResponse.lastID,
      message: "Book Added Successfully",
    });
  } catch (error) {
    response.status(500).json({ message: "Internal Server Error" });
  }
});

app.put("/books/:bookId/", async (request, response) => {
  try {
    const { bookId } = request.params;
    const checkBookQuery = `SELECT * FROM book WHERE id = ?;`;
    const existingBook = await db.get(checkBookQuery, [bookId]);

    if (!existingBook) {
      return response.status(404).json({ message: "Book Not Found" });
    }

    const {
      title = existingBook.title,
      author = existingBook.author,
      price = existingBook.price,
      pages = existingBook.pages,
    } = request.body;

    if (
      price !== undefined &&
      (typeof price !== "number" || isNaN(price) || price < 0)
    ) {
      return response.status(400).json({
        message: "Invalid Request: Price must be a non-negative number",
      });
    }

    const updateBookQuery = `
      UPDATE book
      SET title = ?, author = ?, price = ?, pages = ?
      WHERE id = ?;
    `;

    await db.run(updateBookQuery, [title, author, price, pages, bookId]);
    response.status(200).json({ message: "Book Updated Successfully" });
  } catch (error) {
    response.status(500).json({ message: "Internal Server Error" });
  }
});

app.delete("/books/:bookId/", async (request, response) => {
  try {
    const { bookId } = request.params;
    const checkBookQuery = `SELECT * FROM book WHERE id = ?;`;
    const existingBook = await db.get(checkBookQuery, [bookId]);

    if (!existingBook) {
      return response.status(404).json({ message: "Book Not Found" });
    }

    const deleteBookQuery = `DELETE FROM book WHERE id = ?;`;
    await db.run(deleteBookQuery, [bookId]);
    response.status(200).json({ message: "Book Deleted Successfully" });
  } catch (error) {
    response.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = app;
