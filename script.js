// ============================================
// ДАННЫЕ ИЗ ОРИГИНАЛЬНОГО БОТА
// ============================================

const PRODUCTS = [
  "Marlboro compact красный",
  "Marlboro compact чёрный",
  "Multi Tabak",
  "NZ",
  "Корона желтая 21",
  "Корона серая",
  "Корона черный Стиль",
  "Platinum"
];

const ORDER_PRODUCTS = {
  "401": "WINSTON XSTYLE DUAL . МТ. 202.00",
  "402": "PHILIP MORRIS RED МТ. 169.00",
  "403": "CHESTERFIELD REMIX PREMIUM МТ. 179.00",
  "404": "РУССКИЙ СТИЛЬ ДОНСКОЙ СВЕТЛЫЙ, МТ. 170.00",
  "405": "CAMEL COMPACT SPECIAL. МТ. 180,00",
  "406": "РУССКИЙ СТИЛЬ ДОНСКОЙ ТЁМНЫЙ '.МТ. 170.00",
  "407": "CHESTERFIELD AROMA BROWN MT, 179,00",
  "408": "РУССКИЙ СТИЛЬ ЧЁРНЫЙ, MT, 180,00",
  "409": "LD Autograph Club Compact CAFE MT, 190,00",
  "410": "LD Compact CAFÉ MT, 190,00",
  "411": "Parliament Aqua Blue МТ 50х10 МТ. 289,00",
  "412": "Play Hits 179,00",
  "413": "Бизнес класс Голден лиф 150,00",
  "414": "LAMER",
  "415": "MULTI",
  "416": "Lucky Strike Компакт Блю. МТ. 159,00",
  "417": "CAMEL COMPACT RUBY. МТ. 180,00",
  "418": "PHILIP Compact Premium МТ. 169.00",
  "419": "Captain Jack Special Blend Ruby DMS МТ 50х10. МТ. 170,00",
  "420": "Next Violet МТ 50х10 179,00",
  "421": "Camel Compact Aroma Red 50х10 190,00",
  "422": "Chesterfield Selection Compact 50х10 189,00"
};

// ============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================

let inventoryData = {};
let orderData = {};
let settings = {
  spreadsheetId: '',
  scriptUrl: '',
  sheetInventory: true,
  sheetOrder: true
};

let appSettings = {
  theme: 'light',
  autoSave: true,
  soundNotifications: true
};

let operationHistory = [];

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  initializeInventoryForm();
  initializeOrderForm();
  loadSettings();
  loadAppSettings();
  loadSavedData();
  loadHistory();
  updateAllSummaries();
  updateInfoCounts();
});

// ============================================
// УПРАВЛЕНИЕ ВКЛАДКАМИ
// ============================================

function initializeTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
          const tabId = btn.dataset.tab;
          
          // Убираем активный класс со всех кнопок и контента
          tabBtns.forEach(b => b.classList.remove('active'));
          tabContents.forEach(c => c.classList.remove('active'));
          
          // Добавляем активный класс текущей вкладке
          btn.classList.add('active');
          document.getElementById(tabId).classList.add('active');
          
          // Обновляем сводки при переключении
          updateAllSummaries();
          
          // Сохраняем активную вкладку
          localStorage.setItem('activeTab', tabId);
      });
  });
  
  // Восстанавливаем последнюю активную вкладку
  const lastTab = localStorage.getItem('activeTab');
  if (lastTab) {
      const btn = document.querySelector(`.tab-btn[data-tab="${lastTab}"]`);
      if (btn) btn.click();
  }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ ФОРМЫ ИНВЕНТАРИЗАЦИИ
// ============================================

