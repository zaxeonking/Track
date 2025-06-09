(() => {
  const form = document.getElementById('track-form');
  const destinationInput = document.getElementById('destination');
  const destinationError = document.getElementById('destination-error');
  const createBtn = document.getElementById('create-btn');
  const linkResult = document.getElementById('link-result');
  const trackingLinkOutput = document.getElementById('tracking-link-output');
  const copyBtn = document.getElementById('copy-btn');
  const visitsContainer = document.getElementById('visits-container');
  const noDataMsg = document.getElementById('no-data-msg');

  const baseUrl = window.location.origin + window.location.pathname;

  // Validasi URL tujuan dan update tombol aktif
  function validateDestination() {
    const val = destinationInput.value.trim();
    if (!val) {
      destinationError.textContent = 'URL tujuan harus diisi.';
      createBtn.disabled = true;
      createBtn.setAttribute('aria-disabled', 'true');
      return false;
    }
    if (!/^https?:\/\/.+/.test(val)) {
      destinationError.textContent = 'URL harus diawali http:// atau https://';
      createBtn.disabled = true;
      createBtn.setAttribute('aria-disabled', 'true');
      return false;
    }
    destinationError.textContent = '';
    createBtn.disabled = false;
    createBtn.removeAttribute('aria-disabled');
    return true;
  }

  // Membuat tautan pelacakan dengan encoded URL pada parameter 'url'
  function createTrackingLink(destination) {
    const url = new URL(baseUrl);
    url.searchParams.set('url', encodeURIComponent(decodeURIComponent(destination))); 
    return url.toString();
  }

  // Simpan data kunjungan di localStorage
  function saveVisit(destinationKey, data) {
    const key = `trackly_${destinationKey}`;
    const stored = localStorage.getItem(key);
    const visits = stored ? JSON.parse(stored) : [];
    data.timestamp = new Date().toISOString();
    visits.push(data);
    localStorage.setItem(key, JSON.stringify(visits));
  }

  // Tampilkan data kunjungan di halaman
  function displayVisits() {
    visitsContainer.innerHTML = '';
    const keys = Object.keys(localStorage).filter(k => k.startsWith('trackly_')).sort();
    if (!keys.length) {
      noDataMsg.style.display = 'block';
      return;
    }
    noDataMsg.style.display = 'none';

    keys.forEach(key => {
      const destinationKey = key.slice(7); // hapus prefix 'trackly_'
      const visits = JSON.parse(localStorage.getItem(key));
      visits.forEach(visit => {
        const div = document.createElement('div');
        div.className = 'visit-entry';
        div.tabIndex = 0;
        div.innerHTML = `
          <div><strong>URL Tujuan:</strong> <a href="${decodeURIComponent(destinationKey)}" class="text-blue-600 underline" target="_blank" rel="noopener noreferrer">${decodeURIComponent(destinationKey)}</a></div>
          <div><strong>IP:</strong> ${visit.ip || 'Tidak diketahui'}</div>
          <div><strong>Lokasi:</strong> ${visit.city || 'Tidak diketahui'}, ${visit.region || ''} ${visit.country || ''}</div>
          <div><strong>Waktu:</strong> ${new Date(visit.timestamp).toLocaleString()}</div>
        `;
        visitsContainer.appendChild(div);
      });
    });
  }

  // Event listener input URL tujuan untuk validasi realtime dan toggle tombol
  destinationInput.addEventListener('input', validateDestination);

  // Submit form: buat tautan pelacakan dan tampilkan hasil
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateDestination()) return;

    const dest = destinationInput.value.trim();
    const link = createTrackingLink(dest);

    trackingLinkOutput.textContent = link;
    linkResult.hidden = false;
    createBtn.disabled = true;
    createBtn.setAttribute('aria-disabled', 'true');
    destinationInput.value = '';
  });

  // Copy ke clipboard saat tombol salin ditekan
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(trackingLinkOutput.textContent)
      .then(() => {
        copyBtn.textContent = 'Tersalin!';
        setTimeout(() => {
          copyBtn.textContent = 'Salin';
        }, 1500);
      })
      .catch(() => {
        copyBtn.textContent = 'Gagal salin';
        setTimeout(() => {
          copyBtn.textContent = 'Salin';
        }, 1500);
      });
  });

  // Tangani akses halaman dengan param ?url= - lakukan decode dua kali untuk jaga2 double encode
  async function handleTrackingRedirect() {
    const params = new URLSearchParams(window.location.search);
    const encodedUrlRaw = params.get('url');
    if (!encodedUrlRaw) return false;

    let destination;
    try {
      destination = decodeURIComponent(decodeURIComponent(encodedUrlRaw));
    } catch {
      try {
        destination = decodeURIComponent(encodedUrlRaw);
      } catch {
        destination = encodedUrlRaw;
      }
    }

    try {
      const resp = await fetch('https://ipapi.co/json/');
      if (!resp.ok) throw new Error('Gagal mengambil data IP');
      const ipData = await resp.json();

      saveVisit(encodedUrlRaw, {
        ip: ipData.ip,
        city: ipData.city,
        region: ipData.region,
        country: ipData.country_name
      });
    } catch {
      // walau gagal simpan datanya, tetap redirect
    }

    setTimeout(() => {
      window.location.href = destination;
    }, 800);

    document.body.innerHTML = `
      <main aria-live="polite" class="max-w-2xl mx-auto p-6 text-center mt-20 text-gray-700 font-semibold">
        Mengalihkan Anda ke tujuan...
      </main>
    `;
    return true;
  }

  async function init() {
    const redirecting = await handleTrackingRedirect();
    if (!redirecting) {
      displayVisits();
      validateDestination();
    }
  }

  window.addEventListener('load', init);
})();