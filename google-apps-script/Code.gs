const SCRIPT_NAME = "The Meal Guides API";

function doGet(e) { return handleRequest(e, 'GET'); }
function doPost(e) { return handleRequest(e, 'POST'); }

function handleRequest(e, method) {
  try {
    const action = e.parameter.action;
    let payload = {};
    if (method === 'POST' && e.postData && e.postData.contents) payload = JSON.parse(e.postData.contents);
    const routes = {
      getRestaurants: () => getRestaurants(),
      getMenu: () => getMenu(e.parameter.restaurant_id),
      getOrders: () => getOrders(e.parameter.status),
      getAdminData: () => getAdminData(),
      getAdminSnapshot: () => getAdminSnapshot(),
      submitOrder: () => submitOrder(payload),
      updateOrderStatus: () => updateOrderStatus(payload.order_number, payload.new_status),
      saveRestaurant: () => saveRestaurant(payload.record),
      saveCategory: () => saveCategory(payload.record),
      saveMenuItem: () => saveMenuItem(payload.record),
      saveOptionGroup: () => saveOptionGroup(payload.record),
      saveOption: () => saveOption(payload.record),
      verifyAdminPin: () => verifyAdminPin(payload.pin)
    };
    if (!routes[action]) throw new Error('Invalid or missing action parameter.');
    return buildResponse({ success: true, data: routes[action]() });
  } catch (error) { return buildResponse({ success: false, error: error.message }); }
}

function getRestaurants() {
  return getSheetDataAsObjects('Restaurants').filter(r => String(r.active).toLowerCase() === 'yes');
}

function getMenu(restaurantId) {
  if (!restaurantId) throw new Error('restaurant_id is required');
  const items = getSheetDataAsObjects('MenuItems').filter(i => String(i.restaurant_id) === String(restaurantId) && String(i.active).toLowerCase() === 'yes');
  const groups = getSheetDataAsObjects('OptionGroups');
  const options = getSheetDataAsObjects('Options');
  return items.map(item => ({ ...item, option_groups: groups.filter(g =>
    (g.category_id && item.category_id && String(g.category_id) === String(item.category_id)) ||
    (!g.category_id && String(g.item_id) === String(item.item_id))
  ).sort(sortRows).map(group => ({ ...group, options: options.filter(o => String(o.group_id) === String(group.group_id)).sort(sortRows) })) }));
}

function getAdminData() {
  return {
    restaurants: getSheetDataAsObjects('Restaurants'),
    categories: getSheetDataAsObjects('Categories'),
    menuItems: getSheetDataAsObjects('MenuItems'),
    optionGroups: getSheetDataAsObjects('OptionGroups'),
    options: getSheetDataAsObjects('Options')
  };
}

function getAdminSnapshot() {
  const data = getAdminData();
  data.orders = getOrders();
  return data;
}

function saveRestaurant(record) {
  return upsertRecord('Restaurants', 'restaurant_id', record, ['restaurant_id','name','logo_url','description','active','banner_url'], 'r');
}
function saveCategory(record) {
  requireExisting('Restaurants', 'restaurant_id', record.restaurant_id, 'Restaurant');
  return upsertRecord('Categories', 'category_id', record, ['category_id','restaurant_id','name','active','sort_order'], 'cat');
}
function saveMenuItem(record) {
  const category = getSheetDataAsObjects('Categories').find(row => String(row.category_id) === String(record.category_id));
  if (!category) throw new Error('Category not found');
  record.restaurant_id = category.restaurant_id;
  record.category = category.name;
  return upsertRecord('MenuItems', 'item_id', record, ['item_id','restaurant_id','name','base_price','category','photo_url','active','category_id','description'], 'item');
}

function verifyAdminPin(pin) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('AdminAuth');
  if (!sheet) throw new Error('AdminAuth sheet was not found.');
  const expected = String(sheet.getRange('A2').getDisplayValue()).trim();
  return { valid: expected.length > 0 && String(pin || '').trim() === expected };
}
function saveOptionGroup(record) {
  requireExisting('Categories', 'category_id', record.category_id, 'Category');
  if (!['single','multiple'].includes(String(record.selection_type))) throw new Error('selection_type must be single or multiple');
  return upsertRecord('OptionGroups', 'group_id', record, ['group_id','item_id','group_name','selection_type','required','sort_order','category_id'], 'og');
}
function saveOption(record) {
  requireExisting('OptionGroups', 'group_id', record.group_id, 'Option group');
  return upsertRecord('Options', 'option_id', record, ['option_id','group_id','option_name','price','sort_order'], 'opt');
}