function initializeInventoryForm() {
  const container = document.getElementById('inventory-products');
  inventoryData = {};
  
  PRODUCTS.forEach((product, index) => {
      inventoryData[product] = 0;
      
      const item = document.createElement('div');
      item.className = 'product-item';
      item.innerHTML = `
          <label>${index + 1}. ${product}</label>
          <input type="number" 
                 data-product="${product}" 
                 min="0" 
                 step="10" 
                 value="0"
                 oninput="validateInput(this, 'inventory')"
                 onchange="validateInput(this, 'inventory')">
      `;
      container.appendChild(item);
  });
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ ФОРМЫ ЗАКАЗА АЗС
// ============================================

function initializeOrderForm() {
  const container = document.getElementById('order-products');
  const fullList = document.getElementById('order-products-full');
  orderData = {};
  
  // Создаем полный список номенклатуры
  let listHtml = `
      <h4>📋 Полная номенклатура для заказа АЗС</h4>
      <ul>
  `;
  
  Object.entries(ORDER_PRODUCTS).forEach(([art, name]) => {
      orderData[art] = 0;
      listHtml += `<li><span class="art">${art}</span>: ${name}</li>`;
      
      const item = document.createElement('div');
      item.className = 'product-item';
      item.innerHTML = `
          <label>${art} - ${name}</label>
          <input type="number" 
                 data-art="${art}" 
                 min="0" 
                 step="10" 
                 value="0"
                 oninput="validateInput(this, 'order')"
                 onchange="validateInput(this, 'order')">
      `;
      container.appendChild(item);
  });
  
  listHtml += '</ul>';
  fullList.innerHTML = listHtml;
}

// ============================================
// ВАЛИДАЦИЯ ВВОДА (КРАТНО 10)
// ============================================

function validateInput(input, type) {
  let value = parseInt(input.value) || 0;
  
  if (value < 0) {
      value = 0;
  }
  
  // Округляем до ближайшего числа, кратного 10
  value = Math.round(value / 10) * 10;
  
  input.value = value;
  
  // Сохраняем данные
  if (type === 'inventory' && input.dataset.product) {
      inventoryData[input.dataset.product] = value;
      updateInventorySummary();
  } else if (type === 'order' && input.dataset.art) {
      orderData[input.dataset.art] = value;
      updateOrderSummary();
  }
  
  // Автосохранение если включено
  if (appSettings.autoSave) {
      debounceAutoSave(type);
  }
}

// Debounce для автосохранения
let autoSaveTimeout;
function debounceAutoSave(type) {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
      if (type === 'inventory') {
          saveInventory(true);
      } else {
          saveOrder(true);
      }
  }, 2000);
}

// ============================================
// ОБНОВЛЕНИЕ СВОДОК
// ============================================

function updateAllSummaries() {
  updateInventorySummary();
  updateOrderSummary();
  updateReportStats();
  updateHistoryStats();
}

function updateInventorySummary() {
  const summary = document.getElementById('inventory-summary-content');
  const total = Object.values(inventoryData).reduce((a, b) => a + b, 0);
  const available = Object.values(inventoryData).filter(q => q > 0).length;
  const zeroStock = Object.entries(inventoryData).filter(([_, q]) => q === 0);
  
  let html = `
      <div class="summary-item">
          <span>Всего товаров:</span>
          <span>${PRODUCTS.length} позиций</span>
      </div>
      <div class="summary-item">
          <span>Общее количество:</span>
          <span>${total} шт.</span>
      </div>
      <div class="summary-item">
          <span>В наличии:</span>
          <span>${available} из ${PRODUCTS.length}</span>
      </div>
  `;
  
  if (zeroStock.length > 0) {
      html += `
          <div class="summary-item warning">
              <span>⚠ Требуют пополнения:</span>
              <span>${zeroStock.length} позиций</span>
          </div>
      `;
  }
  
  summary.innerHTML = html;
  
  // Обновляем бейдж
  document.getElementById('inventory-badge').textContent = `${available} из ${PRODUCTS.length}`;
}

function updateOrderSummary() {
  const summary = document.getElementById('order-summary-content');
  const total = Object.values(orderData).reduce((a, b) => a + b, 0);
  const ordered = Object.values(orderData).filter(q => q > 0).length;
  
  let html = `
      <div class="summary-item">
          <span>Всего номенклатуры:</span>
          <span>${Object.keys(ORDER_PRODUCTS).length} позиций</span>
      </div>
      <div class="summary-item">
          <span>Заказано позиций:</span>
          <span>${ordered}</span>
      </div>
      <div class="summary-item">
          <span>Общее количество:</span>
          <span>${total} шт.</span>
      </div>
  `;
  
  summary.innerHTML = html;
  
  // Обновляем бейдж
  document.getElementById('order-badge').textContent = `${ordered} позиций`;
}

