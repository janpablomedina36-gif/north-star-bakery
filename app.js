'use strict';

// Catalog and favoriteIds are separate arrays with distinct responsibilities.
const catalog = [
  { id: 'signature-loaf', name: 'Signature Loaf', category: 'breads', price: '$5–$9 per loaf', description: 'A crusty loaf for sharing at the family table.' },
  { id: 'pastries-cookies', name: 'Pastries and cookies', category: 'pastries', price: '$2–$5 per item', description: 'Buttery pastries and cookies for a quick treat.' },
  { id: 'celebration-cakes', name: 'Celebration cakes', category: 'cakes', price: '$25–$60 by size', description: 'Cakes for birthdays and family gatherings.' }
];
const storageKey = 'north-star-bakery-preferences-v1';
const categories = ['all', 'breads', 'pastries', 'cakes'];
let favoriteIds = [];
let selectedCategory = 'all';
let storageAvailable = true;

function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!saved || typeof saved !== 'object') return;
    selectedCategory = categories.includes(saved.category) ? saved.category : 'all';
    if (Array.isArray(saved.favorites)) {
      favoriteIds = [...new Set(saved.favorites.filter(id => catalog.some(item => item.id === id)))];
    }
  } catch (error) {
    // Malformed or unavailable storage must not disable the feature.
    storageAvailable = false;
  }
}

function savePreferences() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ category: selectedCategory, favorites: favoriteIds }));
    storageAvailable = true;
  } catch (error) {
    storageAvailable = false;
  }
}

function favoriteNames() {
  return catalog.filter(item => favoriteIds.includes(item.id)).map(item => item.name);
}

function toggleFavorite(id) {
  favoriteIds = favoriteIds.includes(id)
    ? favoriteIds.filter(savedId => savedId !== id)
    : [...favoriteIds, id];
  savePreferences();
  renderProducts();
  // Retain keyboard focus when the list is rebuilt, or return it to its filter.
  const button = document.querySelector(`[data-product-id="${id}"]`);
  (button || document.getElementById('favorites-only')).focus();
}

function renderProducts() {
  const list = document.getElementById('product-list');
  const savedOnly = document.getElementById('favorites-only').checked;
  const visibleProducts = catalog.filter(item =>
    (selectedCategory === 'all' || item.category === selectedCategory) &&
    (!savedOnly || favoriteIds.includes(item.id))
  );
  list.replaceChildren();
  visibleProducts.forEach(item => {
    const card = document.createElement('article');
    card.className = 'product-card';
    const title = document.createElement('h3');
    title.textContent = item.name;
    const description = document.createElement('p');
    description.textContent = item.description;
    const price = document.createElement('p');
    price.textContent = item.price;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.productId = item.id;
    const saved = favoriteIds.includes(item.id);
    button.setAttribute('aria-pressed', String(saved));
    button.textContent = `${saved ? 'Remove' : 'Save'} ${item.name} ${saved ? 'from' : 'to'} favorites`;
    button.addEventListener('click', () => toggleFavorite(item.id));
    card.append(title, description, price, button);
    list.append(card);
  });
  const names = favoriteNames();
  document.getElementById('planner-status').textContent = `${visibleProducts.length} ${visibleProducts.length === 1 ? 'treat' : 'treats'} shown · ${names.length} saved ${names.length === 1 ? 'favorite' : 'favorites'}.${visibleProducts.length ? '' : ' No matches. Choose another category or turn off the favorites filter.'}`;
  document.getElementById('saved-summary').textContent = names.length ? `Your saved favorites: ${names.join(', ')}.` : 'No favorites saved yet.';
  document.getElementById('storage-note').textContent = storageAvailable ? 'Your category and favorites are remembered when you return or refresh this browser.' : 'Browser storage is unavailable. Your selections work for this visit but may not be remembered.';
  document.getElementById('clear-favorites').disabled = !names.length;
}

function setupProducts() {
  const controls = document.getElementById('planner-controls');
  if (!controls) return;
  controls.hidden = false;
  const filter = document.getElementById('category-filter');
  filter.value = selectedCategory;
  filter.addEventListener('change', () => {
    selectedCategory = filter.value;
    savePreferences();
    renderProducts();
  });
  document.getElementById('favorites-only').addEventListener('change', renderProducts);
  document.getElementById('clear-favorites').addEventListener('click', () => {
    favoriteIds = [];
    savePreferences();
    renderProducts();
  });
  renderProducts();
}

// All checks return a specific message for their own field.
function validateField(field, form) {
  const value = field.value.trim();
  if (field.required && !value) return {
    name: 'Enter your name.', email: 'Enter your email address.',
    'request-type': 'Choose a request type.', details: 'Enter item details or your question.'
  }[field.id] || 'Complete this field.';
  if (field.id === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address, such as neighbor@example.com.';
  if (field.id === 'details' && value.length < 10) return 'Use at least 10 characters for item details or your question.';
  const limit = field.maxLength;
  if (limit > 0 && value.length > limit) return `Use no more than ${limit} characters.`;
  if (field.id === 'pickup' && form.elements['request-type'].value === 'preorder') {
    if (!value) return 'Choose a pickup date for your preorder.';
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return 'Choose a valid pickup date.';
    if (date.getDay() === 0) return 'Choose Monday through Saturday; we close on Sunday.';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return 'Choose today or a future pickup date.';
  }
  return '';
}

function showFieldError(field, message) {
  document.getElementById(`${field.id}-error`).textContent = message;
  field.setAttribute('aria-invalid', String(Boolean(message)));
}

function setupForm() {
  const form = document.getElementById('request-form');
  if (!form) return;
  // Native HTML validation remains available if JavaScript cannot load.
  form.noValidate = true;
  const fields = ['name', 'email', 'request-type', 'pickup', 'details', 'allergies'].map(id => document.getElementById(id));
  let attempted = false;
  fields.forEach(field => {
    const error = document.createElement('span');
    error.id = `${field.id}-error`;
    error.className = 'field-error';
    field.parentElement.append(error);
    field.setAttribute('aria-describedby', `${field.getAttribute('aria-describedby') || ''} ${error.id}`.trim());
    field.addEventListener('input', () => {
      document.getElementById('form-status').textContent = '';
      if (attempted) showFieldError(field, validateField(field, form));
    });
    field.addEventListener('change', () => {
      if (attempted) {
        showFieldError(field, validateField(field, form));
        if (field.id === 'request-type') showFieldError(form.elements.pickup, validateField(form.elements.pickup, form));
      }
    });
  });
  const names = favoriteNames();
  if (names.length) {
    const summary = document.getElementById('contact-favorites');
    summary.hidden = false;
    summary.textContent = `Saved from Products: ${names.join(', ')}. You can mention these items in your request details.`;
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    attempted = true;
    const invalidFields = fields.filter(field => {
      const message = validateField(field, form);
      showFieldError(field, message);
      return Boolean(message);
    });
    const status = document.getElementById('form-status');
    if (invalidFields.length) {
      status.textContent = `Please correct ${invalidFields.length} ${invalidFields.length === 1 ? 'field' : 'fields'} below. Your entries have been kept.`;
      invalidFields[0].focus();
      return;
    }
    status.textContent = 'Your practice request passed all checks. Nothing was sent or saved. The bakery must confirm any real preorder.';
  });
}

loadPreferences();
setupProducts();
setupForm();
