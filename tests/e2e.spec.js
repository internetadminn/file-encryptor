import { test, expect } from "@playwright/test";

import fs from "fs";
import path from "path";

const TEST_FILE_PATH = path.join(__dirname, "..", "test-files", "test.txt");

const TEST_PASSWORD = "MySuperStrongPassword123_E2E";

const ENCRYPTED_FILE_TEMP = path.join(__dirname, "temp_encrypted.enc");

const DECRYPTED_FILE_TEMP = path.join(__dirname, "temp_decrypted.txt");

test("Тест 1: Повний цикл Шифрування -> Розшифрування", async ({ page }) => {
  await page.goto("http://localhost:3000");

  await page.locator("#encrypt-file").setInputFiles(TEST_FILE_PATH);

  await page.locator("#encrypt-password").fill(TEST_PASSWORD);

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#encrypt-button").click();

  const download = await downloadPromise;

  await download.saveAs(ENCRYPTED_FILE_TEMP);

  await page.locator('.tab-link[onclick*="decrypt"]').click();

  await page.locator("#decrypt-file").setInputFiles(ENCRYPTED_FILE_TEMP);

  await page.locator("#decrypt-password").fill(TEST_PASSWORD);

  const finalDownloadPromise = page.waitForEvent("download");

  await page.locator("#decrypt-button").click();
  const finalDownload = await finalDownloadPromise;

  await finalDownload.saveAs(DECRYPTED_FILE_TEMP);

  const originalContent = fs.readFileSync(TEST_FILE_PATH);

  const decryptedContent = fs.readFileSync(DECRYPTED_FILE_TEMP);

  expect(decryptedContent).toEqual(originalContent);

  fs.unlinkSync(ENCRYPTED_FILE_TEMP);
  fs.unlinkSync(DECRYPTED_FILE_TEMP);
});

test("Тест 3: Тестування автентифікації (невірний пароль)", async ({
  page,
}) => {
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

  await page.locator('.tab-link[onclick*="decrypt"]').click();
  await page.locator("#decrypt-file").setInputFiles(encryptedPath);

  await page.locator("#decrypt-password").fill("ЦЕЙ_ПАРОЛЬ_ТОЧНО_НЕПРАВИЛЬНИЙ");

  await page.locator("#decrypt-button").click();

  const statusMessage = page.locator("#status-message");

  await expect(statusMessage).toBeVisible();

  await expect(statusMessage).toHaveClass(/error/);

  await expect(statusMessage).toContainText("Невірний пароль");

  fs.unlinkSync(encryptedPath);
});