function updateReportStats() {
  const invTotal = Object.values(inventoryData).reduce((a, b) => a + b, 0);
  const invAvailable = Object.values(inventoryData).filter(q => q > 0).length;
  
  const orderTotal = Object.values(orderData).reduce((a, b) => a + b, 0);
  const orderCount = Object.values(orderData).filter(q => q > 0).length;
  
  document.getElementById('inventory-stats').innerHTML = `
      <p>
          <strong>Товаров:</strong> ${PRODUCTS.length}<br>
          <strong>В наличии:</strong> ${invAvailable}<br>
          <strong>Всего:</strong> ${invTotal} шт.
      </p>
  `;
  
  document.getElementById('order-stats').innerHTML = `
      <p>
          <strong>Позиций в заказе:</strong> ${orderCount}<br>
          <strong>Всего:</strong> ${orderTotal} шт.<br>
          <strong>Номенклатура:</strong> ${Object.keys(ORDER_PRODUCTS).length}
      </p>
  `;
}

// ============================================
// СОХРАНЕНИЕ ДАННЫХ
// ============================================

function saveInventory(silent = false) {
  localStorage.setItem('inventoryData', JSON.stringify(inventoryData));
  localStorage.setItem('inventoryTimestamp', new Date().toISOString());
  
  updateLastSaveInfo('inventory');
  
  // Добавляем в историю
  addToHistory('inventory');
  
  if (!silent) {
      if (appSettings.soundNotifications) {
          playSound('success');
      }
      showModal('✅ Сохранено!', 'Данные инвентаризации успешно сохранены.', () => closeModal());
  }
}

function saveOrder(silent = false) {
  localStorage.setItem('orderData', JSON.stringify(orderData));
  localStorage.setItem('orderTimestamp', new Date().toISOString());
  
  updateLastSaveInfo('order');
  
  // Добавляем в историю
  addToHistory('order');
  
  if (!silent) {
      if (appSettings.soundNotifications) {
          playSound('success');
      }
      showModal('✅ Сохранено!', 'Заказ АЗС успешно сохранен.', () => closeModal());
  }
}

function loadSavedData() {
  const savedInventory = localStorage.getItem('inventoryData');
  const savedOrder = localStorage.getItem('orderData');
  
  if (savedInventory) {
      inventoryData = JSON.parse(savedInventory);
      document.querySelectorAll('#inventory-products input').forEach(input => {
          const product = input.dataset.product;
          if (inventoryData[product] !== undefined) {
              input.value = inventoryData[product];
          }
      });
  }
  
  if (savedOrder) {
      orderData = JSON.parse(savedOrder);
      document.querySelectorAll('#order-products input').forEach(input => {
          const art = input.dataset.art;
          if (orderData[art] !== undefined) {
              input.value = orderData[art];
          }
      });
  }
  
  updateLastSaveInfo();
}

// ============================================
// ОЧИСТКА ДАННЫХ
// ============================================

function clearInventory() {
  showModal(
      '⚠️ Очистка инвентаря',
      'Вы уверены, что хотите очистить все данные инвентаризации?',
      () => {
          inventoryData = {};
          PRODUCTS.forEach(p => inventoryData[p] = 0);
          document.querySelectorAll('#inventory-products input').forEach(input => {
              input.value = 0;
          });
          updateInventorySummary();
          closeModal();
          if (appSettings.soundNotifications) playSound('success');
      }
  );
}

function clearOrder() {
  showModal(
      '⚠️ Очистка заказа',
      'Вы уверены, что хотите очистить все данные заказа АЗС?',
      () => {
          orderData = {};
          Object.keys(ORDER_PRODUCTS).forEach(art => orderData[art] = 0);
          document.querySelectorAll('#order-products input').forEach(input => {
              input.value = 0;
          });
          updateOrderSummary();
          closeModal();
          if (appSettings.soundNotifications) playSound('success');
      }
  );
}

