// Mobile menu: show or hide the navigation when the button is clicked
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('nav');

menuToggle.addEventListener('click', function () {
  nav.classList.toggle('open');   // adds 'open' if missing, removes it if present
  const isOpen = nav.classList.contains('open');
  menuToggle.setAttribute('aria-expanded', isOpen);   // tells screen readers the menu state
});
// ===== 2. LOAD DATA =====
async function loadDestinations() {
  const response = await fetch('data/destinations.json');

  if (!response.ok) {
    throw new Error('Could not load destinations (status ' + response.status + ')');
  }

  const destinations = await response.json();
  return destinations;
}
// ===== 3. HELPER FUNCTIONS =====

// Format the entry fee for display.
function formatFee(fee) {
  if (fee === 0) {
    return 'Free';
  } else {
    return 'USD ' + fee;
  }
}

// Group destinations into price bands.
function getPriceLabel(fee) {
  if (fee === 0) {
    return 'Free';
  } else if (fee <= 15) {
    return 'Budget';
  } else if (fee <= 30) {
    return 'Mid-range';
  } else {
    return 'Premium';
  }
}

// Return a CSS class based on the destination category.
function getCategoryClass(category) {
  switch (category) {
    case 'Heritage':
      return 'badge-heritage';
    case 'Beach':
      return 'badge-beach';
    case 'Nature':
      return 'badge-nature';
    case 'Wildlife':
      return 'badge-wildlife';
    default:
      return 'badge-other';
  }
}

// Build one destination card from its data.
function createCard(place) {
  const card = document.createElement('article');
  card.className = 'card';

  card.innerHTML = `
    <img src="${place.image}" alt="${place.name}">
    <h3>${place.name}</h3>
    <p class="meta">
      <span class="badge ${getCategoryClass(place.category)}">${place.category}</span>
      ${place.district} District
    </p>
    <p>${place.description}</p>
    <p class="fee">Entry: ${formatFee(place.entryFeeUSD)} · ${getPriceLabel(place.entryFeeUSD)}</p>
    <a href="details.html?id=${place.id}">View details</a>
  `;

  return card;
}
// ===== 4. HOME PAGE =====
async function initHomePage() {
  const featuredSection = document.querySelector('#featured');
  if (!featuredSection) return; // This page is not the Home page.

  try {
    const destinations = await loadDestinations();
    const featured = destinations.filter(place => place.featured === true);

    for (const place of featured) {
      featuredSection.appendChild(createCard(place));
    }
  } catch (error) {
    featuredSection.insertAdjacentHTML(
      'beforeend',
      '<p class="error">Featured destinations could not be loaded.</p>'
    );
    console.error(error);
  }
}
// ===== 5. DESTINATIONS PAGE =====
async function initDestinationsPage() {
  const list = document.querySelector('#destination-list');
  if (!list) return; // This page is not the Destinations page.

  const searchInput = document.querySelector('#search');
  const categorySelect = document.querySelector('#category');
  const sortSelect = document.querySelector('#sort');
  const resultCount = document.querySelector('#result-count');

  let allDestinations = [];

  try {
    allDestinations = await loadDestinations();
  } catch (error) {
    list.innerHTML = '<p class="error">Sorry, destinations could not be loaded. Please try again later.</p>';
    console.error(error);
    return;
  }

  function updateList() {
    const searchText = searchInput.value.trim().toLowerCase();
    const category = categorySelect.value;
    const sortBy = sortSelect.value;

    // Keep destinations matching the search text and selected category.
    const results = allDestinations.filter(function (place) {
      const matchesSearch =
  place.name.toLowerCase().includes(searchText) ||
  place.district.toLowerCase().includes(searchText) ||
  place.description.toLowerCase().includes(searchText);
      const matchesCategory =
        category === 'all' || place.category === category;

      return matchesSearch && matchesCategory;
    });

    // Sort the filtered results.
    if (sortBy === 'name') {
      results.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'fee-low') {
      results.sort((a, b) => a.entryFeeUSD - b.entryFeeUSD);
    } else if (sortBy === 'fee-high') {
      results.sort((a, b) => b.entryFeeUSD - a.entryFeeUSD);
    }

    // Clear the old cards and display the updated results.
    list.innerHTML = '';

    if (results.length === 0) {
      list.innerHTML = '<p class="no-results">No destinations match your search.</p>';
    } else {
      for (const place of results) {
        list.appendChild(createCard(place));
      }
    }

    resultCount.textContent =
      `Showing ${results.length} of ${allDestinations.length} destinations`;
  }

  // Update the list when the user types or changes a menu.
  searchInput.addEventListener('input', updateList);
  categorySelect.addEventListener('change', updateList);
  sortSelect.addEventListener('change', updateList);

  updateList(); // Display the full list when the page first loads.
}
// ===== 7. DESTINATION DETAILS PAGE =====
async function initDetailsPage() {
  const container = document.querySelector('#destination');
  if (!container) return; // This page is not the Details page.

  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));

  try {
    const destinations = await loadDestinations();
    const place = destinations.find(destination => destination.id === id);

    if (!place) {
      container.innerHTML = `
        <h1>Destination not found</h1>
        <p><a href="destinations.html">Back to all destinations</a></p>
      `;
      return;
    }

    document.title = `${place.name} | Lanka Explorer`;
    setupTripButton(place);
    initDestinationApis(place);

    container.innerHTML = `
      <img src="${place.image}" alt="${place.name}">
      <h1>${place.name}</h1>
      <p class="meta">
        <span class="badge ${getCategoryClass(place.category)}">${place.category}</span>
        ${place.district} District
      </p>
      <p>${place.description}</p>
      <h2>Quick Facts</h2>
      <ul>
        <li><strong>Best time to visit:</strong> ${place.bestTime}</li>
        <li><strong>Entry fee:</strong> ${formatFee(place.entryFeeUSD)} (${getPriceLabel(place.entryFeeUSD)})</li>
        <li><strong>Coordinates:</strong> ${place.lat}, ${place.lng}</li>
      </ul>
    `;
  } catch (error) {
    container.innerHTML =
      '<p class="error">Sorry, this destination could not be loaded.</p>';
    console.error(error);
  }
}
// ===== 7. ENQUIRY FORM =====
function initEnquiryForm() {
  const form = document.querySelector('#enquiry-form');
  if (!form) return;

  const message = document.querySelector('#form-message');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const name = document.querySelector('#name').value.trim();
    const email = document.querySelector('#email').value.trim();
    const date = document.querySelector('#date').value;
    const people = Number(document.querySelector('#people').value);
    const interests = form.querySelectorAll('input[name="interest"]:checked');
    const userMessage = document.querySelector('#message').value.trim();

    const errors = [];

    if (name.length < 3) {
      errors.push('Please enter your full name (at least 3 characters).');
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      errors.push('Please enter a valid email address.');
    }

    if (date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (new Date(date) < today) {
        errors.push('The travel date cannot be in the past.');
      }
    }

    if (people < 1 || people > 20) {
      errors.push('Number of travellers must be between 1 and 20.');
    }

    if (interests.length === 0) {
      errors.push('Please choose at least one interest.');
    }

    // Extension: limit the message to 500 characters.
    if (userMessage.length > 500) {
      errors.push('Your message must be no longer than 500 characters.');
    }

    if (errors.length > 0) {
      message.className = 'form-error';
      message.innerHTML =
        '<ul>' + errors.map(error => `<li>${error}</li>`).join('') + '</ul>';
    } else {
      message.className = 'form-success';
      message.textContent =
        `Thank you, ${name}! We will contact you at ${email} within 24 hours.`;
      form.reset();
    }
  });
}
// ===== 8. START THE APP =====
initHomePage();
initDestinationsPage();
initDetailsPage();
initEnquiryForm();