function upsertRecord(sheetName, keyField, record, allowedFields, prefix) {
  if (!record || typeof record !== 'object') throw new Error('record is required');
  const requiredName = (sheetName === 'Restaurants' || sheetName === 'Categories' || sheetName === 'MenuItems')
    ? 'name'
    : sheetName === 'OptionGroups'
      ? 'group_name'
      : 'option_name';
  if (!String(record[requiredName] || '').trim()) throw new Error(requiredName + ' is required');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet ' + sheetName + ' not found');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  allowedFields.forEach(field => { if (headers.indexOf(field) === -1) throw new Error('Missing column ' + field + ' in ' + sheetName); });
  const clean = {};
  allowedFields.forEach(field => clean[field] = record[field] === undefined ? '' : record[field]);
  if (!clean[keyField]) clean[keyField] = prefix + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  const keyColumn = headers.indexOf(keyField);
  let rowNumber = -1;
  for (let i = 1; i < values.length; i++) if (String(values[i][keyColumn]) === String(clean[keyField])) { rowNumber = i + 1; break; }
  const row = headers.map(header => allowedFields.includes(header) ? clean[header] : (rowNumber > -1 ? values[rowNumber - 1][headers.indexOf(header)] : ''));
  if (rowNumber > -1) sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]); else sheet.appendRow(row);
  return clean;
}

function requireExisting(sheetName, keyField, value, label) {
  if (!value || !getSheetDataAsObjects(sheetName).some(row => String(row[keyField]) === String(value))) throw new Error(label + ' not found');
}

function submitOrder(payload) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const counterSheet = ss.getSheetByName('Order_Counter');
    const ordersSheet = ss.getSheetByName('Orders');
    if (!counterSheet || !ordersSheet) throw new Error('Order sheets are not configured.');
    const clean = validateOrder(payload);
    const counterData = counterSheet.getDataRange().getValues();
    let currentNumber = 1000, rowIndex = -1;
    for (let i = 1; i < counterData.length; i++) if (counterData[i][1] === 'order_sequence') { currentNumber = parseInt(counterData[i][2], 10); rowIndex = i + 1; break; }
    if (!Number.isFinite(currentNumber)) currentNumber = 1000;
    if (rowIndex < 0) {
      const existingNumbers = ordersSheet.getDataRange().getValues().slice(1).map(row => parseInt(row[0], 10)).filter(Number.isFinite);
      if (existingNumbers.length) currentNumber = Math.max(currentNumber, ...existingNumbers);
    }
    const newOrderNumber = currentNumber + 1;
    if (rowIndex > -1) counterSheet.getRange(rowIndex, 3).setValue(newOrderNumber);
    else counterSheet.appendRow(['', 'order_sequence', newOrderNumber]);
    const formatted = String(newOrderNumber).padStart(4, '0');
    const timestamp = new Date().toISOString();
    ordersSheet.appendRow([formatted,clean.restaurant_id,JSON.stringify(clean.items),clean.subtotal,clean.customer_name,'',clean.contact_number,clean.city,clean.barangay,clean.house_number,'',clean.order_remarks,'pending',timestamp]);
    return { order_number: formatted, status: 'pending', timestamp: timestamp };
  } finally { lock.releaseLock(); }
}

