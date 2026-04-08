const STORAGE_KEY = 'virgilio-v3-tasks';
const DATA_URL = '/static/data/tasks.json';

const state = {
  tasks: [],
  view: 'dashboard',
  search: '',
  filter: 'all',
  focus: false,
};

const categories = [
  { key: 'Trabajo — GeoVictoria', label: 'Trabajo — GeoVictoria', color: '--cat-geo', slug: 'geo' },
  { key: 'Trabajo secundario — Partnea', label: 'Trabajo secundario — Partnea', color: '--cat-partnea', slug: 'partnea' },
  { key: 'Salud y bienestar', label: 'Salud y bienestar', color: '--cat-salud', slug: 'salud' },
  { key: 'Aprendizaje', label: 'Aprendizaje', color: '--cat-aprendizaje', slug: 'aprendizaje' },
  { key: 'Familia y relaciones', label: 'Familia y relaciones', color: '--cat-familia', slug: 'familia' },
  { key: 'Finanzas', label: 'Finanzas', color: '--cat-finanzas', slug: 'finanzas' },
];

const priors = {
  Alta: 'high',
  Media: 'medium',
  Baja: 'low',
};

const searchInput = document.getElementById('search-input');
const refreshBtn = document.getElementById('refresh-btn');
const focusBtn = document.getElementById('focus-btn');
const rightPanel = document.getElementById('right-panel');
const top3List = document.getElementById('top3-list');
const progressCompleted = document.getElementById('progress-completed');
const progressPending = document.getElementById('progress-pending');
const progressOverdue = document.getElementById('progress-overdue');
const kpiGrid = document.getElementById('kpi-grid');
const boardColumns = document.getElementById('board-columns');
const overdueTable = document.getElementById('overdue-table');
const alertsList = document.getElementById('alerts-list');
const toastContainer = document.getElementById('toast-container');
const taskModal = document.getElementById('task-modal');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalClose = document.getElementById('modal-close');
const modalBody = document.getElementById('modal-body');
const newTaskBtn = document.getElementById('new-task-btn');
const clearStorageBtn = document.getElementById('clear-storage');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const navButtons = Array.from(document.querySelectorAll('.nav-item'));
const filterButtons = Array.from(document.querySelectorAll('.filter-btn'));
const pageTitle = document.getElementById('page-title');
const todayDateEl = document.getElementById('today-date');

let charts = {};

const taskDefault = {
  id: '0',
  title: '',
  category: 'Trabajo — GeoVictoria',
  priority: 'Media',
  dueDate: null,
  completed: false,
  completedAt: null,
  assignee: 'V',
  notes: '',
  subtasks: [],
};

function todayLabel() {
  return new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

todayDateEl.textContent = todayLabel();

function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    state.tasks = JSON.parse(saved);
    return Promise.resolve();
  }

  return fetch(DATA_URL)
    .then(res => res.json())
    .then(data => {
      state.tasks = data;
      persist();
    });
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function applyFilters(tasks) {
  let filtered = [...tasks];
  const search = state.search.trim().toLowerCase();

  if (search) {
    filtered = filtered.filter(task => [task.title, task.notes, task.assignee, task.category]
      .some(value => value && value.toLowerCase().includes(search)));
  }

  const now = new Date();

  if (state.filter === 'today') {
    filtered = filtered.filter(task => task.dueDate && new Date(task.dueDate).toDateString() === now.toDateString());
  }
  if (state.filter === 'no-date') {
    filtered = filtered.filter(task => !task.dueDate);
  }
  if (state.filter === 'alta') {
    filtered = filtered.filter(task => task.priority === 'Alta');
  }
  if (state.filter === 'media') {
    filtered = filtered.filter(task => task.priority === 'Media');
  }
  if (state.filter === 'baja') {
    filtered = filtered.filter(task => task.priority === 'Baja');
  }
  return filtered;
}

function taskBadgeClass(task) {
  return priors[task.priority] || 'low';
}

function categorySlug(category) {
  return categories.find(item => item.key === category)?.slug || 'geo';
}