// ===== WEEK 04: API INTEGRATIONS =====
// Coordinates are used by Open-Meteo and the embedded OpenStreetMap view.
const destinationCoordinates = {
  sigiriya: [7.957, 80.760], galle: [6.0535, 80.221],
  anuradhapura: [8.3114, 80.4037], mirissa: [5.9485, 80.4716],
  unawatuna: [6.0108, 80.249], arugam: [6.8404, 81.8368],
  ella: [6.8667, 81.0466], nuwara: [6.9497, 80.7891],
  yala: [6.3725, 81.5185], minneriya: [8.038, 80.901]
};
function coordsFor(place) {
  const key = (place.id || place.name || '').toLowerCase().replace(/[^a-z]/g, '');
  return destinationCoordinates[key] || destinationCoordinates[key.slice(0,6)] || [7.8731,80.7718];
}
async function initDestinationApis(place) {
  const weather = document.querySelector('#weather');
  const map = document.querySelector('#map');
  const [lat, lon] = coordsFor(place);
  if (weather) {
    weather.textContent = 'Loading current weather…';
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`);
      if (!r.ok) throw new Error('Weather service unavailable');
      const d = await r.json(), c = d.current;
      weather.textContent = `Temperature: ${c.temperature_2m} °C · Humidity: ${c.relative_humidity_2m}% · Wind: ${c.wind_speed_10m} km/h`;
    } catch (e) { weather.textContent = 'Weather is temporarily unavailable. Please try again later.'; }
  }
  if (map) {
    map.innerHTML = `<iframe title="Map showing ${place.name}" width="100%" height="320" loading="lazy" style="border:0" src="https://www.openstreetmap.org/export/embed.html?bbox=${lon-.03}%2C${lat-.02}%2C${lon+.03}%2C${lat+.02}&layer=mapnik&marker=${lat}%2C${lon}"></iframe>`;
  }
}
async function getUsdLkrRate() {
  const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=LKR');
  if (!response.ok) throw new Error('Currency service unavailable');
  const data = await response.json();
  return data.rates.LKR;
}

// ===== WEEK 05: SAVED TRIP =====
const TRIP_KEY = 'lankaExplorerTrip';
const TRAVELLERS_KEY = 'lankaExplorerTravellers';
function getTrip() {
  try { const value = JSON.parse(localStorage.getItem(TRIP_KEY) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function saveTrip(ids) { localStorage.setItem(TRIP_KEY, JSON.stringify([...new Set(ids)])); }
function isInTrip(id) { return getTrip().includes(String(id)); }
function addToTrip(id) { saveTrip([...getTrip(), String(id)]); updateTripCount(); }
function removeFromTrip(id) { saveTrip(getTrip().filter(item => item !== String(id))); updateTripCount(); }
function updateTripCount() {
  document.querySelectorAll('.trip-count').forEach(el => el.textContent = getTrip().length);
}
function setupTripButton(place) {
  const button = document.querySelector('#add-to-trip');
  if (!button) return;
  if (!place) { button.hidden = true; return; }
  button.hidden = false;
  const sync = () => {
    const added = isInTrip(place.id);
    button.textContent = added ? 'Remove from My Trip' : 'Add to My Trip';
    button.classList.toggle('added', added);
    button.setAttribute('aria-pressed', String(added));
  };
  button.addEventListener('click', () => {
    isInTrip(place.id) ? removeFromTrip(place.id) : addToTrip(place.id);
    sync();
  });
  sync();
}
async function initTripPage() {
  const tbody = document.querySelector('#trip-table tbody');
  if (!tbody) return;
  const travellerInput = document.querySelector('#travellers');
  const stored = Number(localStorage.getItem(TRAVELLERS_KEY));
  if (stored > 0) travellerInput.value = stored;
  let destinations = [];
  try { destinations = await loadDestinations(); }
  catch { tbody.innerHTML = '<tr><td colspan="5">Destinations could not be loaded.</td></tr>'; return; }
  const render = async () => {
    const chosen = destinations.filter(p => isInTrip(p.id));
    tbody.innerHTML = '';
    chosen.forEach(place => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${place.name}</td><td>${place.category}</td><td>${Number(place.entryFeeUSD).toFixed(2)}</td><td class="fee-lkr">—</td><td><button type="button" data-remove="${place.id}">Remove</button></td>`;
      tbody.appendChild(row);
    });
    document.querySelector('#total-usd').textContent = chosen.reduce((sum,p)=>sum+Number(p.entryFeeUSD||0),0).toFixed(2);
    try {
      const rate = await getUsdLkrRate();
      let total = 0;
      [...tbody.querySelectorAll('tr')].forEach((row,i) => {
        const amount = Number(chosen[i].entryFeeUSD||0)*rate; total += amount;
        row.querySelector('.fee-lkr').textContent = amount.toLocaleString('en-LK',{maximumFractionDigits:2});
      });
      document.querySelector('#total-lkr').textContent = total.toLocaleString('en-LK',{maximumFractionDigits:2});
    } catch {
      tbody.querySelectorAll('.fee-lkr').forEach(el=>el.textContent='Unavailable');
      document.querySelector('#total-lkr').textContent='Unavailable';
    }
    updateTripCount();
  };
  tbody.addEventListener('click', e => {
    const button = e.target.closest('[data-remove]');
    if (button) { removeFromTrip(button.dataset.remove); render(); }
  });
  travellerInput.addEventListener('change', () => {
    travellerInput.value = Math.max(1, Number(travellerInput.value)||1);
    localStorage.setItem(TRAVELLERS_KEY, travellerInput.value);
  });
  const clear = document.querySelector('#clear-trip');
  if (clear) clear.addEventListener('click', () => { saveTrip([]); render(); });
  await render();
}
function initTheme() {
  const key = 'lankaExplorerTheme';
  const saved = localStorage.getItem(key);
  if (saved === 'dark') document.body.classList.add('dark-mode');
  const button = document.querySelector('#theme-toggle');
  if (button) {
    const sync = () => { button.textContent = document.body.classList.contains('dark-mode') ? 'Light mode' : 'Dark mode'; };
    sync();
    button.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem(key, document.body.classList.contains('dark-mode') ? 'dark' : 'light');
      sync();
    });
  }
}
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateTripCount();
  initTripPage();
});