function clearAllData() {
  showModal(
      '⚠️ Сброс всех данных',
      'Это действие удалит ВСЕ сохраненные данные включая историю. Продолжить?',
      () => {
          localStorage.clear();
          location.reload();
      }
  );
}

// ============================================
// НАСТРОЙКИ
// ============================================

function saveSettings() {
  settings.spreadsheetId = document.getElementById('spreadsheet-id').value;
  settings.scriptUrl = document.getElementById('script-url').value;
  settings.sheetInventory = document.getElementById('sheet-inventory').checked;
  settings.sheetOrder = document.getElementById('sheet-order').checked;
  
  localStorage.setItem('appSettings', JSON.stringify(settings));
  
  if (appSettings.soundNotifications) playSound('success');
  showModal('✅ Настройки сохранены', 'Настройки Google Sheets успешно сохранены.', () => closeModal());
}

function loadSettings() {
  const saved = localStorage.getItem('appSettings');
  if (saved) {
      settings = JSON.parse(saved);
      document.getElementById('spreadsheet-id').value = settings.spreadsheetId || '';
      document.getElementById('script-url').value = settings.scriptUrl || '';
      document.getElementById('sheet-inventory').checked = settings.sheetInventory !== false;
      document.getElementById('sheet-order').checked = settings.sheetOrder !== false;
  }
}

function saveAppSettings() {
  appSettings.theme = document.querySelector('input[name="theme"]:checked').value;
  appSettings.autoSave = document.getElementById('auto-save').checked;
  appSettings.soundNotifications = document.getElementById('sound-notifications').checked;
  
  localStorage.setItem('appSettings_config', JSON.stringify(appSettings));
  
  if (appSettings.soundNotifications) playSound('success');
  showModal('✅ Настройки применены', 'Настройки приложения успешно сохранены.', () => closeModal());
}

function loadAppSettings() {
  const saved = localStorage.getItem('appSettings_config');
  if (saved) {
      appSettings = JSON.parse(saved);
      document.querySelector(`input[name="theme"][value="${appSettings.theme}"]`).checked = true;
      document.getElementById('auto-save').checked = appSettings.autoSave !== false;
      document.getElementById('sound-notifications').checked = appSettings.soundNotifications !== false;
  }
}

function testConnection() {
  const spreadsheetId = document.getElementById('spreadsheet-id').value;
  
  if (!spreadsheetId) {
      showExportStatus('❌ Введите ID Google Таблицы', 'error');
      return;
  }
  
  showExportStatus('🔄 Проверка соединения...', 'loading');
  
  setTimeout(() => {
      showExportStatus('✅ ID таблицы принят. Настройте Google Apps Script для полной интеграции.', 'success');
      if (appSettings.soundNotifications) playSound('success');
  }, 1000);
}

// ============================================
// ЭКСПОРТ В GOOGLE SHEETS
// ============================================

async function exportInventoryToGoogle() {
  const spreadsheetId = settings.spreadsheetId || document.getElementById('spreadsheet-id').value;
  
  if (!spreadsheetId) {
      showExportStatus('❌ Настройте ID Google Таблицы в разделе Настройки', 'error');
      return;
  }
  
  showExportStatus('🔄 Выгрузка данных в Google Sheets...', 'loading');
  
  try {
      const data = [
          ['№', 'Наименование товара', 'Количество', 'Статус', 'Дата выгрузки']
      ];
      
      const timestamp = new Date().toLocaleString('ru-RU');
      
      Object.entries(inventoryData).forEach(([product, quantity], index) => {
          const status = quantity > 0 ? 'В наличии' : 'Нет в наличии';
          data.push([index + 1, product, quantity, status, timestamp]);
      });
      
      const total = Object.values(inventoryData).reduce((a, b) => a + b, 0);
      data.push(['', 'СУММА ИТОГО:', total, '', '']);
      
      // Сохраняем для последующей отправки через Apps Script
      localStorage.setItem('googleExport_inventory', JSON.stringify({
          spreadsheetId,
          data,
          timestamp: new Date().toISOString()
      }));
      
      showExportStatus('✅ Данные подготовлены! Настройте Google Apps Script для авто-выгрузки.', 'success');
      if (appSettings.soundNotifications) playSound('success');
      
  } catch (error) {
      showExportStatus(`❌ Ошибка: ${error.message}`, 'error');
  }
}