function categoryColor(key) {
  const cat = categories.find(item => item.key === key);
  return cat ? getComputedStyle(document.documentElement).getPropertyValue(cat.color) : '#2563eb';
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<strong>✓</strong><span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function openModal(task) {
  taskModal.classList.remove('hidden');
  modalBody.innerHTML = `
    <div class="detail-row"><strong>Tarea</strong><p>${task.title}</p></div>
    <div class="detail-row"><strong>Categoría</strong><p>${task.category}</p></div>
    <div class="detail-row"><strong>Prioridad</strong><p>${task.priority}</p></div>
    <div class="detail-row"><strong>Vence</strong><p>${task.dueDate || 'Sin fecha'}</p></div>
    <div class="detail-row"><strong>Asignado a</strong><p>${task.assignee}</p></div>
    <div class="detail-row"><strong>Notas</strong><p>${task.notes || 'Sin notas'}</p></div>
    <div class="detail-row"><strong>Subtareas</strong><p>${task.subtasks.length ? task.subtasks.join(', ') : 'Sin subtareas'}</p></div>
  `;
}

function closeModal() {
  taskModal.classList.add('hidden');
}

function renderNav() {
  navButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === state.view);
    btn.addEventListener('click', () => {
      state.view = btn.dataset.view;
      renderView();
    });
  });
}

function renderFilters() {
  filterButtons.forEach(button => {
    button.classList.toggle('active', button.dataset.filter === state.filter);
    button.onclick = () => {
      state.filter = button.dataset.filter;
      renderAll();
    };
  });
}

function updateRightPanel() {
  const activeTasks = applyFilters(state.tasks.filter(task => !task.completed));
  const overdueTasks = activeTasks.filter(task => task.dueDate && new Date(task.dueDate) < new Date());
  const nextTasks = activeTasks.slice(0, 3);

  top3List.innerHTML = nextTasks.map(task => `
    <li><span class="badge ${taskBadgeClass(task)}">${task.priority}</span> ${task.title}</li>
  `).join('') || '<li>Sin tareas prioritarias</li>';

  progressCompleted.textContent = state.tasks.filter(task => task.completed).length;
  progressPending.textContent = activeTasks.length;
  progressOverdue.textContent = overdueTasks.length;
}

function renderKpis() {
  const active = state.tasks.filter(task => !task.completed);
  const completedToday = state.tasks.filter(task => task.completed && task.completedAt && new Date(task.completedAt).toDateString() === new Date().toDateString()).length;
  const completedWeek = state.tasks.filter(task => {
    if (!task.completedAt) return false;
    const completedAt = new Date(task.completedAt);
    const diff = (new Date() - completedAt) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }).length;
  const overdue = active.filter(task => task.dueDate && new Date(task.dueDate) < new Date()).length;

  const total = state.tasks.length;
  const completedGlobal = total ? Math.round((state.tasks.filter(task => task.completed).length / total) * 100) : 0;
  const streakDays = Math.max(1, Math.min(10, completedWeek));

  document.getElementById('streak-days').textContent = `${streakDays} días`;

  kpiGrid.innerHTML = [
    { label: 'Total tareas activas', value: active.length },
    { label: 'Completadas hoy', value: completedToday },
    { label: 'Completadas esta semana', value: completedWeek },
    { label: 'Tareas vencidas', value: overdue },
    { label: 'Racha diaria', value: `${streakDays} días` },
    { label: 'Completitud global', value: `${completedGlobal}%` },
  ].map(kpi => `
    <div class="kpi-card">
      <span>${kpi.label}</span>
      <strong>${kpi.value}</strong>
    </div>
  `).join('');
}

function renderHeatmap() {
  const heatmapGrid = document.getElementById('heatmap-grid');
  heatmapGrid.innerHTML = '';
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 7 * 8 + 1);

  const counts = {};
  state.tasks.filter(task => task.completed && task.completedAt).forEach(task => {
    const date = new Date(task.completedAt).toISOString().split('T')[0];
    counts[date] = (counts[date] || 0) + 1;
  });

  for (let week = 0; week < 8; week += 1) {
    const column = document.createElement('div');
    column.className = 'heatmap-column';
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + week * 7 + day);
      const iso = date.toISOString().split('T')[0];
      const amount = counts[iso] || 0;
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.dataset.count = Math.min(amount, 5).toString();
      cell.title = `${date.toLocaleDateString('es-ES')} · ${amount} completadas`;
      column.appendChild(cell);
    }
    heatmapGrid.appendChild(column);
  }
}

