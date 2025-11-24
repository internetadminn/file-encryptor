// playwright.config.js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  // Вказуємо Playwright, де шукати наші тести (папка 'tests')
  testDir: "./tests",

  // Максимальний час на виконання одного тесту (напр., 30 секунд)
  timeout: 30 * 1000,

  // === Найважливіша частина: налаштування веб-сервера ===
  webServer: {
    // Команда, яку треба виконати, щоб запустити ваш сервер
    command: "node server.js",

    // URL, за яким сервер буде доступний
    url: "http://localhost:3000",

    // (Не перезапускати сервер, якщо він вже запущений вручну)
    reuseExistingServer: !process.env.CI,
  },

  // Які браузери використовувати для тесту
  use: {
    // Ми тестуємо на Chromium (такий самий рушій, як у вашого Edge)
    browserName: "chromium",

    // 'true' - запускати без видимого вікна браузера (швидше)
    // 'false' - ви побачите, як робот "клікає" по сайту (для налагодження)
    headless: true,
  },
});