async function exportOrderToGoogle() {
  const spreadsheetId = settings.spreadsheetId || document.getElementById('spreadsheet-id').value;
  
  if (!spreadsheetId) {
      showExportStatus('❌ Настройте ID Google Таблицы в разделе Настройки', 'error');
      return;
  }
  
  showExportStatus('🔄 Выгрузка данных в Google Sheets...', 'loading');
  
  try {
      const data = [
          ['№', 'Артикул', 'Наименование товара', 'Количество', 'Дата выгрузки']
      ];
      
      const timestamp = new Date().toLocaleString('ru-RU');
      let index = 1;
      
      Object.entries(orderData).forEach(([art, quantity]) => {
          if (quantity > 0) {
              data.push([index, art, ORDER_PRODUCTS[art], quantity, timestamp]);
              index++;
          }
      });
      
      if (index === 1) {
          data.push(['', '', 'НЕТ ЗАКАЗАННЫХ ТОВАРОВ', 0, '']);
      }
      
      const total = Object.values(orderData).reduce((a, b) => a + b, 0);
      data.push(['', '', 'СУММА ИТОГО:', total, '']);
      
      localStorage.setItem('googleExport_order', JSON.stringify({
          spreadsheetId,
          data,
          timestamp: new Date().toISOString()
      }));
      
      showExportStatus('✅ Данные подготовлены! Настройте Google Apps Script для авто-выгрузки.', 'success');
      if (appSettings.soundNotifications) playSound('success');
      
  } catch (error) {
      showExportStatus(`❌ Ошибка: ${error.message}`, 'error');
  }
}

// ============================================
// ЭКСПОРТ В EXCEL (CSV)
// ============================================

function exportInventoryToExcel() {
  const data = [
      ['№', 'Наименование товара', 'Количество', 'Статус']
  ];
  
  Object.entries(inventoryData).forEach(([product, quantity], index) => {
      const status = quantity > 0 ? 'В наличии' : 'Нет в наличии';
      data.push([index + 1, product, quantity, status]);
  });
  
  const total = Object.values(inventoryData).reduce((a, b) => a + b, 0);
  data.push(['', 'СУММА ИТОГО:', total, '']);
  
  downloadCSV(data, `остатки_табак_${getTimestamp()}.csv`);
  if (appSettings.soundNotifications) playSound('success');
}

function exportOrderToExcel() {
  const data = [
      ['№', 'Артикул', 'Наименование товара', 'Количество']
  ];
  
  let index = 1;
  Object.entries(orderData).forEach(([art, quantity]) => {
      if (quantity > 0) {
          data.push([index, art, ORDER_PRODUCTS[art], quantity]);
          index++;
      }
  });
  
  if (index === 1) {
      data.push(['', '', 'НЕТ ЗАКАЗАННЫХ ТОВАРОВ', 0]);
  }
  
  const total = Object.values(orderData).reduce((a, b) => a + b, 0);
  data.push(['', '', 'СУММА ИТОГО:', total]);
  
  downloadCSV(data, `заказ_азс_${getTimestamp()}.csv`);
  if (appSettings.soundNotifications) playSound('success');
}

