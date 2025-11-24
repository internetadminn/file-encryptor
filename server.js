const express = require("express");
const path = require("path");
const app = express();

// Render надасть порт через process.env.PORT

const PORT = process.env.PORT || 3000;

// передаємо статичні файли з папки "main"
app.use(express.static(path.join(__dirname, "main")));

// перевірка роботи серверу

app.get("/health", (req, res) => {
  res.status(200).send("Server is healthy");
});

app.listen(PORT, () => {
  console.log(`Сервер успішно запущено на порту ${PORT}`);
});

//                      http://localhost:3000/

//                        npx playwright test