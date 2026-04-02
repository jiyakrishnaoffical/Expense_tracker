// ==========================================
// DOM Elements Definition
// ==========================================
const form = document.getElementById('expenseForm');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const descriptionInput = document.getElementById('description');
const expenseIdInput = document.getElementById('expenseId');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

const expenseList = document.getElementById('expenseList');
const emptyState = document.getElementById('emptyState');
const totalAmountDisplay = document.getElementById('totalAmount');
const monthlyTotalDisplay = document.getElementById('monthlyTotal');

const searchInput = document.getElementById('searchInput');
const filterCategory = document.getElementById('filterCategory');
const sortConfig = document.getElementById('sortConfig');

const themeToggleBtn = document.getElementById('themeToggle');

// ==========================================
// State Management
// ==========================================
// Retrieve expenses from localStorage or initialize empty array
let expenses = JSON.cast ? [] : JSON.parse(localStorage.getItem('expenses')) || [];

// Initialize variables for Chart.js instance
let categoryChartInstance = null;

// Icons mapping based on category for UI
const categoryIcons = {
    'Food': 'fa-utensils',
    'Travel': 'fa-plane',
    'Shopping': 'fa-cart-shopping',
    'Bills': 'fa-file-invoice-dollar',
    'Others': 'fa-icons'
};

const categoryColors = {
    'Food': '#ef4444',     // Red
    'Travel': '#3b82f6',   // Blue
    'Shopping': '#8b5cf6', // Purple
    'Bills': '#f59e0b',    // Orange
    'Others': '#10b981'    // Green
};

// ==========================================
// Theme Logic
// ==========================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    // Default to dark mode if user prefers it at OS level, otherwise light mode
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.setAttribute('data-theme', 'dark');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.body.removeAttribute('data-theme');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

themeToggleBtn.addEventListener('click', () => {
    if (document.body.getAttribute('data-theme') === 'dark') {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
    
    // Redraw chart to adjust text colors based on mode
    if (categoryChartInstance) {
        // Just trigger a re-render
        updateChart();
    }
});

// ==========================================
// Helper Functions
// ==========================================
function generateId() {
    return Math.floor(Math.random() * 1000000000).toString();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function getMonthlyTotal(expensesToProcess) {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    return expensesToProcess.reduce((total, expense) => {
        const expenseDate = new Date(expense.date);
        if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
            return total + expense.amount;
        }
        return total;
    }, 0);
}

function saveToLocalStorage() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

// ==========================================
// Core CRUD UI Logic
// ==========================================
function validateInputs() {
    if (amountInput.value.trim() === '' || isNaN(amountInput.value) || Number(amountInput.value) <= 0) {
        alert("Please enter a valid amount greater than 0");
        return false;
    }
    if (categoryInput.value === '') {
        alert("Please select a category");
        return false;
    }
    if (dateInput.value === '') {
        alert("Please select a valid date");
        return false;
    }
    if (descriptionInput.value.trim() === '') {
        alert("Please enter a description");
        return false;
    }
    return true;
}

function addExpense(e) {
    e.preventDefault();
    
    if (!validateInputs()) return;

    const amount = Number(amountInput.value);
    const category = categoryInput.value;
    const date = dateInput.value;
    const description = descriptionInput.value.trim();
    const id = expenseIdInput.value;

    if (id) {
        // Edit mode
        expenses = expenses.map(expense => 
            expense.id === id 
                ? { ...expense, amount, category, date, description } 
                : expense
        );
        resetFormState();
    } else {
        // Add new mode
        const newExpense = {
            id: generateId(),
            amount,
            category,
            date,
            description
        };
        expenses.push(newExpense);
    }

    saveToLocalStorage();
    refreshView();
    form.reset();
}

function deleteExpense(id) {
    if (confirm("Are you sure you want to delete this expense?")) {
        expenses = expenses.filter(expense => expense.id !== id);
        saveToLocalStorage();
        refreshView();
    }
}

function editExpense(id) {
    // Find the expense to edit
    const expense = expenses.find(exp => exp.id === id);
    if (!expense) return;

    // Populate the form
    amountInput.value = expense.amount;
    categoryInput.value = expense.category;
    dateInput.value = expense.date;
    descriptionInput.value = expense.description;
    expenseIdInput.value = expense.id;

    // Switch to edit mode UI
    formTitle.innerText = "Edit Expense";
    submitBtn.innerText = "Save Changes";
    cancelEditBtn.classList.remove('hidden');

    // Scroll back to form just in case it's offscreen on mobile
    form.scrollIntoView({ behavior: 'smooth' });
}

function resetFormState() {
    formTitle.innerText = "Add New Expense";
    submitBtn.innerText = "Add Expense";
    cancelEditBtn.classList.add('hidden');
    expenseIdInput.value = '';
    form.reset();
}

// ==========================================
// Filtering, Sorting, and Searching
// ==========================================
function getProcessedExpenses() {
    let processed = [...expenses];

    // Search Filter
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm !== '') {
        processed = processed.filter(exp => 
            exp.description.toLowerCase().includes(searchTerm)
        );
    }

    // Category Filter
    const selectedCategory = filterCategory.value;
    if (selectedCategory !== 'All') {
        processed = processed.filter(exp => exp.category === selectedCategory);
    }

    // Sorting
    const sortVal = sortConfig.value;
    processed.sort((a, b) => {
        if (sortVal === 'date-desc') {
            return new Date(b.date) - new Date(a.date);
        } else if (sortVal === 'date-asc') {
            return new Date(a.date) - new Date(b.date);
        } else if (sortVal === 'amount-desc') {
            return b.amount - a.amount;
        } else if (sortVal === 'amount-asc') {
            return a.amount - b.amount;
        }
        return 0; // fallback
    });

    return processed;
}