function buildDataset() {
  const activeTasks = state.tasks.filter(task => !task.completed);
  const countsByCategory = categories.map(cat => activeTasks.filter(task => task.category === cat.key).length);
  const countsByPriority = ['Alta', 'Media', 'Baja'].map(label => activeTasks.filter(task => task.priority === label).length);
  const completedTotals = state.tasks.filter(task => task.completed).length;
  const completedToday = state.tasks.filter(task => task.completed && task.completedAt && new Date(task.completedAt).toDateString() === new Date().toDateString()).length;

  return { countsByCategory, countsByPriority, completedTotals, completedToday };
}

function renderCharts() {
  const { countsByCategory, countsByPriority } = buildDataset();

  const categoriesLabels = categories.map(cat => cat.label);
  const categoryColors = categories.map(cat => getComputedStyle(document.documentElement).getPropertyValue(cat.color).trim());

  if (charts.categoryBar) charts.categoryBar.destroy();
  charts.categoryBar = new Chart(document.getElementById('category-bar'), {
    type: 'bar',
    data: {
      labels: categoriesLabels,
      datasets: [{
        data: countsByCategory,
        backgroundColor: categoryColors,
        borderRadius: 14,
      }],
    },
    options: {
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: 'var(--text-muted)' } },
        y: { ticks: { color: 'var(--text-primary)' } },
      },
    },
  });

  if (charts.priorityDonut) charts.priorityDonut.destroy();
  charts.priorityDonut = new Chart(document.getElementById('priority-donut'), {
    type: 'doughnut',
    data: {
      labels: ['Alta', 'Media', 'Baja'],
      datasets: [{
        data: countsByPriority,
        backgroundColor: ['var(--priority-high)', 'var(--priority-medium)', 'var(--priority-low)'],
      }],
    },
    options: {
      cutout: '70%',
      plugins: { legend: { display: false } },
    },
  });

  const legend = document.getElementById('priority-legend');
  legend.innerHTML = ['Alta', 'Media', 'Baja'].map((label, idx) => `
    <div class="priority-pill ${priors[label]}"><span>${label}</span><strong>${countsByPriority[idx]}</strong></div>
  `).join('');

  if (charts.balanceRadar) charts.balanceRadar.destroy();
  charts.balanceRadar = new Chart(document.getElementById('balance-radar'), {
    type: 'radar',
    data: {
      labels: categoriesLabels,
      datasets: [{
        label: 'Completadas esta semana',
        data: categories.map(cat => state.tasks.filter(task => task.completed && task.category === cat.key && task.completedAt && (new Date() - new Date(task.completedAt)) / (1000 * 60 * 60 * 24) <= 7).length),
        backgroundColor: 'rgba(37, 99, 235, 0.16)',
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--cat-geo').trim(),
        borderWidth: 2,
        pointBackgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--cat-geo').trim(),
      }],
    },
    options: {
      scales: {
        r: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, angleLines: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: 'var(--text-muted)', stepSize: 1 } },
      },
      plugins: { legend: { display: false } },
    },
  });

  if (charts.trendLine) charts.trendLine.destroy();
  const labels = [];
  const values = [];
  for (let i = 13; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const iso = date.toISOString().split('T')[0];
    const completions = state.tasks.filter(task => task.completed && task.completedAt && task.completedAt.startsWith(iso)).length;
    labels.push(date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }));
    values.push(completions);
  }

  charts.trendLine = new Chart(document.getElementById('trend-line'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--cat-geo').trim(),
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: 'var(--text-muted)' }, grid: { display: false } },
        y: { ticks: { color: 'var(--text-muted)', stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } },
      },
    },
  });
}