function downloadCSV(data, filename) {
  const csvContent = data.map(row => 
      row.map(cell => `"${cell}"`).join(';')
  ).join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// ============================================
// ПРЕДПРОСМОТР ОТЧЕТОВ
// ============================================

function previewInventoryReport() {
  let html = '<table style="width:100%;border-collapse:collapse;">';
  html += '<tr style="background:#2E8B57;color:white;">';
  html += '<th style="padding:10px;border:1px solid #ddd;">№</th>';
  html += '<th style="padding:10px;border:1px solid #ddd;">Товар</th>';
  html += '<th style="padding:10px;border:1px solid #ddd;">Количество</th>';
  html += '<th style="padding:10px;border:1px solid #ddd;">Статус</th>';
  html += '</tr>';
  
  Object.entries(inventoryData).forEach(([product, quantity], index) => {
      const status = quantity > 0 ? '✅ В наличии' : '❌ Нет';
      const bg = quantity > 0 ? '#fff' : '#ffe6e6';
      html += `<tr style="background:${bg};">`;
      html += `<td style="padding:8px;border:1px solid #ddd;">${index + 1}</td>`;
      html += `<td style="padding:8px;border:1px solid #ddd;">${product}</td>`;
      html += `<td style="padding:8px;border:1px solid #ddd;text-align:center;">${quantity}</td>`;
      html += `<td style="padding:8px;border:1px solid #ddd;">${status}</td>`;
      html += '</tr>';
  });
  
  const total = Object.values(inventoryData).reduce((a, b) => a + b, 0);
  html += `<tr style="background:#ffff00;font-weight:bold;">`;
  html += `<td colspan="2" style="padding:10px;border:1px solid #ddd;text-align:right;">СУММА ИТОГО:</td>`;
  html += `<td colspan="2" style="padding:10px;border:1px solid #ddd;text-align:center;">${total}</td>`;
  html += '</tr>';
  html += '</table>';
  
  document.getElementById('preview-title').textContent = '📦 Предпросмотр отчета по инвентарю';
  document.getElementById('preview-content').innerHTML = html;
  document.getElementById('preview-modal').classList.add('active');
}

function previewOrderReport() {
  let html = '<table style="width:100%;border-collapse:collapse;">';
  html += '<tr style="background:#4169E1;color:white;">';
  html += '<th style="padding:10px;border:1px solid #ddd;">№</th>';
  html += '<th style="padding:10px;border:1px solid #ddd;">Артикул</th>';
  html += '<th style="padding:10px;border:1px solid #ddd;">Товар</th>';
  html += '<th style="padding:10px;border:1px solid #ddd;">Количество</th>';
  html += '</tr>';
  
  let index = 1;
  let hasOrders = false;
  
  Object.entries(orderData).forEach(([art, quantity]) => {
      if (quantity > 0) {
          hasOrders = true;
          html += `<tr>`;
          html += `<td style="padding:8px;border:1px solid #ddd;">${index}</td>`;
          html += `<td style="padding:8px;border:1px solid #ddd;">${art}</td>`;
          html += `<td style="padding:8px;border:1px solid #ddd;">${ORDER_PRODUCTS[art]}</td>`;
          html += `<td style="padding:8px;border:1px solid #ddd;text-align:center;">${quantity}</td>`;
          html += '</tr>';
          index++;
      }
  });
  
  if (!hasOrders) {
      html += `<tr><td colspan="4" style="padding:20px;text-align:center;color:#dc3545;">НЕТ ЗАКАЗАННЫХ ТОВАРОВ</td></tr>`;
  }
  
  const total = Object.values(orderData).reduce((a, b) => a + b, 0);
  html += `<tr style="background:#ffff00;font-weight:bold;">`;
  html += `<td colspan="3" style="padding:10px;border:1px solid #ddd;text-align:right;">СУММА ИТОГО:</td>`;
  html += `<td style="padding:10px;border:1px solid #ddd;text-align:center;">${total}</td>`;
  html += '</tr>';
  html += '</table>';
  
  document.getElementById('preview-title').textContent = '🛒 Предпросмотр отчета по заказу АЗС';
  document.getElementById('preview-content').innerHTML = html;
  document.getElementById('preview-modal').classList.add('active');
}

function closePreview() {
  document.getElementById('preview-modal').classList.remove('active');
}

function downloadFromPreview() {
  const title = document.getElementById('preview-title').textContent;
  if (title.includes('инвентарю')) {
      exportInventoryToExcel();
  } else {
      exportOrderToExcel();
  }
  closePreview();
}

// ============================================
// ИСТОРИЯ ОПЕРАЦИЙ
// ============================================

function addToHistory(type) {
  const timestamp = new Date().toLocaleString('ru-RU');
  const total = type === 'inventory' 
      ? Object.values(inventoryData).reduce((a, b) => a + b, 0)
      : Object.values(orderData).reduce((a, b) => a + b, 0);
  
  operationHistory.unshift({
      type,
      timestamp,
      total
  });
  
  // Храним последние 50 операций
  if (operationHistory.length > 50) {
      operationHistory = operationHistory.slice(0, 50);
  }
  
  localStorage.setItem('operationHistory', JSON.stringify(operationHistory));
  updateHistoryStats();
}

function loadHistory() {
  const saved = localStorage.getItem('operationHistory');
  if (saved) {
      operationHistory = JSON.parse(saved);
      updateHistoryStats();
  }
}

function updateHistoryStats() {
  const container = document.getElementById('history-stats');
  
  if (operationHistory.length === 0) {
      container.innerHTML = '<p>Нет сохраненных операций</p>';
      return;
  }
  
  let html = '<div style="max-height:200px;overflow-y:auto;">';
  operationHistory.slice(0, 10).forEach((op, index) => {
      const icon = op.type === 'inventory' ? '📦' : '🛒';
      const name = op.type === 'inventory' ? 'Инвентаризация' : 'Заказ АЗС';
      html += `
          <div style="padding:8px 0;border-bottom:1px solid #e0e0e0;font-size:0.9em;">
              <strong>${icon} ${name}</strong><br>
              <span style="color:#666;">${op.timestamp}</span> | 
              <span>Всего: ${op.total} шт.</span>
          </div>
      `;
  });
  html += '</div>';
  
  if (operationHistory.length > 10) {
      html += `<p style="margin-top:10px;color:#666;font-size:0.85em;">... и еще ${operationHistory.length - 10} операций</p>`;
  }
  
  container.innerHTML = html;
}

function clearHistory() {
  showModal(
      '⚠️ Очистка истории',
      'Вы уверены, что хотите очистить историю операций?',
      () => {
          operationHistory = [];
          localStorage.removeItem('operationHistory');
          updateHistoryStats();
          closeModal();
      }
  );
}

// ============================================
// УТИЛИТЫ
// ============================================

function getTimestamp() {
  const now = new Date();
  return now.toISOString().slice(0, 19).replace(/:/g, '-');
}

function showExportStatus(message, type) {
  const status = document.getElementById('export-status');
  status.textContent = message;
  status.className = `export-status ${type}`;
  
  if (type === 'success' || type === 'error') {
      setTimeout(() => {
          status.className = 'export-status';
      }, 5000);
  }
}

function updateLastSaveInfo(type) {
  const invTime = localStorage.getItem('inventoryTimestamp');
  const orderTime = localStorage.getItem('orderTimestamp');
  
  let text = '';
  if (invTime) {
      const date = new Date(invTime).toLocaleString('ru-RU');
      text += `📦 Инвентарь: ${date}`;
  }
  if (orderTime) {
      if (text) text += ' | ';
      const date = new Date(orderTime).toLocaleString('ru-RU');
      text += `🛒 Заказ: ${date}`;
  }
  
  document.getElementById('last-save-info').textContent = text || 'Нет сохраненных данных';
}

function updateInfoCounts() {
  document.getElementById('info-inventory-count').textContent = PRODUCTS.length;
  document.getElementById('info-order-count').textContent = Object.keys(ORDER_PRODUCTS).length;
}

// ============================================
// МОДАЛЬНЫЕ ОКНА
// ============================================

function showModal(title, message, confirmCallback) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-message').textContent = message;
  document.getElementById('confirm-modal').classList.add('active');
  
  const confirmBtn = document.getElementById('modal-confirm-btn');
  confirmBtn.onclick = () => {
      confirmCallback();
      closeModal();
  };
}

function closeModal() {
  document.getElementById('confirm-modal').classList.remove('active');
}

document.getElementById('confirm-modal').addEventListener('click', (e) => {
  if (e.target.id === 'confirm-modal') {
      closeModal();
  }
});

// ============================================
// ЗВУКОВЫЕ УВЕДОМЛЕНИЯ
// ============================================

function playSound(type) {
  if (!appSettings.soundNotifications) return;
  
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  if (type === 'success') {
      oscillator.frequency.value = 523.25; // C5
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
  } else if (type === 'error') {
      oscillator.frequency.value = 150;
      oscillator.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
  }
}