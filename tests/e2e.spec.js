// бібліотека Playwright
import { test, expect } from "@playwright/test";
// Підключаємо 'fs' (файлова система) та 'path' (шляхи) з Node.js
// Вони потрібні, щоб читати файли з диска та порівнювати їх
import fs from "fs";
import path from "path";

// --- Налаштування тесту ---

// __dirname - це поточна папка (тобто 'code/tests')
// path.join('..', ...) - означає "піднятися на 1 рівень вгору" (у папку 'code')
// Шлях до нашого вхідного файлу
const TEST_FILE_PATH = path.join(__dirname, "..", "test-files", "test.txt");
// Пароль, який будемо використовувати
const TEST_PASSWORD = "MySuperStrongPassword123_E2E";
// Назва тимчасового зашифрованого файлу (в папці 'tests')
const ENCRYPTED_FILE_TEMP = path.join(__dirname, "temp_encrypted.enc");
// Назва тимчасового розшифрованого файлу (в папці 'tests')
const DECRYPTED_FILE_TEMP = path.join(__dirname, "temp_decrypted.txt");

// === Тест 1: Автоматизація "Щасливого шляху" (Шифрування + Розшифрування) ===
test("Тест 1: Повний цикл Шифрування -> Розшифрування", async ({ page }) => {
  // 1. ВІДКРИВАЄМО САЙТ
  // Playwright автоматично запустить наш server.js (завдяки config)
  await page.goto("http://localhost:3000");

  // 2. ЕТАП ШИФРУВАННЯ

  // Знаходимо поле для файлу (#encrypt-file) та "завантажуємо" наш test.txt
  await page.locator("#encrypt-file").setInputFiles(TEST_FILE_PATH);
  // Знаходимо поле пароля (#encrypt-password) та "друкуємо" пароль
  await page.locator("#encrypt-password").fill(TEST_PASSWORD);

  // "Клікаємо" на кнопку "Зашифрувати"
  // Але спершу кажемо Playwright "чекати на подію завантаження файлу"
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#encrypt-button").click();

  // Чекаємо, поки завантаження (download) відбудеться
  const download = await downloadPromise;

  // Зберігаємо зашифрований файл тимчасово для наступного кроку
  await download.saveAs(ENCRYPTED_FILE_TEMP);

  // 3. ЕТАП РОЗШИФРУВАННЯ

  // "Клікаємо" на вкладку "Розшифрувати"
  await page.locator('.tab-link[onclick*="decrypt"]').click();

  // "Завантажуємо" щойно збережений зашифрований файл
  await page.locator("#decrypt-file").setInputFiles(ENCRYPTED_FILE_TEMP);
  // "Друкуємо" той самий пароль
  await page.locator("#decrypt-password").fill(TEST_PASSWORD);

  // Знову "ловимо" завантаження
  const finalDownloadPromise = page.waitForEvent("download");
  // "Клікаємо" на кнопку "Розшифрувати"
  await page.locator("#decrypt-button").click();
  const finalDownload = await finalDownloadPromise;

  // Зберігаємо фінальний розшифрований файл
  await finalDownload.saveAs(DECRYPTED_FILE_TEMP);

  // 4. ПЕРЕВІРКА (ASSERTION) - Найважливіший крок

  // Читаємо вміст оригінального файлу (з /test-files/test.txt)
  const originalContent = fs.readFileSync(TEST_FILE_PATH);
  // Читаємо вміст фінального розшифрованого файлу
  const decryptedContent = fs.readFileSync(DECRYPTED_FILE_TEMP);

  // Головна перевірка: чи ідентичні вони побайтово?
  expect(decryptedContent).toEqual(originalContent);

  // Прибираємо за собою (видаляємо тимчасові файли)
  fs.unlinkSync(ENCRYPTED_FILE_TEMP);
  fs.unlinkSync(DECRYPTED_FILE_TEMP);
});

// === Тест 3: Автоматизація "Невірного пароля" ===
test("Тест 3: Тестування автентифікації (невірний пароль)", async ({
  page,
}) => {
  // 1. ЕТАП ШИФРУВАННЯ (Робимо те саме, щоб отримати файл)
  await page.goto("http://localhost:3000");
  await page.locator("#encrypt-file").setInputFiles(TEST_FILE_PATH);
  await page.locator("#encrypt-password").fill(TEST_PASSWORD);
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#encrypt-button").click();
  const download = await downloadPromise;
  const encryptedPath = path.join(
    __dirname,
    "temp_encrypted_for_fail_test.enc"
  );
  await download.saveAs(encryptedPath);

  // 2. ЕТАП РОЗШИФРУВАННЯ (з невірним паролем)
  await page.locator('.tab-link[onclick*="decrypt"]').click();
  await page.locator("#decrypt-file").setInputFiles(encryptedPath);

  // ВВОДИМО НЕВІРНИЙ ПАРОЛЬ
  await page.locator("#decrypt-password").fill("ЦЕЙ_ПАРОЛЬ_ТОЧНО_НЕПРАВИЛЬНИЙ");

  // "Клікаємо"
  await page.locator("#decrypt-button").click();

  // 3. ПЕРЕВІРКА (ASSERTION)

  // Знаходимо наш div для статусу
  const statusMessage = page.locator("#status-message");

  // Перевіряємо, що він:
  // а) Став видимим
  await expect(statusMessage).toBeVisible();
  // б) Має клас 'error' (який робить його червоним)
  await expect(statusMessage).toHaveClass(/error/);
  // в) Містить правильний текст помилки
  await expect(statusMessage).toContainText("Невірний пароль");

  // Прибираємо за собою
  fs.unlinkSync(encryptedPath);
});