function renderOverdueTable() {
  const overdue = state.tasks.filter(task => !task.completed && task.dueDate && new Date(task.dueDate) < new Date());
  if (!overdue.length) {
    overdueTable.innerHTML = '<div class="overdue-row"><strong>¡Todo al día! 🎉</strong><p>No hay tareas vencidas en este momento.</p></div>';
    return;
  }

  overdueTable.innerHTML = overdue.map(task => {
    const days = Math.ceil((new Date() - new Date(task.dueDate)) / (1000 * 60 * 60 * 24));
    return `
      <div class="overdue-row">
        <div class="overdue-meta">
          <strong>${task.title}</strong>
          <span class="category-pill ${categorySlug(task.category)}">${task.category}</span>
          <small>Días vencida: ${days}</small>
        </div>
        <div style="display:flex; flex-direction: column; gap: 8px;">
          <button class="secondary-btn" onclick="completeTask('${task.id}')">Completar</button>
          <button class="secondary-btn" onclick="postponeTask('${task.id}')">Posponer 3 días</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderAlerts() {
  const alerts = [];
  const completedByCategory = categories.map(cat => ({ key: cat.key, count: state.tasks.filter(task => task.completed && task.category === cat.key && task.completedAt && (new Date() - new Date(task.completedAt)) / (1000 * 60 * 60 * 24) <= 5).length }));

  completedByCategory.forEach(item => {
    if (item.count === 0) {
      alerts.push({ type: 'warning', text: `No se ha completado ninguna tarea en ${item.key} en los últimos 5 días.` });
    }
  });

  const untouched = state.tasks.filter(task => !task.completed && task.dueDate && (new Date() - new Date(task.dueDate)) / (1000 * 60 * 60 * 24) > 7);
  if (untouched.length > 0) {
    alerts.push({ type: 'warning', text: `Hay ${untouched.length} tareas sin tocar por más de 7 días.` });
  }

  const noSalud = !state.tasks.some(task => task.category === 'Salud y bienestar' && task.completed && task.completedAt && (new Date() - new Date(task.completedAt)) / (1000 * 60 * 60 * 24) <= 3);
  if (noSalud) alerts.push({ type: 'warning', text: 'Llevas más de 3 días sin registrar actividad en Salud y bienestar.' });

  const noFamilia = !state.tasks.some(task => task.category === 'Familia y relaciones' && task.completed && task.completedAt && (new Date() - new Date(task.completedAt)) / (1000 * 60 * 60 * 24) <= 3);
  if (noFamilia) alerts.push({ type: 'warning', text: 'Llevas más de 3 días sin registrar actividad en Familia y relaciones.' });

  const overdueCount = state.tasks.filter(task => !task.completed && task.dueDate && new Date(task.dueDate) < new Date()).length;
  if (overdueCount > 5) alerts.push({ type: 'warning', text: `Hay ${overdueCount} tareas vencidas acumuladas.` });

  if (!alerts.length) {
    alertsList.innerHTML = '<div class="alert-row"><strong>Todo en orden ✓</strong><p>No se detectaron alertas inteligentes.</p></div>';
    return;
  }

  alertsList.innerHTML = alerts.map(alert => `<div class="alert-row"><span>${alert.text}</span></div>`).join('');
}

function renderBoard() {
  boardColumns.innerHTML = categories.map(cat => `
    <div class="board-column">
      <div class="column-header">
        <div class="column-title ${cat.slug}">${cat.label}</div>
        <div class="column-count" id="count-${cat.slug}"></div>
      </div>
      <div class="column-board" data-category="${cat.key}"></div>
    </div>
  `).join('');

  categories.forEach(cat => {
    const column = document.querySelector(`.column-board[data-category="${cat.key}"]`);
    const tasks = applyFilters(state.tasks.filter(task => task.category === cat.key));
    document.getElementById(`count-${cat.slug}`).textContent = `${tasks.filter(task => task.completed).length}/${tasks.length}`;
    tasks.forEach(task => column.appendChild(createTaskCard(task)));

    column.addEventListener('dragover', event => {
      event.preventDefault();
    });
    column.addEventListener('drop', event => {
      event.preventDefault();
      const taskId = event.dataTransfer.getData('text/plain');
      const task = state.tasks.find(item => item.id === taskId);
      if (task) {
        task.category = cat.key;
        persist();
        renderAll();
      }
    });
  });
}

function createTaskCard(task) {
  const card = document.createElement('article');
  card.className = `task-card ${task.completed ? 'completed' : ''}`;
  card.draggable = true;
  card.innerHTML = `
    <div class="task-card-header">
      <div class="checkbox-wrapper">
        <div class="check-circle ${task.completed ? 'checked' : ''}" data-id="${task.id}">✓</div>
        <div class="task-title">${task.title}</div>
      </div>
      <span class="badge ${taskBadgeClass(task)}">${task.priority}</span>
    </div>
    <div class="task-meta">
      <span>${task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-ES') : 'Sin fecha'}</span>
      <span class="avatar">${task.assignee}</span>
      <span class="category-pill ${categorySlug(task.category)}">${task.category}</span>
    </div>
  `;

  card.querySelector('.check-circle').addEventListener('click', () => completeTask(task.id));
  card.addEventListener('click', event => {
    if (!event.target.classList.contains('check-circle')) openModal(task);
  });

  card.addEventListener('dragstart', event => {
    event.dataTransfer.setData('text/plain', task.id);
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', () => card.classList.remove('dragging'));
  return card;
}

function completeTask(id) {
  const task = state.tasks.find(item => item.id === id);
  if (!task) return;
  task.completed = true;
  task.completedAt = new Date().toISOString();
  persist();
  renderAll();
  showToast(`Tarea completada: ${task.title}`);
}

function postponeTask(id) {
  const task = state.tasks.find(item => item.id === id);
  if (!task || !task.dueDate) return;
  const due = new Date(task.dueDate);
  due.setDate(due.getDate() + 3);
  task.dueDate = due.toISOString().split('T')[0];
  persist();
  renderAll();
  showToast(`Pospuesta 3 días: ${task.title}`);
}

function quickAddTask() {
  const newTask = { ...taskDefault };
  newTask.id = Date.now().toString();
  newTask.title = 'Nueva tarea rápida';
  newTask.category = 'Trabajo — GeoVictoria';
  newTask.priority = 'Media';
  newTask.assignee = 'V';
  state.tasks.unshift(newTask);
  persist();
  renderAll();
  showToast('Tarea rápida agregada. Edita el detalle si quieres.');
}

function renderView() {
  document.querySelectorAll('.view-panel').forEach(panel => panel.classList.add('hidden'));
  document.getElementById(`view-${state.view}`).classList.remove('hidden');
  pageTitle.textContent = state.view === 'dashboard' ? 'Dashboard Analytics' : state.view === 'board' ? 'Board' : state.view.charAt(0).toUpperCase() + state.view.slice(1);
  renderAll();
}

function renderAll() {
  if (state.view === 'dashboard') {
    renderKpis();
    renderCharts();
    renderHeatmap();
    renderOverdueTable();
    renderAlerts();
    updateRightPanel();
  }
  if (state.view === 'board') {
    renderBoard();
    updateRightPanel();
  }
}

function refresh() {
  renderAll();
  showToast('Dashboard actualizado');
}

function toggleFocus() {
  state.focus = !state.focus;
  document.body.classList.toggle('focus-mode', state.focus);
  focusBtn.textContent = state.focus ? 'Salir focus' : 'Modo focus';
}

function resetData() {
  localStorage.removeItem(STORAGE_KEY);
  loadTasks().then(() => {
    renderAll();
    showToast('Datos de ejemplo recargados.');
  });
}

function start() {
  renderNav();
  renderFilters();
  refreshBtn.addEventListener('click', refresh);
  focusBtn.addEventListener('click', toggleFocus);
  newTaskBtn.addEventListener('click', quickAddTask);
  clearStorageBtn.addEventListener('click', resetData);
  toggleSidebarBtn.addEventListener('click', () => document.body.classList.toggle('focus-mode'));
  modalBackdrop.addEventListener('click', closeModal);
  modalClose.addEventListener('click', closeModal);
  searchInput.addEventListener('input', event => {
    state.search = event.target.value;
    renderAll();
  });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      searchInput.focus();
    }
  });
  navButtons.forEach(btn => btn.addEventListener('click', () => renderView()));

  loadTasks().then(() => {
    renderView();
  });
}

window.completeTask = completeTask;
window.postponeTask = postponeTask;
window.onload = start;
