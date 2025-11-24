// завантаження html
document.addEventListener("DOMContentLoaded", () => {
  // перемикання вкладок
  const tabLinks = document.querySelectorAll(".tab-link");
  const tabContents = document.querySelectorAll(".tab-content");

  function showTab(tabId) {
    tabContents.forEach((content) => content.classList.remove("active"));
    tabLinks.forEach((link) => link.classList.remove("active"));

    document.getElementById(tabId).classList.add("active");
    const activeButton = document.querySelector(
      `.tab-link[onclick*="'${tabId}'"]`
    );
    if (activeButton) {
      activeButton.classList.add("active");
    }
  }

  tabLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const tabId = event.target.getAttribute("onclick").match(/'(.*?)'/)[1];
      showTab(tabId);
    });
  });

  showTab("encrypt"); // показ шифрування по дефолту

  // підключення елементів

  // "Шифрувати"
  const encryptFile = document.getElementById("encrypt-file");
  const encryptPassword = document.getElementById("encrypt-password");
  const encryptButton = document.getElementById("encrypt-button");

  // "Розшифрувати"
  const decryptFile = document.getElementById("decrypt-file");
  const decryptPassword = document.getElementById("decrypt-password");
  const decryptButton = document.getElementById("decrypt-button");

  // поле для повідомлень
  const statusMessage = document.getElementById("status-message");

  // логіка шифрування!!!!!!!!!!!!!!!!!!!!!!

  encryptButton.addEventListener("click", async () => {
    try {
      const file = encryptFile.files[0];
      const password = encryptPassword.value;

      if (!file) {
        showStatus("Будь ласка, оберіть файл.", true);
        return;
      }
      if (password.length < 8) {
        showStatus("Пароль має бути не менше 8 символів.", true);
        return;
      }

      showStatus("Шифрування... Це може зайняти деякий час.", false, true);

      const fileBuffer = await readFileAsArrayBuffer(file);
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const key = await getKeyFromPassword(password, salt);

      const encryptedData = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        fileBuffer
      );

      const encryptedFileBlob = new Blob([salt, iv, encryptedData], {
        type: "application/octet-stream",
      });
      saveFile(encryptedFileBlob, file.name + ".encrypted");

      showStatus("Файл успішно зашифровано!", false);
      encryptPassword.value = ""; // очищення поля пароля пісял шифрування
    } catch (error) {
      console.error("Помилка шифрування:", error);
      showStatus("Виникла помилка шифрування. Перевірте консоль.", true);
    }
  });

  // логіка розшифрування !!!!!!!!!!!!!!!!!!!!111

  decryptButton.addEventListener("click", async () => {
    try {
      const file = decryptFile.files[0];
      const password = decryptPassword.value;

      // валідація файлу
      if (!file) {
        showStatus("Будь ласка, оберіть .encrypted файл.", true);
        return;
      }
      if (!password) {
        showStatus("Будь ласка, введіть пароль.", true);
        return;
      }

      showStatus("Розшифрування... Це може зайняти деякий час.", false, true);

      // читання файлу як ArrayBuffer
      const fileBuffer = await readFileAsArrayBuffer(file);

      // IV та самі дані розбір файлу + сіль + IV
      // [16 байт Salt] + [12 байт IV] + [зашифровані дані]

      const salt = fileBuffer.slice(0, 16);
      const iv = fileBuffer.slice(16, 28); // 16 + 12 = 28
      const encryptedData = fileBuffer.slice(28);

      //  отримання ключа з пароля та солі
      // PBKDF2 згенерує той самий ключ, якщо пароль і сіль збігаються
      const key = await getKeyFromPassword(password, salt);

      // розшифрування даних
      // помилка  crypto.subtle.decrypt якщо ключ невалідний
      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        key,
        encryptedData
      );

      // створення Blob з розшифрованих даних
      const decryptedFileBlob = new Blob([decryptedData]);

      // збереження файлу без .encrypted
      const originalFileName = file.name.replace(/\.encrypted$/, "");
      saveFile(decryptedFileBlob, originalFileName);

      showStatus("Файл успішно розшифровано!", false);
      decryptPassword.value = ""; // очищення поля з паролем
    } catch (error) {
      // якщо невірний пароль
      console.error("Помилка розшифрування:", error);
      showStatus("Помилка! Невірний пароль або файл пошкоджено.", true);
    }
  });

  // допоміжні функції
  // надання користувачу статусу операції
  function showStatus(message, isError = false, isLoading = false) {
    statusMessage.style.display = "block";
    statusMessage.textContent = message;
    statusMessage.classList.remove("success", "error", "loading");

    if (isLoading) {
      statusMessage.classList.add("loading");

      statusMessage.classList.add("success");
    } else if (isError) {
      statusMessage.classList.add("error");
    } else {
      statusMessage.classList.add("success");
    }
  }
  // читання файлу як ArrayBuffer
  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }
  // реалізація PBKDF2 для отримання ключа з пароля
  async function getKeyFromPassword(password, salt) {
    const enc = new TextEncoder();
    const passwordMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    const key = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      passwordMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    return key;
  }
  // функція для збереження файлу
  function saveFile(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
});