function validateOrder(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Order details are required.');
  const restaurantId = String(payload.restaurant_id || '').trim();
  const restaurant = getSheetDataAsObjects('Restaurants').find(row => String(row.restaurant_id) === restaurantId && String(row.active).toLowerCase() === 'yes');
  if (!restaurant) throw new Error('Restaurant is not available.');
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 50) throw new Error('Order must contain between 1 and 50 items.');

  const menuItems = getSheetDataAsObjects('MenuItems');
  const groups = getSheetDataAsObjects('OptionGroups');
  const options = getSheetDataAsObjects('Options');
  let subtotal = 0;
  const items = payload.items.map(input => {
    const menuItem = menuItems.find(row => String(row.item_id) === String(input.item_id) && String(row.restaurant_id) === restaurantId && String(row.active).toLowerCase() === 'yes');
    if (!menuItem) throw new Error('One of the selected menu items is unavailable.');
    const quantity = Number(input.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('Item quantity must be between 1 and 99.');
    const itemGroups = groups.filter(group =>
      (group.category_id && menuItem.category_id && String(group.category_id) === String(menuItem.category_id)) ||
      (!group.category_id && String(group.item_id) === String(menuItem.item_id))
    );
    const suppliedOptions = Array.isArray(input.selected_options) ? input.selected_options : [];
    const seen = {};
    const selectedOptions = suppliedOptions.map(supplied => {
      const option = options.find(row => String(row.option_id) === String(supplied.option_id));
      if (!option || !itemGroups.some(group => String(group.group_id) === String(option.group_id))) throw new Error('One of the selected add-ons is unavailable.');
      if (seen[option.option_id]) throw new Error('The same add-on cannot be selected twice.');
      seen[option.option_id] = true;
      return { option_id: option.option_id, group_id: option.group_id, option_name: option.option_name, price: Number(option.price || 0) };
    });
    itemGroups.forEach(group => {
      const count = selectedOptions.filter(option => String(option.group_id) === String(group.group_id)).length;
      if (String(group.required).toLowerCase() === 'yes' && count === 0) throw new Error(group.group_name + ' is required.');
      if (String(group.selection_type).toLowerCase() === 'single' && count > 1) throw new Error('Choose only one option for ' + group.group_name + '.');
    });
    const basePrice = Number(menuItem.base_price || 0);
    if (!Number.isFinite(basePrice) || basePrice < 0 || selectedOptions.some(option => !Number.isFinite(option.price) || option.price < 0)) throw new Error('An item has an invalid price.');
    const unitPrice = basePrice + selectedOptions.reduce((sum, option) => sum + option.price, 0);
    const totalPrice = unitPrice * quantity;
    subtotal += totalPrice;
    const remarks = String(input.remarks || '').trim();
    if (remarks.length > 160) throw new Error('Item remarks must be 160 characters or fewer.');
    return { restaurant_id: restaurantId, item_id: menuItem.item_id, name: menuItem.name, base_price: basePrice, quantity: quantity, selected_options: selectedOptions, remarks: remarks, unit_price: unitPrice, total_price: totalPrice };
  });

  const required = ['customer_name', 'city', 'barangay', 'house_number'];
  required.forEach(field => { if (!String(payload[field] || '').trim()) throw new Error(field + ' is required.'); });
  const contactNumber = String(payload.contact_number || '').replace(/\s/g, '');
  if (!/^\+63\d{10}$/.test(contactNumber)) throw new Error('A valid Philippine contact number is required.');
  const orderRemarks = String(payload.order_remarks || '').trim();
  if (orderRemarks.length > 500) throw new Error('Order remarks must be 500 characters or fewer.');
  return { restaurant_id: restaurantId, items: items, subtotal: subtotal, customer_name: String(payload.customer_name).trim(), contact_number: contactNumber, city: String(payload.city).trim(), barangay: String(payload.barangay).trim(), house_number: String(payload.house_number).trim(), order_remarks: orderRemarks };
}

function getOrders(statusFilter) {
  let orders = getSheetDataAsObjects('Orders');
  if (statusFilter) orders = orders.filter(o => String(o.status).toLowerCase() === String(statusFilter).toLowerCase());
  return orders.map(order => { try { order.items = JSON.parse(order.items_json); } catch (e) { order.items = []; } delete order.items_json; return order; });
}

function updateOrderStatus(orderNumber, newStatus) {
  const allowed = ['pending','confirmed','preparing','ready','completed','cancelled'];
  if (!orderNumber || !allowed.includes(String(newStatus).toLowerCase())) throw new Error('A valid order_number and status are required');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
  const data = sheet.getDataRange().getValues(), headers = data[0];
  const statusCol = headers.indexOf('status') + 1, orderCol = headers.indexOf('order_number');
  for (let i = 1; i < data.length; i++) if (String(data[i][orderCol]) === String(orderNumber)) {
    const currentStatus = String(data[i][statusCol - 1]).toLowerCase();
    if (currentStatus === 'completed') {
      if (String(newStatus).toLowerCase() === 'completed') return { order_number: orderNumber, status: 'completed', locked: true };
      throw new Error('Completed orders are locked and cannot be changed');
    }
    sheet.getRange(i + 1, statusCol).setValue(String(newStatus).toLowerCase());
    return { order_number: orderNumber, status: String(newStatus).toLowerCase(), locked: String(newStatus).toLowerCase() === 'completed' };
  }
  throw new Error('Order not found');
}

function getSheetDataAsObjects(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet ' + sheetName + ' not found');
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).filter(row => row.some(cell => cell !== '')).map(row => { const obj = {}; data[0].forEach((header,index) => obj[header] = row[index]); return obj; });
}
function sortRows(a,b) { return parseInt(a.sort_order || 0,10) - parseInt(b.sort_order || 0,10); }
function buildResponse(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
