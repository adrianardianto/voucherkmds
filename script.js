document.addEventListener("DOMContentLoaded", () => {
  const nameInput = document.getElementById("userName");
  const phoneInput = document.getElementById("userPhone");
  const codeInput = document.getElementById("voucherCode");
  const btn = document.getElementById("checkBtn");
  
  
  
  btn.addEventListener("click", submitVoucher);
  
 
  codeInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") submitVoucher();
  });

  async function submitVoucher() {
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const code = codeInput.value.trim().toUpperCase();

    if (!name || !phone || !code) {
      alert("Mohon isi semua data (Nama, No HP, dan Kode)!");
      return;
    }

    btn.disabled = true;
    btn.textContent = "MEMERIKSA...";

    try {

        const hash = await sha256(code);


        if (typeof VOUCHER_DB === 'undefined') {
            alert("Error: Database voucher tidak termuat.");
            btn.disabled = false;
            btn.textContent = "KLAIM VOUCHER";
            return;
        }

        const validVoucher = VOUCHER_DB.find(v => v.h === hash);

        if (validVoucher) {

            const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwXguaq9HM2DHXjb5SG5ceFAzR5vVZPHrMdpk199RR7e8XAYOt9c9MTUBgoB0brL_U/exec';
            

            try {
                const checkResponse = await fetch(`${SCRIPT_URL}?type=check`);
                const usedCodes = await checkResponse.json();
                
                if (usedCodes && usedCodes.includes(code)) {
                    showModal("Sudah Terpakai", "❌ Kode voucher ini SUDAH PERNAH digunakan", "⚠️");
                    btn.disabled = false;
                    btn.textContent = "KLAIM VOUCHER";
                    return;
                }
            } catch (e) {
                console.warn("Gagal cek duplikat (mungkin baru pertama kali):", e);
            }


            const params = new URLSearchParams();
            params.append('nama', name);
            params.append('phone', phone);
            params.append('kode', code);
            params.append('hadiah', validVoucher.p);
            // Kirim Kode Referensi juga ke Sheet biar Admin bisa cek
            params.append('refId', validVoucher.h.substring(0, 12).toUpperCase());

            await fetch(SCRIPT_URL, {
                method: 'POST',
                body: params,
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });


            sessionStorage.setItem('voucherResult', JSON.stringify({
                name: name,
                prize: validVoucher.p,
                refId: validVoucher.h.substring(0, 12).toUpperCase(),
                date: new Date().toLocaleString('id-ID')
            }));

            window.location.href = `success.html`;

        } else {

            showModal("Kode Salah", "❌ Kode voucher tidak valid.", "⚠️");
            btn.disabled = false;
            btn.textContent = "KLAIM VOUCHER";
        }

    } catch (err) {
      console.error("Error:", err);
      showModal("Gagal Koneksi", "Gagal koneksi ke server database. Coba lagi.", "📡");
      btn.disabled = false;
      btn.textContent = "KLAIM VOUCHER";
    }
  }


  const modal = document.getElementById("customModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalMessage = document.getElementById("modalMessage");
  const modalIcon = document.getElementById("modalIcon");
  const modalBtn = document.getElementById("modalBtn");

  modalBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  function showModal(title, msg, icon = "⚠️") {
    modalTitle.textContent = title;
    modalMessage.textContent = msg;
    modalIcon.textContent = icon;
    modal.classList.remove("hidden");
  }


  const SALT = "VOUCHER2026_MANTAP";

  async function sha256(message) {

    const msgWithSalt = message + SALT;
    
    const msgBuffer = new TextEncoder().encode(msgWithSalt);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }
});
