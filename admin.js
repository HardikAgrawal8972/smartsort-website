/* ============================================
   SmartSort — Admin Dashboard Logic
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // ADMIN PASSWORD
    // ==========================================
    // TODO: Replace with proper Firebase Authentication
    // For production, use Firebase Auth admin claims:
    //   import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
    //   const auth = getAuth();
    //   signInWithEmailAndPassword(auth, email, password);
    const ADMIN_PASSWORD = 'smartsort2024';

    const STORAGE_KEY = 'smartsort_submissions';
    const AUTH_KEY = 'smartsort_admin_auth';

    // ==========================================
    // DOM ELEMENTS
    // ==========================================
    const loginSection = document.getElementById('adminLogin');
    const dashboardSection = document.getElementById('adminDashboard');
    const adminPasswordInput = document.getElementById('adminPassword');
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');

    // ==========================================
    // AUTH STATE
    // ==========================================

    function isAuthenticated() {
        return sessionStorage.getItem(AUTH_KEY) === 'true';
    }

    function login() {
        sessionStorage.setItem(AUTH_KEY, 'true');
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        loadDashboard();
    }

    function logout() {
        sessionStorage.removeItem(AUTH_KEY);
        loginSection.style.display = 'block';
        dashboardSection.style.display = 'none';
        adminPasswordInput.value = '';
        loginError.textContent = '';
    }

    // Check if already authenticated
    if (isAuthenticated()) {
        login();
    }

    // Login handler
    adminLoginBtn.addEventListener('click', () => {
        const password = adminPasswordInput.value.trim();
        if (password === ADMIN_PASSWORD) {
            loginError.textContent = '';
            login();
        } else {
            loginError.textContent = 'Incorrect password. Please try again.';
            adminPasswordInput.classList.add('shake');
            setTimeout(() => adminPasswordInput.classList.remove('shake'), 500);
        }
    });

    // Enter key login
    adminPasswordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') adminLoginBtn.click();
    });

    // Logout
    logoutBtn.addEventListener('click', logout);

    // ==========================================
    // DATA FUNCTIONS
    // ==========================================

    function getSubmissions() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    let currentFilters = {
        dateFrom: '',
        dateTo: '',
        deviceType: '',
        city: '',
        condition: ''
    };

    function applyFilters(submissions) {
        return submissions.filter(sub => {
            const subDate = new Date(sub.timestamp);

            if (currentFilters.dateFrom) {
                const from = new Date(currentFilters.dateFrom);
                if (subDate < from) return false;
            }

            if (currentFilters.dateTo) {
                const to = new Date(currentFilters.dateTo);
                to.setHours(23, 59, 59, 999);
                if (subDate > to) return false;
            }

            if (currentFilters.deviceType && sub.deviceType !== currentFilters.deviceType) return false;
            if (currentFilters.city && sub.city !== currentFilters.city) return false;
            if (currentFilters.condition && sub.condition !== currentFilters.condition) return false;

            return true;
        });
    }

    // ==========================================
    // DASHBOARD RENDER
    // ==========================================

    function loadDashboard() {
        const allSubmissions = getSubmissions();
        const filteredSubmissions = applyFilters(allSubmissions);

        renderStats(filteredSubmissions);
        renderTable(filteredSubmissions);
    }

    function renderStats(submissions) {
        const totalSubmissions = submissions.length;
        const totalWeightG = submissions.reduce((sum, s) => sum + (s.weight || 0), 0);
        const totalWeightKg = (totalWeightG / 1000).toFixed(2);
        const totalCO2 = submissions.reduce((sum, s) => sum + (s.co2Offset || 0), 0).toFixed(2);

        // Most common device type
        const deviceCounts = {};
        submissions.forEach(s => {
            deviceCounts[s.deviceType] = (deviceCounts[s.deviceType] || 0) + 1;
        });
        const mostCommon = Object.keys(deviceCounts).length > 0
            ? Object.entries(deviceCounts).sort((a, b) => b[1] - a[1])[0][0]
            : '—';

        document.getElementById('statTotalSubmissions').textContent = totalSubmissions;
        document.getElementById('statTotalWeight').textContent = totalWeightKg + ' kg';
        document.getElementById('statTotalCO2').textContent = totalCO2 + ' kg';
        document.getElementById('statMostCommon').textContent = mostCommon;
    }

    function renderTable(submissions) {
        const tableBody = document.getElementById('tableBody');
        const emptyState = document.getElementById('emptyState');
        const table = document.getElementById('submissionsTable');

        if (submissions.length === 0) {
            table.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }

        table.style.display = 'table';
        emptyState.style.display = 'none';

        // Sort by timestamp descending (newest first)
        const sorted = [...submissions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        tableBody.innerHTML = sorted.map(sub => {
            const date = new Date(sub.timestamp);
            const dateStr = date.toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric'
            });
            const timeStr = date.toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', hour12: true
            });

            const conditionClass = sub.condition === 'Working' ? 'badge--green'
                : sub.condition === 'Partially Working' ? 'badge--yellow'
                    : 'badge--red';

            const binClass = sub.binAssignment === 'Reuse' ? 'badge--green'
                : sub.binAssignment === 'Refurbish' ? 'badge--yellow'
                    : 'badge--teal';

            return `
        <tr>
          <td><span class="table-id">${sub.id}</span></td>
          <td>
            <div class="table-date">${dateStr}</div>
            <div class="table-time">${timeStr}</div>
          </td>
          <td>${escapeHtml(sub.fullName)}</td>
          <td>${escapeHtml(sub.phone)}</td>
          <td><span class="table-badge badge--outline">${escapeHtml(sub.city)}</span></td>
          <td>${escapeHtml(sub.deviceType)}</td>
          <td>${escapeHtml(sub.brand)}</td>
          <td>${sub.weight}g</td>
          <td><span class="table-badge ${conditionClass}">${sub.condition}</span></td>
          <td><span class="table-badge ${binClass}">${sub.binAssignment}</span></td>
          <td>${sub.co2Offset}</td>
          <td>${sub.rewardPoints}</td>
        </tr>
      `;
        }).join('');
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    // ==========================================
    // FILTERS
    // ==========================================

    document.getElementById('applyFilters').addEventListener('click', () => {
        currentFilters = {
            dateFrom: document.getElementById('filterDateFrom').value,
            dateTo: document.getElementById('filterDateTo').value,
            deviceType: document.getElementById('filterDeviceType').value,
            city: document.getElementById('filterCity').value,
            condition: document.getElementById('filterCondition').value
        };
        loadDashboard();
    });

    document.getElementById('clearFilters').addEventListener('click', () => {
        document.getElementById('filterDateFrom').value = '';
        document.getElementById('filterDateTo').value = '';
        document.getElementById('filterDeviceType').value = '';
        document.getElementById('filterCity').value = '';
        document.getElementById('filterCondition').value = '';
        currentFilters = { dateFrom: '', dateTo: '', deviceType: '', city: '', condition: '' };
        loadDashboard();
    });

    // ==========================================
    // REFRESH
    // ==========================================

    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadDashboard();
        const btn = document.getElementById('refreshBtn');
        btn.innerHTML = '<i class="ph-bold ph-check"></i> Refreshed';
        setTimeout(() => {
            btn.innerHTML = '<i class="ph-bold ph-arrows-clockwise"></i> Refresh';
        }, 1500);
    });

    // ==========================================
    // CSV EXPORT
    // ==========================================

    document.getElementById('exportCSVBtn').addEventListener('click', () => {
        const submissions = applyFilters(getSubmissions());

        if (submissions.length === 0) {
            alert('No submissions to export.');
            return;
        }

        const headers = [
            'Submission ID', 'Date/Time', 'Name', 'Phone', 'Email', 'City',
            'Device Type', 'Brand', 'Weight (g)', 'Condition', 'Bin Assignment',
            'CO₂ Offset (kg)', 'Reward Points'
        ];

        const rows = submissions.map(s => [
            s.id,
            new Date(s.timestamp).toLocaleString('en-IN'),
            s.fullName,
            s.phone,
            s.email,
            s.city,
            s.deviceType,
            s.brand,
            s.weight,
            s.condition,
            s.binAssignment,
            s.co2Offset,
            s.rewardPoints
        ]);

        let csvContent = headers.join(',') + '\n';
        rows.forEach(row => {
            csvContent += row.map(val => {
                const str = String(val).replace(/"/g, '""');
                return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
            }).join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `smartsort_submissions_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    // ==========================================
    // MOBILE NAV TOGGLE
    // ==========================================

    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinks.classList.toggle('open');
            document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinks.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    console.log('🌿 SmartSort — Admin Dashboard loaded.');
});