// ==========================================
// Rendering and Updation
// ==========================================
function updateDashboard(processedExpenses) {
    // Update Totals
    const total = processedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    totalAmountDisplay.innerText = formatCurrency(total);
    
    // Update Monthly
    const monthlyTotal = getMonthlyTotal(processedExpenses);
    monthlyTotalDisplay.innerText = formatCurrency(monthlyTotal);
}

function updateChart() {
    // We want the chart to reflect ALL expenses conceptually, or just the currently filtered.
    // Tracking current filter is usually better for analytics
    const expensesForChart = getProcessedExpenses();
    
    // Compute totals per category
    const categoryTotals = {};
    expensesForChart.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    const categories = Object.keys(categoryTotals);
    const amounts = Object.values(categoryTotals);

    // Dynamic text color based on theme
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f8fafc' : '#111827';

    if (categories.length === 0) {
        // If no data, empty out the chart
        if (categoryChartInstance) {
            categoryChartInstance.destroy();
            categoryChartInstance = null;
        }
        return;
    }

    const data = {
        labels: categories,
        datasets: [{
            data: amounts,
            backgroundColor: categories.map(cat => categoryColors[cat] || '#888'),
            borderWidth: 1,
            borderColor: isDark ? '#1e293b' : '#ffffff'
        }]
    };

    const config = {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: textColor
                    }
                }
            }
        }
    };

    if (categoryChartInstance) {
        // Update existing chart
        categoryChartInstance.data = data;
        categoryChartInstance.options.plugins.legend.labels.color = textColor;
        categoryChartInstance.update();
    } else {
        // Create new chart
        const ctx = document.getElementById('categoryChart').getContext('2d');
        categoryChartInstance = new Chart(ctx, config);
    }
}

function renderList(processedExpenses) {
    expenseList.innerHTML = '';
    
    if (processedExpenses.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        
        processedExpenses.forEach(expense => {
            const expenseItem = document.createElement('div');
            expenseItem.classList.add('expense-item');
            
            const iconClass = categoryIcons[expense.category] || 'fa-tag';
            
            expenseItem.innerHTML = `
                <div class="expense-info">
                    <div class="expense-icon">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <div class="expense-details">
                        <h3>${expense.description}</h3>
                        <p>${expense.category} • ${expense.date}</p>
                    </div>
                </div>
                <div class="expense-amount">
                    <span>${formatCurrency(expense.amount)}</span>
                    <div class="expense-actions">
                        <button class="icon-btn btn-edit" onclick="editExpense('${expense.id}')" title="Edit">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="icon-btn btn-delete" onclick="deleteExpense('${expense.id}')" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            expenseList.appendChild(expenseItem);
        });
    }
}

function refreshView() {
    const listToRender = getProcessedExpenses();
    renderList(listToRender);
    updateDashboard(listToRender);
    updateChart();
}

// ==========================================
// Event Listeners Initialization
// ==========================================
form.addEventListener('submit', addExpense);
cancelEditBtn.addEventListener('click', resetFormState);
searchInput.addEventListener('input', refreshView);
filterCategory.addEventListener('change', refreshView);
sortConfig.addEventListener('change', refreshView);

// Set default date to today for the form
dateInput.valueAsDate = new Date();

// Initialize App
initTheme();
refreshView();
