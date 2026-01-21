
class CryptoService {
  constructor() {
    this.algoName = "AES-GCM";
    this.kdfName = "PBKDF2";
    this.saltLen = 16;
    this.ivLen = 12;
    this.iter = 100000;
  }


  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }


  async generateKey(password, salt) {
    const enc = new TextEncoder();
    const passwordMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      this.kdfName,
      false,
      ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
      {
        name: this.kdfName,
        salt: salt,
        iterations: this.iter,
        hash: "SHA-256",
      },
      passwordMaterial,
      { name: this.algoName, length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }


  async encryptProcess(file, password) {
    const fileBuffer = await this.readFileAsArrayBuffer(file);
    const salt = window.crypto.getRandomValues(new Uint8Array(this.saltLen));
    const iv = window.crypto.getRandomValues(new Uint8Array(this.ivLen));

    const key = await this.generateKey(password, salt);

    const encryptedData = await window.crypto.subtle.encrypt(
      { name: this.algoName, iv: iv },
      key,
      fileBuffer
    );


    return new Blob([salt, iv, encryptedData], {
      type: "application/octet-stream",
    });
  }


  async decryptProcess(file, password) {
    const fileBuffer = await this.readFileAsArrayBuffer(file);

  
    const salt = fileBuffer.slice(0, 16);
    const iv = fileBuffer.slice(16, 28);
    const encryptedData = fileBuffer.slice(28);

    const key = await this.generateKey(password, salt);

    const decryptedData = await window.crypto.subtle.decrypt(
      { name: this.algoName, iv: iv },
      key,
      encryptedData
    );

    return new Blob([decryptedData]);
  }


  saveFileToDisk(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}


class UIManager {
  constructor(cryptoService) {
    this.cryptoService = cryptoService; 

    this.tabs = document.querySelectorAll(".tab-link");
    this.contents = document.querySelectorAll(".tab-content");
    this.statusMsg = document.getElementById("status-message");


    this.encFile = document.getElementById("encrypt-file");
    this.encPass = document.getElementById("encrypt-password");
    this.encBtn = document.getElementById("encrypt-button");

    this.decFile = document.getElementById("decrypt-file");
    this.decPass = document.getElementById("decrypt-password");
    this.decBtn = document.getElementById("decrypt-button");

    this.init();
  }

  init() {

    this.tabs.forEach((link) => {
      link.addEventListener("click", (e) => {
        const tabId = e.target.getAttribute("onclick").match(/'(.*?)'/)[1];
        this.switchTab(tabId);
      });
    });
    this.switchTab("encrypt");

    if (this.encBtn) {
      this.encBtn.addEventListener("click", () => this.handleEncrypt());
    }
    if (this.decBtn) {
      this.decBtn.addEventListener("click", () => this.handleDecrypt());
    }
  }

  switchTab(tabId) {
    this.contents.forEach((c) => c.classList.remove("active"));
    this.tabs.forEach((t) => t.classList.remove("active"));

    const tabContent = document.getElementById(tabId);
    if (tabContent) tabContent.classList.add("active");

    const activeBtn = document.querySelector(
      `.tab-link[onclick*="'${tabId}'"]`
    );
    if (activeBtn) activeBtn.classList.add("active");
  }

  showStatus(msg, isError = false, isLoading = false) {
    if (!this.statusMsg) return;

    this.statusMsg.style.display = "block";
    this.statusMsg.textContent = msg;
    this.statusMsg.className = "status";

    if (isLoading) {
      this.statusMsg.classList.add("success"); 
    } else if (isError) {
      this.statusMsg.classList.add("error");
    } else {
      this.statusMsg.classList.add("success");
    }
  }


  async handleEncrypt() {
    try {
      const file = this.encFile.files[0];
      const pass = this.encPass.value;

      if (!file) return this.showStatus("Будь ласка, оберіть файл.", true);
      if (pass.length < 8)
        return this.showStatus("Пароль має бути не менше 8 символів.", true);

      this.showStatus("Шифрування... Це може зайняти деякий час.", false, true);


      const blob = await this.cryptoService.encryptProcess(file, pass);

      this.cryptoService.saveFileToDisk(blob, file.name + ".encrypted");
      this.showStatus("Файл успішно зашифровано!");
      this.encPass.value = "";
    } catch (err) {
      console.error(err);
      this.showStatus("Виникла помилка шифрування.", true);
    }
  }


  async handleDecrypt() {
    try {
      const file = this.decFile.files[0];
      const pass = this.decPass.value;

      if (!file)
        return this.showStatus("Будь ласка, оберіть .encrypted файл.", true);
      if (!pass) return this.showStatus("Будь ласка, введіть пароль.", true);

      this.showStatus(
        "Розшифрування... Це може зайняти деякий час.",
        false,
        true
      );


      const blob = await this.cryptoService.decryptProcess(file, pass);

      const originalName = file.name.replace(/\.encrypted$/, "");
      this.cryptoService.saveFileToDisk(blob, originalName);

      this.showStatus("Файл успішно розшифровано!");
      this.decPass.value = "";
    } catch (err) {
      console.error(err);
      this.showStatus("Помилка! Невірний пароль або файл пошкоджено.", true);
    }
  }
}


document.addEventListener("DOMContentLoaded", () => {
  const cryptoService = new CryptoService();
  new UIManager(cryptoService);
});
