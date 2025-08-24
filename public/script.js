// Debug area update function (moved to top level for global access)
// Debug legend function removed
// Global variables
// FIXED EVENT TARGET BUG - Version 2.0 - 2025-08-23 16:00
let outreachLogs = [];

// Global fetch wrapper to include credentials
const fetchWithCredentials = (url, options = {}) => {
    return fetch(url, {
        credentials: 'include',
        ...options
    });
};

// --- Separate Data Format Validation Dialogs ---
function showValidationDialog(type) {
    // Hide all dialogs first
    var proposal = document.getElementById('validationProposalDialog');
    var unvoted = document.getElementById('validationUnvotedDialog');
    var voted = document.getElementById('validationVotedDialog');
    if (proposal) proposal.style.display = 'none';
    if (unvoted) unvoted.style.display = 'none';
    if (voted) voted.style.display = 'none';
    if (type === 'proposal' && proposal) {
        proposal.style.display = 'block';
        document.getElementById('validationProposalResults').innerHTML = '';
        document.getElementById('validationProposalFileInput').value = '';
    } else if (type === 'unvoted' && unvoted) {
        unvoted.style.display = 'block';
        document.getElementById('validationUnvotedResults').innerHTML = '';
        document.getElementById('validationUnvotedFileInput').value = '';
    } else if (type === 'voted' && voted) {
        voted.style.display = 'block';
        document.getElementById('validationVotedResults').innerHTML = '';
        document.getElementById('validationVotedFileInput').value = '';
    }
}
function hideValidationDialog() {
    var proposal = document.getElementById('validationProposalDialog');
    var unvoted = document.getElementById('validationUnvotedDialog');
    var voted = document.getElementById('validationVotedDialog');
    if (proposal) proposal.style.display = 'none';
    if (unvoted) unvoted.style.display = 'none';
    if (voted) voted.style.display = 'none';
}

// Attach validation button listeners after DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    var btnProposal = document.getElementById('btnValidateProposal');
    var btnUnvoted = document.getElementById('btnValidateUnvoted');
    var btnVoted = document.getElementById('btnValidateVoted');
    if (btnProposal) btnProposal.addEventListener('click', function() { showValidationDialog('proposal'); });
    if (btnUnvoted) btnUnvoted.addEventListener('click', function() { showValidationDialog('unvoted'); });
    if (btnVoted) btnVoted.addEventListener('click', function() { showValidationDialog('voted'); });
});
async function runProposalValidation() {
    const fileInput = document.getElementById('validationProposalFileInput');
    const resultsDiv = document.getElementById('validationProposalResults');
    resultsDiv.innerHTML = '';
    if (!fileInput.files || !fileInput.files[0]) {
        resultsDiv.innerHTML = '<div class="alert alert-warning">Please select a file to validate.</div>';
        return;
    }
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    resultsDiv.innerHTML = '<div class="text-info">Validating, please wait...</div>';
    try {
        const resp = await fetch(`/api/validate-import?type=proposal`, {
            method: 'POST',
            body: formData
        });
        const data = await resp.json();
        if (data.valid) {
            resultsDiv.innerHTML = '<div class="alert alert-success">✅ Format is valid and can be ingested into MySQL.</div>';
        } else {
            let html = '<div class="alert alert-danger"><b>❌ Format errors detected:</b><ul>';
            (data.errors || []).forEach(e => { html += `<li>${escapeHtml(e)}</li>`; });
            html += '</ul></div>';
            resultsDiv.innerHTML = html;
        }
    } catch (e) {
        resultsDiv.innerHTML = `<div class="alert alert-danger">Validation failed: ${escapeHtml(e.message)}</div>`;
    }
}
async function runUnvotedValidation() {
    const fileInput = document.getElementById('validationUnvotedFileInput');
    const resultsDiv = document.getElementById('validationUnvotedResults');
    resultsDiv.innerHTML = '';
    if (!fileInput.files || !fileInput.files[0]) {
        resultsDiv.innerHTML = '<div class="alert alert-warning">Please select a file to validate.</div>';
        return;
    }
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    resultsDiv.innerHTML = '<div class="text-info">Validating, please wait...</div>';
    try {
        const resp = await fetch(`/api/validate-import?type=unvoted`, {
            method: 'POST',
            body: formData
        });
        const data = await resp.json();
        if (data.valid) {
            resultsDiv.innerHTML = '<div class="alert alert-success">✅ Format is valid and can be ingested into MySQL.</div>';
        } else {
            let html = '<div class="alert alert-danger"><b>❌ Format errors detected:</b><ul>';
            (data.errors || []).forEach(e => { html += `<li>${escapeHtml(e)}</li>`; });
            html += '</ul></div>';
            resultsDiv.innerHTML = html;
        }
    } catch (e) {
        resultsDiv.innerHTML = `<div class="alert alert-danger">Validation failed: ${escapeHtml(e.message)}</div>`;
    }
}
async function runVotedValidation() {
    const fileInput = document.getElementById('validationVotedFileInput');
    const resultsDiv = document.getElementById('validationVotedResults');
    resultsDiv.innerHTML = '';
    if (!fileInput.files || !fileInput.files[0]) {
        resultsDiv.innerHTML = '<div class="alert alert-warning">Please select a file to validate.</div>';
        return;
    }
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    resultsDiv.innerHTML = '<div class="text-info">Validating, please wait...</div>';
    try {
        const resp = await fetch(`/api/validate-import?type=voted`, {
            method: 'POST',
            body: formData
        });
        const data = await resp.json();
        if (data.valid) {
            resultsDiv.innerHTML = '<div class="alert alert-success">✅ Format is valid and can be ingested into MySQL.</div>';
        } else {
            let html = '<div class="alert alert-danger"><b>❌ Format errors detected:</b><ul>';
            (data.errors || []).forEach(e => { html += `<li>${escapeHtml(e)}</li>`; });
            html += '</ul></div>';
            resultsDiv.innerHTML = html;
        }
    } catch (e) {
        resultsDiv.innerHTML = `<div class="alert alert-danger">Validation failed: ${escapeHtml(e.message)}</div>`;
    }
}

// API URL base
const API_BASE = '';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOMContentLoaded: Starting initialization... ===');
    
    // Add a small delay to ensure DOM is fully ready
    setTimeout(function() {
        console.log('=== Delayed initialization starting... ===');
        
        // Load dashboard data
        loadDashboardData();
        
        // Also try a direct approach as backup
        setTimeout(function() {
            console.log('=== Backup approach - direct DOM update ===');
            // Direct API call and DOM update as backup
            fetch('/api/dashboard')
                .then(response => response.json())
                .then(data => {
                    console.log('Backup: Data received', data);
                    const elements = {
                        'totalProposals': data.totalProposals,
                        'votedAccounts': data.votedAccounts,
                        'unvotedAccounts': data.unvotedAccounts
                    };
                    
                    for (const [id, value] of Object.entries(elements)) {
                        const element = document.getElementById(id);
                        if (element && element.textContent === '-') {
                            element.textContent = value || 0;
                            console.log('Backup: Updated', id, 'to', value);
                        }
                    }
                })
                .catch(error => console.error('Backup approach failed:', error));
        }, 2000);
        
        // Try to load outreach logs if function exists
        if (typeof loadOutreachLogs === 'function') {
            loadOutreachLogs();
        } else {
            console.log('loadOutreachLogs function not found, skipping...');
        }
        
        // Set current date as default for contact date (if element exists)
        const contactDateElement = document.getElementById('contactDateInput');
        if (contactDateElement) {
            contactDateElement.valueAsDate = new Date();
        } else {
            console.log('contactDateInput element not found, skipping date setup...');
        }
        
        // Setup import form (if function exists)
        if (typeof setupImportForm === 'function') {
            setupImportForm();
        } else {
            console.log('setupImportForm function not found, skipping...');
        }
        
        console.log('=== Initialization complete ===');
    }, 100); // 100ms delay
});

// Navigation functions
function showSection(sectionName, event = null) {
    console.log('=== showSection called with:', sectionName, 'event:', event, '===');
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    document.getElementById(sectionName + '-section').style.display = 'block';
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    // Only add 'active' if event and event.target exist
    if (event && event.target && typeof event.target.classList !== 'undefined') {
        event.target.classList.add('active');
    }
    
    // Load section-specific data
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'proposals':
            loadProposalsData();
            break;
        case 'accounts':
            // Reset any previously selected unvoted account selections on entering Accounts view
            try {
                if (typeof window !== 'undefined') window.selectedUnvotedProposalAccountIds = [];
            } catch (e) { /* noop */ }
            break;
        case 'outreach':
            loadOutreachLogs();
            break;
        case 'outreach-accounts':
            loadOutreachAccounts();
            break;
        case 'admin':
            if (!isAdminAuthenticated) {
                showAlert('Admin authentication required', 'warning');
                showSection('dashboard', null);
                return;
            }
            // Admin section loaded, no specific data loading needed
            break;
    }
}

// Dashboard functions
async function loadDashboardData() {
    console.log('=== loadDashboardData: Starting... ===');
    try {
        console.log('loadDashboardData: Making fetch request...');
        const response = await fetchWithCredentials(`${API_BASE}/api/dashboard`);
        console.log('loadDashboardData: Response received', response.status, response.ok);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('loadDashboardData: Data received', data);
        
        // Get elements
        const totalProposalsElement = document.getElementById('totalProposals');
        const votedAccountsElement = document.getElementById('votedAccounts');  
        const unvotedAccountsElement = document.getElementById('unvotedAccounts');

        console.log('loadDashboardData: Elements found:', {
            totalProposals: totalProposalsElement ? 'YES' : 'NO',
            votedAccounts: votedAccountsElement ? 'YES' : 'NO',
            unvotedAccounts: unvotedAccountsElement ? 'YES' : 'NO'
        });

        // Update elements
        if (totalProposalsElement) {
            totalProposalsElement.textContent = data.totalProposals || 0;
            console.log('Updated totalProposals to:', data.totalProposals);
        }
        if (votedAccountsElement) {
            votedAccountsElement.textContent = data.votedAccounts || 0;
            console.log('Updated votedAccounts to:', data.votedAccounts);
        }
        if (unvotedAccountsElement) {
            unvotedAccountsElement.textContent = data.unvotedAccounts || 0;
            console.log('Updated unvotedAccounts to:', data.unvotedAccounts);
        }

        console.log('=== loadDashboardData: Complete ===');
        
    } catch (error) {
        console.error('=== loadDashboardData: ERROR ===', error);
        console.error('Error details:', error.message, error.stack);
        // Comment out showAlert temporarily to avoid potential issues
        // showAlert('Error loading dashboard data', 'danger');
        alert('Error loading dashboard data: ' + error.message);
    }
}

// Proposals functions
let proposals = [];
let currentProposalsPage = 1;
let totalProposalsPages = 1;
let proposalsSortState = { field: null, dir: 'asc' };

function showProposalsSection() {
    console.log('showProposalsSection called');
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show proposals section
    const proposalsSection = document.getElementById('proposals-section');
    console.log('proposals-section element found:', !!proposalsSection);
    if (proposalsSection) {
        proposalsSection.style.display = 'block';
        console.log('proposals-section displayed');
        
        // Load proposals data if function exists
        if (typeof loadProposalsTable === 'function') {
            loadProposalsTable();
        } else {
            console.log('loadProposalsTable function not found');
        }
    } else {
        console.error('proposals-section element not found');
    }
}

async function loadProposalsData() {
    try {
        console.log('Loading proposals data...');
        
        // Update summary cards
        const dashboardResponse = await fetch(`${API_BASE}/api/dashboard`);
        const dashboardData = await dashboardResponse.json();
        
        console.log('Dashboard data loaded:', dashboardData);
        
        document.getElementById('totalProposalsDetail').textContent = dashboardData.totalProposals || 0;
        document.getElementById('correctPredictions').textContent = dashboardData.correctPredictions || 0;
        document.getElementById('approvedProposals').textContent = dashboardData.approvedProposals || 0;
        
        // Calculate accuracy rate
        const accuracy = dashboardData.totalProposals > 0 ? 
            ((dashboardData.correctPredictions / dashboardData.totalProposals) * 100).toFixed(1) : 0;
        document.getElementById('accuracyRate').textContent = accuracy + '%';
        
        console.log('Loading proposals table...');
        // Load proposals table
        await loadProposalsTable();
        
        console.log('Proposals data loaded successfully');
        
    } catch (error) {
        console.error('Error loading proposals data:', error);
        showAlert('Error loading proposals data', 'danger');
    }
}

async function loadProposalsTable() {
    try {
        console.log('Loading proposals table...');
        
        let url = `${API_BASE}/api/proposals?page=${currentProposalsPage}&limit=50`;
        
        console.log('Fetching proposals from:', url);
        
        const response = await fetchWithCredentials(url);
        const data = await response.json();
        
        console.log('Proposals response:', data);
        
        proposals = data.proposals;
        totalProposalsPages = data.pagination.total_pages;
        
        // Apply current sorting if any
        applySortingToProposals();
        
        renderProposalsTable();
        renderProposalsPagination(data.pagination);
        
        console.log('Proposals table rendered successfully');
        
    } catch (error) {
        console.error('Error loading proposals table:', error);
        showAlert('Error loading proposals table', 'danger');
    }
}

function renderProposalsTable() {
    console.log('renderProposalsTable called with', proposals.length, 'proposals');
    
    const tbody = document.getElementById('proposalsTableBody');
    
    if (!tbody) {
        console.error('proposalsTableBody element not found!');
        return;
    }
    
    // Initialize sort icons
    const sortableFields = ['id', 'issuer_name', 'category'];
    sortableFields.forEach(f => {
        const iconEl = document.getElementById(`proposals_sort_${f}`);
        if (iconEl) {
            if (proposalsSortState.field === f) {
                iconEl.className = proposalsSortState.dir === 'asc' 
                    ? 'fas fa-sort-up text-primary ms-2' 
                    : 'fas fa-sort-down text-primary ms-2';
            } else {
                iconEl.className = 'fas fa-sort text-muted ms-2';
            }
            iconEl.style.fontSize = '14px';
        }
    });
    
    if (proposals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">No proposals found</td></tr>';
        return;
    }
    
    // Only show succinct fields in the main table
    const succinctFields = [
        { key: 'id', label: 'ID' },
        { key: 'proposal_master_skey', label: 'Proposal Master Key' },
        { key: 'director_master_skey', label: 'Director Master Key' },
        { key: 'issuer_name', label: 'Issuer Name' },
        { key: 'category', label: 'Category' },
        { key: 'prediction_correct', label: 'Prediction Accuracy' },
        { key: 'approved', label: 'Approved Status' },
        { key: 'for_percentage', label: 'For Percentage' },
        { key: 'against_percentage', label: 'Against Percentage' }
    ];
    try {
        tbody.innerHTML = proposals.map(proposal => {
            return `<tr>` +
                succinctFields.map(field => {
                    if (field.key === 'prediction_correct') {
                        return `<td><span class="badge ${proposal.prediction_correct ? 'bg-success' : 'bg-danger'}">${proposal.prediction_correct ? 'Correct' : 'Incorrect'}</span></td>`;
                    } else if (field.key === 'approved') {
                        return `<td><span class="badge ${proposal.approved ? 'bg-success' : 'bg-secondary'}">${proposal.approved ? 'Yes' : 'No'}</span></td>`;
                    } else if (field.key === 'for_percentage' || field.key === 'against_percentage') {
                        const val = proposal[field.key];
                        return `<td>${val !== undefined && val !== null ? (parseFloat(val) * 100).toFixed(2) + '%' : '-'}</td>`;
                    } else if (field.key === 'issuer_name') {
                        return `<td class="text-truncate" style="max-width: 150px;" title="${(proposal.issuer_name || '').replace(/"/g, '&quot;')}">${proposal.issuer_name || '-'}</td>`;
                    } else {
                        return `<td>${proposal[field.key] !== undefined && proposal[field.key] !== null && proposal[field.key] !== '' ? proposal[field.key] : '-'}</td>`;
                    }
                }).join('') +
                `<td>
                    <div class="btn-group" role="group" aria-label="Actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewProposalDetails(${proposal.id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary ms-1" onclick="viewProposalAccounts(${proposal.id})" title="Show Accounts">
                            <i class="fas fa-table"></i>
                        </button>
                    </div>
                </td>` +
            `</tr>`;
        }).join('');
        console.log('Proposals table rendered successfully');
    } catch (error) {
        console.error('Error rendering proposals table:', error);
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-danger">Error rendering table</td></tr>';
    }
}

function renderProposalsPagination(pagination) {
    const paginationContainer = document.getElementById('proposalsPagination');
    
    if (pagination.total_pages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    if (pagination.current_page > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changeProposalsPage(${pagination.current_page - 1})">Previous</a>
            </li>
        `;
    }
    
    // Page numbers
    const startPage = Math.max(1, pagination.current_page - 2);
    const endPage = Math.min(pagination.total_pages, pagination.current_page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === pagination.current_page ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changeProposalsPage(${i})">${i}</a>
            </li>
        `;
    }
    
    // Next button
    if (pagination.current_page < pagination.total_pages) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changeProposalsPage(${pagination.current_page + 1})">Next</a>
            </li>
        `;
    }
    
    paginationContainer.innerHTML = paginationHTML;
}

function changeProposalsPage(page) {
    currentProposalsPage = page;
    loadProposalsTable();
}

// Sorting function for proposals table
function toggleProposalSort(field) {
    // Toggle sort direction if same field, otherwise start with asc
    if (proposalsSortState.field === field) {
        proposalsSortState.dir = proposalsSortState.dir === 'asc' ? 'desc' : 'asc';
    } else {
        proposalsSortState.field = field;
        proposalsSortState.dir = 'asc';
    }

    // Update visual indicators for all sortable columns
    const sortableFields = ['id', 'issuer_name', 'category'];
    sortableFields.forEach(f => {
        const iconEl = document.getElementById(`proposals_sort_${f}`);
        if (iconEl) {
            if (f === field) {
                // Update icon to show current sort direction
                iconEl.className = proposalsSortState.dir === 'asc' 
                    ? 'fas fa-sort-up text-primary ms-2' 
                    : 'fas fa-sort-down text-primary ms-2';
            } else {
                // Reset to default unsorted icon
                iconEl.className = 'fas fa-sort text-muted ms-2';
            }
            iconEl.style.fontSize = '14px';
        }
    });

    // Apply sorting and re-render
    applySortingToProposals();
    renderProposalsTable();
}

// Apply sorting to the proposals array
function applySortingToProposals() {
    if (!proposalsSortState.field || !proposals.length) return;

    proposals.sort((a, b) => {
        let valueA = a[proposalsSortState.field];
        let valueB = b[proposalsSortState.field];

        // Handle null/undefined values
        if (valueA === null || valueA === undefined) valueA = '';
        if (valueB === null || valueB === undefined) valueB = '';

        // Convert to string for comparison (except for ID which should be numeric)
        if (proposalsSortState.field === 'id') {
            valueA = Number(valueA) || 0;
            valueB = Number(valueB) || 0;
        } else {
            valueA = String(valueA).toLowerCase();
            valueB = String(valueB).toLowerCase();
        }

        let comparison = 0;
        if (valueA < valueB) comparison = -1;
        else if (valueA > valueB) comparison = 1;

        return proposalsSortState.dir === 'asc' ? comparison : -comparison;
    });
}

function viewProposalDetails(id) {
    const proposal = proposals.find(p => p.id === id);
    if (!proposal) return;
    
    // Recursively render all fields, including nested objects/arrays
    // Show all fields from the data table, in the correct order, even if missing from the object
    function renderValue(val, key) {
        if (key === 'for_percentage' || key === 'against_percentage' || key === 'abstain_percentage') {
            return (val !== undefined && val !== null && val !== '') ? (parseFloat(val) * 100).toFixed(2) + '%' : 'N/A';
        } else if (typeof val === 'boolean' || val === 0 || val === 1) {
            if (key === 'approved' || key === 'prediction_correct') {
                return val ? 'Yes' : 'No';
            }
        }
        if (val === undefined || val === null || val === '') {
            return 'N/A';
        } else if (Array.isArray(val)) {
            if (val.length === 0) return '[]';
            return '<ul class="mb-0">' + val.map((item, idx) => `<li>${renderValue(item, idx)}</li>`).join('') + '</ul>';
        } else if (typeof val === 'object') {
            const keys = Object.keys(val);
            if (keys.length === 0) return '{}';
            return '<table class="table table-bordered table-sm mb-0"><tbody>' + keys.map(k => `<tr><td class="fw-bold">${k}</td><td>${renderValue(val[k], k)}</td></tr>`).join('') + '</tbody></table>';
        } else {
            return String(val);
        }
    }
    function renderTable(obj) {
        return Object.keys(obj).map(key => `<tr><td class="fw-bold">${key}</td><td>${renderValue(obj[key], key)}</td></tr>`).join('');
    }
    const modalContent = `
        <div class="modal fade" id="proposalDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Proposal Details - ID: ${proposal.id}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="table table-bordered table-sm mb-0">
                                <tbody>
                                    ${renderTable(proposal)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('proposalDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body and show it
    document.body.insertAdjacentHTML('beforeend', modalContent);
    const modal = new bootstrap.Modal(document.getElementById('proposalDetailsModal'));
    modal.show();
}

// Account management functions
function updateSelectedUnvotedSharesLegend() {
    // Sum shares only from the currently checked unvoted account checkboxes in the DOM
    let totalShares = 0;
    const checkedBoxes = document.querySelectorAll('.unvoted-account-checkbox:checked');
    checkedBoxes.forEach(cb => {
        const num = Number(cb.getAttribute('data-shares'));
        if (Number.isFinite(num)) totalShares += num;
    });
    const legend = document.getElementById('dataLegendSelectedShares');
    if (legend) {
        legend.textContent = `Total Shares from Selected Unvoted Accounts: ${totalShares.toLocaleString('en-US', {maximumFractionDigits: 2})}`;
    }
}

// Outreach log functions
async function loadOutreachLogs() {
    try {
        const response = await fetch(`${API_BASE}/api/outreach-logs`);
        outreachLogs = await response.json();
        
        renderOutreachLogsTable();
        
    } catch (error) {
        console.error('Error loading outreach logs:', error);
        showAlert('Error loading outreach logs', 'danger');
    }
}

function renderOutreachLogsTable() {
    const tbody = document.getElementById('outreachLogsTableBody');
    
    if (outreachLogs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-phone"></i>
                        <p>No outreach logs found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = outreachLogs.map(log => `
        <tr>
            <td>${formatDate(log.contact_date)}</td>
            <td>${log.account_id}</td>
            <td>${log.account_name || '-'}</td>
            <td>
                <span class="badge bg-secondary">
                    <i class="fas fa-${getContactMethodIcon(log.contact_method)} me-1"></i>
                    ${log.contact_method}
                </span>
            </td>
            <td>${log.outcome || '-'}</td>
            <td>${log.notes || '-'}</td>
        </tr>
    `).join('');
}

function getContactMethodIcon(method) {
    switch(method) {
        case 'email': return 'envelope';
        case 'phone': return 'phone';
        case 'meeting': return 'users';
        default: return 'comment';
    }
}

function showAddOutreachModal() {
    document.getElementById('outreachForm').reset();
    document.getElementById('contactDateInput').valueAsDate = new Date();
    
    const modal = new bootstrap.Modal(document.getElementById('outreachModal'));
    modal.show();
}

async function saveOutreachLog() {
    const logData = {
        account_id: document.getElementById('outreachAccountId').value,
        contact_method: document.getElementById('contactMethodInput').value,
        contact_date: document.getElementById('contactDateInput').value,
        outcome: document.getElementById('outcomeInput').value,
        notes: document.getElementById('outreachNotesInput').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/outreach-logs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(logData)
        });
        
        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('outreachModal'));
            modal.hide();
            
            showAlert('Outreach log created successfully', 'success');
            loadOutreachLogs();
            
        } else {
            const error = await response.json();
            showAlert('Error saving outreach log: ' + error.error, 'danger');
        }
        
    } catch (error) {
        console.error('Error saving outreach log:', error);
        showAlert('Error saving outreach log', 'danger');
    }
}

// Import functions
function setupImportForm() {
    document.getElementById('importForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        
        if (!file) {
            showAlert('Please select a file to import', 'warning');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            showImportProgress(true);
            
            const response = await fetch(`${API_BASE}/api/upload`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showImportResults(result);
                loadDashboardData();
                fileInput.value = '';
            } else {
                showAlert('Import failed: ' + result.error, 'danger');
            }
            
        } catch (error) {
            console.error('Error importing file:', error);
            showAlert('Error importing file', 'danger');
        } finally {
            showImportProgress(false);
        }
    });
}

// Download example format function
async function downloadExampleFormat(type) {
    try {
        const response = await fetch(`${API_BASE}/api/download-example/${type}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Set appropriate filename based on type
        let filename;
        switch(type) {
            case 'proposal':
                filename = 'example_proposal_data.xlsx';
                break;
            case 'unvoted':
                filename = 'example_unvoted_accounts.csv';
                break;
            case 'voted':
                filename = 'example_voted_accounts.csv';
                break;
            default:
                filename = `example_${type}_data.csv`;
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showAlert(`Downloaded ${filename} successfully`, 'success');
        
    } catch (error) {
        console.error('Error downloading example format:', error);
        showAlert('Error downloading example format: ' + error.message, 'danger');
    }
}

function showImportProgress(show) {
    const progressDiv = document.getElementById('importResults');
    
    if (show) {
        progressDiv.style.display = 'block';
        progressDiv.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Importing...</span>
                </div>
                <p class="mt-2">Importing data, please wait...</p>
            </div>
        `;
    } else {
        if (progressDiv.innerHTML.includes('spinner-border')) {
            progressDiv.style.display = 'none';
        }
    }
}

function showImportResults(result) {
    const resultsDiv = document.getElementById('importResults');
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
        <div class="alert alert-success">
            <h6><i class="fas fa-check-circle me-2"></i>Import Completed</h6>
            <p class="mb-0">${result.message}</p>
            <small>
                <strong>Imported:</strong> ${result.imported} records<br>
                <strong>Errors:</strong> ${result.errors} records
            </small>
        </div>
    `;
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert-dismissible');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at the top of the main container
    const container = document.querySelector('.container-fluid');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv && alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// State to keep track of the currently displayed proposal accounts modal
let currentProposalAccountsState = {
    proposalId: null,
    keyParam: null,
    keyValue: null,
    currentPage: 1,
    limit: 1000
};

// Make it globally accessible
window.currentProposalAccountsState = currentProposalAccountsState;

// enhance state to remember filters
currentProposalAccountsState.filters = currentProposalAccountsState.filters || {
    voted: {},
    unvoted: {}
};

// Global helper function: Robust numeric parser: strips commas/spaces, returns null for empty/non-numeric
function parseNumberRaw(raw) {
    if (raw === undefined || raw === null) return null;
    const s = String(raw).trim().replace(/,/g, '');
    if (s === '') return null;
    const n = Number(s);
    if (!isFinite(n)) return null;
    return n;
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Save original Data Legend content so we can restore it after viewing accounts
let _originalDataLegendHTML = null;
function findDataLegendCardBody() {
    // Always use the #dataLegendCardBody for legend content
    return document.getElementById('dataLegendCardBody');
}

// Initialize original legend HTML on first DOM ready
document.addEventListener('DOMContentLoaded', function() {
    try {
        const cb = findDataLegendCardBody();
        if (cb) _originalDataLegendHTML = cb.innerHTML;
        // Debug legend removed
    } catch (e) {
        console.warn('Could not capture original Data Legend HTML', e);
    }
});

function renderProposalLegendSummary(summary) {
    // Only show summary in account view
    if (window._appView !== 'accounts') return;
    const cb = findDataLegendCardBody();
    if (!cb) return;
    // Debug legend removed
    const forShares = summary.predicted_for_shares !== undefined ? summary.predicted_for_shares : 'N/A';
    const againstShares = summary.predicted_against_shares !== undefined ? summary.predicted_against_shares : 'N/A';
    const unvotedShares = summary.predicted_unvoted_shares !== undefined ? summary.predicted_unvoted_shares : 'N/A';

    // Calculate additional shares needed if Against > For
    let additionalSharesNeeded = '';
    if (forShares !== 'N/A' && againstShares !== 'N/A') {
        const forNum = parseFloat(String(forShares).replace(/,/g, ''));
        const againstNum = parseFloat(String(againstShares).replace(/,/g, ''));
        if (!isNaN(forNum) && !isNaN(againstNum) && againstNum > forNum) {
            const needed = againstNum - forNum;
            const formattedNeeded = needed.toLocaleString('en-US', {maximumFractionDigits: 2});
            additionalSharesNeeded = `<li><strong style="color: red; font-weight: bold;">Need additional shares to Pass the Proposal: ${formattedNeeded}</strong></li>`;
        }
    }

    cb.innerHTML = `
        <h6><i class="fas fa-info-circle me-2"></i>Proposal Predicted Share Summary</h6>
        <div class="row">
            <div class="col-12">
                <ul class="list-unstyled ms-3 mb-0">
                    <li><strong>Predicted For Shares:</strong> ${escapeHtml(String(forShares))}</li>
                    <li><strong>Predicted Against Shares:</strong> ${escapeHtml(String(againstShares))}</li>
                    <li><strong>Predicted Unvoted Shares:</strong> ${escapeHtml(String(unvotedShares))}</li>
                    ${additionalSharesNeeded}
                    <li id="dataLegendSelectedShares" style="margin-top:6px;"></li>
                </ul>
            </div>
        </div>
    `;
    // Initialize legend sum at 0 until selections are made
    if (window._appView === 'accounts' && typeof window.updateSelectedUnvotedProposalSharesLegend === 'function') {
        window.updateSelectedUnvotedProposalSharesLegend();
    }
}

function restoreOriginalProposalLegend() {
    // Only show legend in proposals view
    if (window._appView !== 'proposals') return;
    const cb = findDataLegendCardBody();
    if (!cb) return;
    if (_originalDataLegendHTML !== null) cb.innerHTML = _originalDataLegendHTML;
    // Debug legend removed
}

function returnToProposalView() {
    window._appView = 'proposals';
    // Hide inline container and show proposals section
    const container = document.getElementById('proposalAccountsContainer');
    if (container) container.style.display = 'none';
    // Restore proposals table/card
    const proposalsCard = document.getElementById('proposalsCard');
    if (proposalsCard) proposalsCard.style.display = 'block';
    // Restore Data Legend for proposals view
    restoreOriginalProposalLegend();
    // Debug legend removed
    // Refresh proposals table to ensure data is visible and legend is not overwritten
    loadProposalsTable();
    // After table loads, update legend and debug area again in case DOM changed
    setTimeout(function() {
        restoreOriginalProposalLegend();
        // Debug legend removed
    }, 400);
}

// Debug legend function removed

// In renderProposalAccountsInline, set _appView = 'accounts' at the start
const orig_renderProposalAccountsInline = renderProposalAccountsInline;
renderProposalAccountsInline = function(proposal, data) {
    window._appView = 'accounts';
    orig_renderProposalAccountsInline(proposal, data);
};

// Proposal accounts functions
async function viewProposalAccounts(id, page = 1) {
    console.log('=== viewProposalAccounts called with id:', id, 'page:', page, '===');
    
    // permissive equality to handle string vs number ids
    const proposal = proposals.find(p => p.id == id);
    console.log('Found proposal:', proposal);
    console.log('Available proposals count:', proposals.length);
    
    if (!proposal) {
        console.error('Proposal not found for id:', id, 'available proposals:', proposals.slice(0,5));
        showAlert('Proposal not found', 'danger');
        return;
    }

    console.log('Proposal details:', {
        id: proposal.id,
        proposal_master_skey: proposal.proposal_master_skey,
        director_master_skey: proposal.director_master_skey
    });

    // Ensure no unvoted proposal account rows are preselected on first load
    if (typeof window !== 'undefined') {
        window.selectedUnvotedProposalAccountIds = [];
        window.selectedUnvotedProposalRowKeys = new Set();
    }

    // determine which key to use
    let params = new URLSearchParams();
    if (proposal.proposal_master_skey !== undefined && proposal.proposal_master_skey !== null && proposal.proposal_master_skey !== -1 && proposal.proposal_master_skey !== 'NULL') {
        params.append('proposal_master_skey', String(proposal.proposal_master_skey));
        currentProposalAccountsState.keyParam = 'proposal_master_skey';
        currentProposalAccountsState.keyValue = proposal.proposal_master_skey;
    } else if (proposal.director_master_skey !== undefined && proposal.director_master_skey !== null && proposal.director_master_skey !== -1 && proposal.director_master_skey !== 'NULL') {
        params.append('director_master_skey', String(proposal.director_master_skey));
        currentProposalAccountsState.keyParam = 'director_master_skey';
        currentProposalAccountsState.keyValue = proposal.director_master_skey;
    } else {
        showAlert('No valid proposal or director key available for this proposal', 'warning');
        return;
    }

    currentProposalAccountsState.proposalId = id;
    currentProposalAccountsState.currentPage = page;
    const pageSizeSelect = document.getElementById('proposalAccountsPageSize');
    const limit = pageSizeSelect ? parseInt(pageSizeSelect.value, 10) : currentProposalAccountsState.limit || 1000;
    currentProposalAccountsState.limit = limit;

    // Support separate pagination for voted and unvoted accounts
    const votedPage = currentProposalAccountsState.votedPage || page;
    const unvotedPage = currentProposalAccountsState.unvotedPage || page;
    
    params.append('voted_page', String(votedPage));
    params.append('unvoted_page', String(unvotedPage));
    params.append('limit', String(limit));

    // include persisted filters in the query string so server can apply them if implemented server-side later
    const f = currentProposalAccountsState.filters || {};
    if (f.voted) {
        Object.keys(f.voted).forEach(k => {
            if (f.voted[k] !== undefined && f.voted[k] !== null && f.voted[k] !== '') params.append(`voted_${k}`, String(f.voted[k]));
        });
    }
    if (f.unvoted) {
        Object.keys(f.unvoted).forEach(k => {
            if (f.unvoted[k] !== undefined && f.unvoted[k] !== null && f.unvoted[k] !== '') params.append(`unvoted_${k}`, String(f.unvoted[k]));
        });
    }

    const url = `${API_BASE}/api/proposal-accounts?` + params.toString();
    console.log('=== Making API request ===');
    console.log('URL:', url);
    console.log('Parameters:', params.toString());

    try {
        const resp = await fetch(url);
        console.log('API Response status:', resp.status, resp.ok);
        const container = document.getElementById('proposalAccountsContainer');
        if (!resp.ok) {
            let errText;
            try {
                const maybeJson = await resp.json();
                errText = maybeJson.error || JSON.stringify(maybeJson);
            } catch (e) {
                errText = await resp.text();
            }
            console.error('Server returned error for proposal accounts:', resp.status, errText);
            if (container) {
                container.style.display = 'block';
                document.getElementById('proposalAccountsContent').innerHTML = `<div class="alert alert-danger">Error fetching proposal accounts: ${escapeHtml(errText)}</div>`;
            }
            showAlert(`Error fetching proposal accounts: ${escapeHtml(errText)}`, 'danger');
            return;
        }
        const data = await resp.json();
        console.log('=== API Response received ===');
        console.log('Voted accounts count:', data.voted ? data.voted.length : 'undefined');
        console.log('Unvoted accounts count:', data.unvoted ? data.unvoted.length : 'undefined');
        console.log('Pagination:', data.pagination);
        // store raw arrays for client-side filtering/sorting
        currentProposalAccountsState.rawVoted = Array.isArray(data.voted) ? data.voted : [];
        currentProposalAccountsState.rawUnvoted = Array.isArray(data.unvoted) ? data.unvoted : [];
        currentProposalAccountsState.pagination = data.pagination || {};
        currentProposalAccountsState.totals = data.totals || {};
        
        // Auto-select accounts that are already in outreach table (UNVOTED ACCOUNTS ONLY)
        if (Array.isArray(data.unvoted)) {
            data.unvoted.forEach((row, idx) => {
                if (row.in_outreach === true) {
                    // Build the same row key as used in checkbox creation
                    const keyRaw = (row.account_id !== undefined && row.account_id !== null && row.account_id !== '')
                        ? `acc_${row.account_id}`
                        : ((row.account_hash_key !== undefined && row.account_hash_key !== null && row.account_hash_key !== '')
                            ? `hash_${row.account_hash_key}`
                            : `idx_${idx}`);
                    const rowKey = String(keyRaw).replace(/[^a-zA-Z0-9_.:\-]/g, '_');
                    
                    // Add to selected set
                    if (!window.selectedUnvotedProposalRowKeys) {
                        window.selectedUnvotedProposalRowKeys = new Set();
                    }
                    window.selectedUnvotedProposalRowKeys.add(rowKey);
                }
            });
        }
        // If no accounts, show a message
        if ((!data.voted || data.voted.length === 0) && (!data.unvoted || data.unvoted.length === 0)) {
            if (container) {
                container.style.display = 'block';
                document.getElementById('proposalAccountsContent').innerHTML = `<div class="alert alert-warning">No accounts found for this proposal.</div>`;
            }
        } else {
            renderProposalAccountsModal(proposal, data);
        }
    } catch (err) {
        console.error('Error fetching proposal accounts (exception):', err);
        const container = document.getElementById('proposalAccountsContainer');
        if (container) {
            container.style.display = 'block';
            document.getElementById('proposalAccountsContent').innerHTML = `<div class="alert alert-danger">Error fetching proposal accounts: ${escapeHtml(err.message || err)}</div>`;
        }
        showAlert('Error fetching proposal accounts: ' + (err.message || err), 'danger');
    }
}

// Setup page size change handler
function setupPageSizeHandler() {
    const pageSizeSelect = document.getElementById('proposalAccountsPageSize');
    if (pageSizeSelect && !pageSizeSelect.hasPageSizeListener) {
        pageSizeSelect.addEventListener('change', function() {
            const newLimit = parseInt(this.value, 10);
            console.log('Page size changed to:', newLimit);
            
            // Update the current state
            if (currentProposalAccountsState) {
                currentProposalAccountsState.limit = newLimit;
                // Reset to page 1 when changing page size
                currentProposalAccountsState.votedPage = 1;
                currentProposalAccountsState.unvotedPage = 1;
                
                // Refetch data with new page size
                if (currentProposalAccountsState.proposalId) {
                    viewProposalAccounts(currentProposalAccountsState.proposalId, 1);
                }
            }
        });
        pageSizeSelect.hasPageSizeListener = true;
    }
}

function renderProposalAccountsModal(proposal, data) {
    // keep original modal function name but render inline instead
    renderProposalAccountsInline(proposal, data);
}

function renderProposalAccountsInline(proposal, data) {
    // Minimal, production-ready rendering for proposal accounts (no debug output)
    // Update debug legend area after entering accounts view
    // Debug legend removed
    // Defensive: only proceed if data is valid
    if (!data || (!Array.isArray(data.voted) && !Array.isArray(data.unvoted))) {
        const content = document.getElementById('proposalAccountsContent');
        if (content) {
            content.innerHTML = `<div class="alert alert-danger">Error: Malformed or empty data received from server.</div>`;
        }
        return;
    }

    const voted = Array.isArray(data.voted) ? data.voted : [];
    const unvoted = Array.isArray(data.unvoted) ? data.unvoted : [];

    const votedKeys = voted.length ? Object.keys(voted[0]) : [];
    const unvotedKeys = unvoted.length ? Object.keys(unvoted[0]) : [];
    const allHeaders = Array.from(new Set([...votedKeys, ...unvotedKeys]));
    const commonExclusions = ['row_index', 'unnamed_col', 'created_at', 'id'];
    // Show score_model2 / prediction_model2 for VOTED accounts
    // and score_model1 / prediction_model1 for UNVOTED accounts.
    // Include the new columns: account_hash_key and Target_encoded
    const votedExclusions = [...commonExclusions, 'score_model1', 'prediction_model1', 'in_outreach'];
    const unvotedExclusions = [...commonExclusions, 'score_model2', 'prediction_model2'];

    const votedHeaders = allHeaders.filter(h => !votedExclusions.includes(h));
    // For unvoted headers, move Target_encoded to the rightmost position
    const unvotedHeadersFiltered = allHeaders.filter(h => !unvotedExclusions.includes(h));
    const unvotedHeaders = unvotedHeadersFiltered.filter(h => h !== 'Target_encoded');
    if (unvotedHeadersFiltered.includes('Target_encoded')) {
        unvotedHeaders.push('Target_encoded');
    }

    // Defensive: produce rows that only contain allowed headers
    function filterRow(row, headers) {
        const filtered = {};
        headers.forEach(h => { filtered[h] = row[h]; });
        return filtered;
    }

    function buildTableHTMLFiltered(rows, headers, sidePrefix) {
        const filteredRows = Array.isArray(rows) ? rows.map(row => filterRow(row, headers)) : [];
        return buildTableHTML(filteredRows, headers, sidePrefix);
    }

    const contentElem = document.getElementById('proposalAccountsContent');
    const votedScoreKey = votedHeaders.find(h => h.startsWith('score_model')) || null;
    const unvotedScoreKey = unvotedHeaders.find(h => h.startsWith('score_model')) || null;
    const votedPagination = (data.pagination && data.pagination.voted) ? data.pagination.voted : { total: voted.length, total_pages: 1 };
    const unvotedPagination = (data.pagination && data.pagination.unvoted) ? data.pagination.unvoted : { total: unvoted.length, total_pages: 1 };

    // store raw data in state
    currentProposalAccountsState.rawVoted = voted;
    currentProposalAccountsState.rawUnvoted = unvoted;
    currentProposalAccountsState.pagination = data.pagination || {};

    // Helper to format numbers with commas
    function formatNumberWithCommas(n) {
        if (n === null || n === undefined || Number.isNaN(Number(n))) return 'N/A';
        return Number(n).toLocaleString('en-US', {maximumFractionDigits: 2});
    }

    // --- FORMAL DATA LEGEND AREA: robust, view-bound update logic ---
    if (window._appView === 'accounts') {
        // Only update the Data Legend area after all variables are initialized and data is valid
        const predPriority = ['prediction_model2', 'prediction_model1'];
        let predField = null;
        for (const p of predPriority) {
            if (allHeaders.includes(p)) { predField = p; break; }
        }
        if (!predField) predField = allHeaders.find(h => typeof h === 'string' && h.startsWith && h.startsWith('prediction_model')) || null;

        let predicted_for = 0;
        let predicted_against = 0;
        let predicted_unvoted = 0;
        let computed = false;

        // Use server-provided totals for accurate proposal-level summary
        predicted_unvoted = currentProposalAccountsState.totals && currentProposalAccountsState.totals.unvoted_shares !== undefined 
            ? currentProposalAccountsState.totals.unvoted_shares 
            : (unvoted || []).reduce((acc, r) => {
                const v = r && r.shares_summable !== undefined && r.shares_summable !== null ? parseNumberRaw(r.shares_summable) : null;
                return acc + (v === null ? 0 : v);
            }, 0);

        // Use server-provided For/Against totals if available, otherwise calculate from current data
        if (currentProposalAccountsState.totals && 
            currentProposalAccountsState.totals.voted_for_shares !== undefined && 
            currentProposalAccountsState.totals.voted_against_shares !== undefined) {
            predicted_for = currentProposalAccountsState.totals.voted_for_shares;
            predicted_against = currentProposalAccountsState.totals.voted_against_shares;
            computed = true;
        } else if (predField) {
            // Fallback: Calculate For/Against shares from VOTED accounts only (actual votes)
            (voted || []).forEach(r => {
                const s = r && r.shares_summable !== undefined && r.shares_summable !== null ? parseNumberRaw(r.shares_summable) : null;
                const p = r && (r[predField] === 1 || r[predField] === '1' || r[predField] === true) ? 1 : (r && (r[predField] === 0 || r[predField] === '0' || r[predField] === false) ? 0 : null);
                if (s !== null && p === 0) predicted_for += s;  // prediction_model2=0 means "For"
                if (s !== null && p === 1) predicted_against += s;  // prediction_model2=1 means "Against"
            });
            computed = true;
        }

        if (!computed) {
            renderProposalLegendSummary({ predicted_for_shares: 'N/A', predicted_against_shares: 'N/A', predicted_unvoted_shares: formatNumberWithCommas(predicted_unvoted) });
        } else {
            renderProposalLegendSummary({ predicted_for_shares: formatNumberWithCommas(predicted_for), predicted_against_shares: formatNumberWithCommas(predicted_against), predicted_unvoted_shares: formatNumberWithCommas(predicted_unvoted) });
        }
    }

    // Table builder (keeps existing behavior but without debug elements)
    function buildTableHTML(rows, headers, sidePrefix) {
        if (!rows || rows.length === 0) {
            return `<div class="text-center text-muted py-4">No records</div>`;
        }

        // Add checkbox column for unvoted accounts
        let headersWithCheckbox = headers;
        let addCheckbox = false;
        if (sidePrefix === 'unvoted') {
            addCheckbox = true;
            headersWithCheckbox = ['_checkbox', ...headers];
        }

        const filterRowCells = headersWithCheckbox.map(h => {
            if (h === '_checkbox') {
                return '<td></td>';
            }
            if (h === 'account_type') {
                const uniqueValues = [...new Set(currentProposalAccountsState[sidePrefix === 'voted' ? 'rawVoted' : 'rawUnvoted'].map(r => r[h]).filter(v => v))].sort();
                return `<td><select class="form-select form-select-sm" data-filter="${h}" data-side="${sidePrefix}"><option value="">All</option>${uniqueValues.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}</select></td>`;
            } else if (["shares_summable", "rank_of_shareholding"].includes(h)) {
                const placeholder = h === 'shares_summable' ? 'min' : 'max';
                return `<td><input type="number" class="form-control form-control-sm" data-filter="${h}" data-side="${sidePrefix}" placeholder="${placeholder}" step="any"></td>`;
            } else if (h.startsWith('score_model')) {
                return `<td><input type="number" class="form-control form-control-sm" data-filter="${h}" data-side="${sidePrefix}" placeholder="min" step="any"></td>`;
            } else if (h === 'Target_encoded') {
                const uniqueValues = [...new Set(currentProposalAccountsState[sidePrefix === 'voted' ? 'rawVoted' : 'rawUnvoted'].map(r => r[h]).filter(v => v !== null && v !== undefined))].sort((a, b) => Number(a) - Number(b));
                return `<td><select class="form-select form-select-sm" data-filter="${h}" data-side="${sidePrefix}"><option value="">All</option>${uniqueValues.map(v => `<option value="${String(v)}">${escapeHtml(String(v))}</option>`).join('')}</select></td>`;
            } else if (h.startsWith('prediction_model')) {
                // allow filtering by prediction (1 or 0)
                return `<td><select class="form-select form-select-sm" data-filter="${h}" data-side="${sidePrefix}"><option value="">All</option><option value="1">1</option><option value="0">0</option></select></td>`;
            } else {
                return `<td></td>`;
            }
        }).join('');

        const headerRowCells = headersWithCheckbox.map(h => {
            if (h === '_checkbox') {
                return '<th style="width:120px;">OutReach Selection</th>';
            }
            
            // Create display name with explanations for specific columns
            let displayName = h;
            let explanation = '';
            
            if (h === 'Target_encoded') {
                displayName = '🎯 Target_encoded';
                explanation = '<div class="small text-muted mt-1">(0: Unvoted, 1: For, 2: Against)</div>';
            } else if (h === 'score_model2') {
                displayName = 'score_model2';
                explanation = '<div class="small text-muted mt-1">(0: Strong For ~ 1: Strong Against)</div>';
            } else if (h === 'prediction_model2') {
                displayName = 'prediction_model2';
                explanation = '<div class="small text-muted mt-1">(0: For / 1: Against)</div>';
            } else if (h === 'score_model1') {
                displayName = 'score_model1';
                explanation = '<div class="small text-muted mt-1">(0: Strong Unvoted ~ 1: Strong Voted)</div>';
            } else if (h === 'prediction_model1') {
                displayName = 'prediction_model1';
                explanation = '<div class="small text-muted mt-1">(0: Unvoted / 1: Voted)</div>';
            } else {
                displayName = escapeHtml(h);
            }
            
            const sortable = ['account_type', 'shares_summable', 'rank_of_shareholding', 'Target_encoded'].includes(h) || h.startsWith('score_model') || h.startsWith('prediction_model');
            if (sortable) {
                return `<th style="min-width:110px; cursor:pointer;" onclick="toggleSort('${h}', '${sidePrefix}')">${displayName} <i id="${sidePrefix}_sort_${h}" class="fas fa-sort text-primary ms-2" style="font-size: 14px;"></i>${explanation}</th>`;
            } else {
                return `<th style="min-width:110px;">${displayName}${explanation}</th>`;
            }
        }).join('');

        const thead = `<thead class="table-light"><tr>${headerRowCells}</tr><tr>${filterRowCells}</tr></thead>`;

        const tbody = `<tbody>${rows.map((row, idx) => {
            let checkboxCell = '';
            if (addCheckbox && sidePrefix === 'unvoted') {
                // Build a unique row key: prefer account_id, then account_hash_key, else use the row index
                const keyRaw = (row.account_id !== undefined && row.account_id !== null && row.account_id !== '')
                    ? `acc_${row.account_id}`
                    : ((row.account_hash_key !== undefined && row.account_hash_key !== null && row.account_hash_key !== '')
                        ? `hash_${row.account_hash_key}`
                        : `idx_${idx}`);
                const rowKey = String(keyRaw).replace(/[^a-zA-Z0-9_.:\-]/g, '_');
                // Parse shares_summable robustly for embedding on the checkbox
                let s = row.shares_summable;
                if (s === null || s === undefined || s === '') s = 0;
                if (typeof s === 'string') s = s.replace(/,/g, '').trim();
                const sharesNum = Number.isFinite(Number(s)) ? Number(s) : 0;
                
                // Check if this account is already in outreach table (from backend)
                // Only process in_outreach for unvoted accounts
                const isInOutreach = row.in_outreach === true;
                const isManuallySelected = window.selectedUnvotedProposalRowKeys && window.selectedUnvotedProposalRowKeys.has(rowKey);
                const isChecked = isInOutreach || isManuallySelected;
                
                // Store the outreach status in the checkbox for reference
                checkboxCell = `<td><input type="checkbox" class="unvoted-proposal-account-checkbox" id="unvoted-proposal-checkbox-${rowKey}" data-row-key="${rowKey}" data-account-id="${row.account_id ?? ''}" data-account-hash-key="${row.account_hash_key ?? ''}" data-shares="${sharesNum}" data-in-outreach="${isInOutreach}" ${isChecked ? 'checked' : ''}></td>`;
            }
            return `<tr>${addCheckbox ? checkboxCell : ''}${headers.map(h => `<td title="${escapeHtml(row[h])}">${escapeHtml(row[h])}</td>`).join('')}<td>${row.account_id ? `<button class="btn btn-sm btn-outline-primary" onclick="window.location.href='account.html?id=${encodeURIComponent(row.account_id)}'" title="View Account"><i class="fas fa-user"></i></button>` : ''}</td></tr>`;
        }).join('')}</tbody>`;
        return `<div class="table-responsive" style="max-height:500px; overflow:auto;"><table class="table table-sm table-bordered mb-0">${thead}${tbody}</table></div>`;
    }

    // Prepare filters and rendering
    let filteredVoted = currentProposalAccountsState.rawVoted.slice();
    let filteredUnvoted = currentProposalAccountsState.rawUnvoted.slice();

    // Track applied filters (committed) and pending changes
    const appliedFilters = { voted: {}, unvoted: {} };
    const pendingChanged = { voted: false, unvoted: false };

    // Apply filters and sorting using the currently committed (applied) filters
    function applyFiltersAndRender() {
        function numericCompare(av, bv, dir) {
            const a = parseNumberRaw(av);
            const b = parseNumberRaw(bv);
            if ((a === null) || (b === null)) {
                const aa = String(av || '').toLowerCase();
                const bb = String(bv || '').toLowerCase();
                if (aa < bb) return dir === 'asc' ? -1 : 1;
                if (aa > bb) return dir === 'asc' ? 1 : -1;
                return 0;
            }
            return dir === 'asc' ? a - b : b - a;
        }

        function applyTo(arr, headers, side) {
            const f = appliedFilters[side] || {};
            const sortState = (currentProposalAccountsState.sortState && currentProposalAccountsState.sortState[side]) ? currentProposalAccountsState.sortState[side] : { field: null, dir: 'asc' };
            let out = (arr || []).filter(row => {
                if (!row) return false;
                if (f.accountType && String(row.account_type) !== f.accountType) return false;

                if (f.sharesMin !== undefined && f.sharesMin !== null) {
                    const val = (row.shares_summable !== undefined && row.shares_summable !== null) ? parseNumberRaw(row.shares_summable) : null;
                    if (val === null || val < f.sharesMin) return false;
                }

                if (f.rankMax !== undefined && f.rankMax !== null) {
                    const val = (row.rank_of_shareholding !== undefined && row.rank_of_shareholding !== null) ? parseNumberRaw(row.rank_of_shareholding) : null;
                    if (val === null || val > f.rankMax) return false;
                }

                if (f.scoreMin !== undefined && f.scoreMin !== null) {
                    const scoreField = headers.find(h => h && h.startsWith && h.startsWith('score_model'));
                    if (scoreField) {
                        const sval = row[scoreField] !== undefined && row[scoreField] !== null ? parseNumberRaw(row[scoreField]) : null;
                        if (sval === null || sval < f.scoreMin) return false;
                    }
                }

                // Filter by Target_encoded (exact match)
                if (f.targetEncodedValue && f.targetEncodedValue !== '') {
                    const rowVal = row.Target_encoded !== undefined && row.Target_encoded !== null ? String(row.Target_encoded) : '';
                    const filterVal = String(f.targetEncodedValue);
                    console.log(`Target_encoded filter: row="${rowVal}" (original: ${row.Target_encoded}, type: ${typeof row.Target_encoded}), filter="${filterVal}" (type: ${typeof f.targetEncodedValue}), match: ${rowVal === filterVal}`);
                    if (rowVal !== filterVal) return false;
                }

                // Filter by prediction_model (exact match)
                if (f.predictionValue) {
                    const predictionField = headers.find(h => h && h.startsWith && h.startsWith('prediction_model'));
                    if (predictionField) {
                        const predVal = String(row[predictionField] || '');
                        if (predVal !== f.predictionValue) return false;
                    }
                }

                return true;
            });

            // Determine effective sort field/direction: prefer committed sortState if set
            const effectiveField = sortState && sortState.field ? sortState.field : f.sortBy;
            const effectiveDir = sortState && sortState.dir ? sortState.dir : (f.sortDir || 'asc');

            if (effectiveField) {
                out.sort((a, b) => numericCompare(a[effectiveField], b[effectiveField], effectiveDir));
            }

            return out;
        }

        // apply filters
        filteredVoted = applyTo(currentProposalAccountsState.rawVoted, votedHeaders, 'voted');
        filteredUnvoted = applyTo(currentProposalAccountsState.rawUnvoted, unvotedHeaders, 'unvoted');

        // re-render tables
        renderTables();
    }

    // Read current DOM inputs and return a filter object (used when user clicks Apply)
    function readFiltersFromDOM(side) {
        const accTypeEl = contentElem.querySelector(`[data-side="${side}"] [data-filter="account_type"]`);
        const sharesEl = contentElem.querySelector(`[data-side="${side}"] [data-filter="shares_summable"]`);
        const rankEl = contentElem.querySelector(`[data-side="${side}"] [data-filter="rank_of_shareholding"]`);
        const targetEncodedEl = contentElem.querySelector(`[data-side="${side}"] [data-filter="Target_encoded"]`);

        const headers = side === 'voted' ? votedHeaders : unvotedHeaders;
        const scoreField = headers.find(h => h && h.startsWith && h.startsWith('score_model')) || null;
        const scoreEl = scoreField ? contentElem.querySelector(`[data-side="${side}"] [data-filter="${scoreField}"]`) : null;
        const predictionField = headers.find(h => h && h.startsWith && h.startsWith('prediction_model')) || null;
        const predictionEl = predictionField ? contentElem.querySelector(`[data-side="${side}"] [data-filter="${predictionField}"]`) : null;

        const accountType = accTypeEl ? accTypeEl.value : '';
        const sharesMin = parseNumberRaw(sharesEl ? sharesEl.value : null);
        const rankMax = parseNumberRaw(rankEl ? rankEl.value : null);
        const scoreMin = scoreEl ? parseNumberRaw(scoreEl.value) : null;
        const targetEncodedValue = targetEncodedEl ? targetEncodedEl.value : '';
        const predictionValue = predictionEl ? predictionEl.value : '';

        return { accountType, sharesMin, rankMax, scoreMin, targetEncodedValue, predictionValue };
    }

    function formatActiveFiltersSummary(f) {
        if (!f) return 'None';
        const parts = [];
        if (f.accountType) parts.push(`Type: ${escapeHtml(f.accountType)}`);
        if (f.sharesMin !== undefined && f.sharesMin !== null) parts.push(`Shares ≥ ${f.sharesMin}`);
        if (f.rankMax !== undefined && f.rankMax !== null) parts.push(`Rank ≤ ${f.rankMax}`);
        if (f.scoreMin !== undefined && f.scoreMin !== null) parts.push(`Score ≥ ${f.scoreMin}`);
        if (f.targetEncodedValue) parts.push(`Target: ${escapeHtml(f.targetEncodedValue)}`);
        if (f.predictionValue) parts.push(`Prediction: ${escapeHtml(f.predictionValue)}`);
        return parts.length ? parts.join(' • ') : 'None';
    }

    // Helper to render the tables section (keeps per-column filters under headers and adds Apply/Active UI)
    function renderTables() {
        // compute accumulated 'For' shares for voted (use prediction_model2 if present)
        const votedPredField = votedHeaders.includes('prediction_model2') ? 'prediction_model2' : (votedHeaders.find(h => h && h.startsWith && h.startsWith('prediction_model')) || null);
        const totalAccumulatedFor = (currentProposalAccountsState.rawVoted || []).reduce((acc, r) => {
            const s = r && r.shares_summable !== undefined && r.shares_summable !== null ? parseNumberRaw(r.shares_summable) : null;
            const p = r && votedPredField ? (r[votedPredField] === 0 || r[votedPredField] === '0' || r[votedPredField] === false) : false;
            return acc + ((s !== null && p) ? s : 0);
        }, 0);

        // compute accumulated 'For' shares for the currently filtered voted rows
        const filteredAccumulatedFor = (filteredVoted || []).reduce((acc, r) => {
            const s = r && r.shares_summable !== undefined && r.shares_summable !== null ? parseNumberRaw(r.shares_summable) : null;
            const p = r && votedPredField ? (r[votedPredField] === 0 || r[votedPredField] === '0' || r[votedPredField] === false) : false;
            return acc + ((s !== null && p) ? s : 0);
        }, 0);

        // compute accumulated 'Against' shares for the currently filtered voted rows
        const filteredAccumulatedAgainst = (filteredVoted || []).reduce((acc, r) => {
            const s = r && r.shares_summable !== undefined && r.shares_summable !== null ? parseNumberRaw(r.shares_summable) : null;
            const p = r && votedPredField ? (r[votedPredField] === 1 || r[votedPredField] === '1' || r[votedPredField] === true) : false;
            return acc + ((s !== null && p) ? s : 0);
        }, 0);

        // compute accumulated 'Unvoted' shares - use server total if available, otherwise calculate from client data
        const unvotedPredField = unvotedHeaders.includes('prediction_model1') ? 'prediction_model1' : (unvotedHeaders.find(h => h && h.startsWith && h.startsWith('prediction_model')) || null);

        const totalAccumulatedUnvoted = currentProposalAccountsState.totals && currentProposalAccountsState.totals.unvoted_shares !== undefined 
            ? currentProposalAccountsState.totals.unvoted_shares 
            : (currentProposalAccountsState.rawUnvoted || []).reduce((acc, r) => {
                const s = r && r.shares_summable !== undefined && r.shares_summable !== null ? parseNumberRaw(r.shares_summable) : null;
                return acc + (s !== null ? s : 0);
            }, 0);

        const filteredAccumulatedUnvoted = (filteredUnvoted || []).reduce((acc, r) => {
            const s = r && r.shares_summable !== undefined && r.shares_summable !== null ? parseNumberRaw(r.shares_summable) : null;
            return acc + (s !== null ? s : 0);
        }, 0);

        // Track selected unvoted account IDs for proposal-specific view
        if (!window.selectedUnvotedProposalAccountIds) window.selectedUnvotedProposalAccountIds = [];

        if (!contentElem) return;
        
        // Create the basic container structure
        contentElem.innerHTML = `
            <div class="row">
                <div class="col-lg-6 mb-3" data-side="voted">
                    <!-- Voted accounts content will be rendered here -->
                </div>
                <div class="col-lg-6 mb-3" data-side="unvoted">
                    <!-- Unvoted accounts content will be rendered here -->
                </div>
            </div>
        `;
        
        // Render tables using existing logic (no separate functions needed)
        const leftHtmlFiltered = buildTableHTMLFiltered(filteredVoted, votedHeaders, 'voted');
        const rightHtmlFiltered = buildTableHTMLFiltered(filteredUnvoted, unvotedHeaders, 'unvoted');
        
        // Update the containers with proper content
        const votedContainer = contentElem.querySelector('[data-side="voted"]');
        const unvotedContainer = contentElem.querySelector('[data-side="unvoted"]');
        
        if (votedContainer) {
            votedContainer.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <h6 class="mb-0"><i class="fas fa-check-circle me-2"></i>Voted Accounts <small class="text-muted">(Total: ${votedPagination.total || voted.length})</small></h6>
                        <div class="small text-muted">Predicted For Shares (current page): ${formatNumberWithCommas(totalAccumulatedFor)}</div>
                        <div id="voted_active_filters" class="small text-muted">Active filters: ${formatActiveFiltersSummary(appliedFilters.voted)} • Showing Shares voted For on current page and filter: ${formatNumberWithCommas(filteredAccumulatedFor)} • Showing Shares voted Against on current page and filter: ${formatNumberWithCommas(filteredAccumulatedAgainst)}</div>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-primary" id="voted_apply_filters">Apply</button>
                        <button class="btn btn-sm btn-outline-secondary" id="voted_clear_filters">Clear</button>
                    </div>
                </div>
                ${leftHtmlFiltered}
            `;
        }
        
        if (unvotedContainer) {
            unvotedContainer.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <h6 class="mb-0"><i class="fas fa-clock me-2"></i>Unvoted Accounts <small class="text-muted">(Total: ${unvotedPagination.total || unvoted.length})</small></h6>
                        <div class="small text-muted">Total Accumulated Unvoted Shares: ${formatNumberWithCommas(totalAccumulatedUnvoted)}</div>
                        <div id="unvoted_active_filters" class="small text-muted">Active filters: ${formatActiveFiltersSummary(appliedFilters.unvoted)} • Showing shares on current page: ${formatNumberWithCommas(filteredAccumulatedUnvoted)}</div>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-primary" id="unvoted_apply_filters">Apply</button>
                        <button class="btn btn-sm btn-outline-secondary" id="unvoted_clear_filters">Clear</button>
                    </div>
                </div>
                ${rightHtmlFiltered}
            `;
        }
        
        // Wire up per-column input events to mark pending changes (do NOT apply automatically)
        contentElem.querySelectorAll('[data-filter]').forEach(el => {
            // mark pending on input
            el.removeEventListener('input', () => {});
            el.addEventListener('input', function() {
                const side = el.closest('[data-side]') ? el.closest('[data-side]').getAttribute('data-side') : null;
                if (side) {
                    pendingChanged[side] = true;
                    el.classList.add('pending-filter');
                }
            });
        });

        // Add event listeners for unvoted proposal checkboxes
        contentElem.querySelectorAll('.unvoted-proposal-account-checkbox').forEach(cb => {
            cb.addEventListener('change', function() {
                const rowKey = this.getAttribute('data-row-key');
                if (rowKey) {
                    if (this.checked) {
                        window.selectedUnvotedProposalRowKeys.add(rowKey);
                    } else {
                        window.selectedUnvotedProposalRowKeys.delete(rowKey);
                    }
                }
                // Recalculate solely from checked boxes in the DOM
                if (typeof window.updateSelectedUnvotedProposalSharesLegend === 'function') {
                    window.updateSelectedUnvotedProposalSharesLegend();
                }
            });
        });
        
        // Setup global functions and legend updater  
        function updateSelectedUnvotedProposalSharesLegend(filteredUnvotedParam) {
            // Only update in accounts view
            if (window._appView !== 'accounts') return;
            if (!contentElem) return;
            let total = 0;
            contentElem.querySelectorAll('.unvoted-proposal-account-checkbox:checked').forEach(cb => {
                const v = Number(cb.getAttribute('data-shares'));
                if (Number.isFinite(v)) total += v;
            });
            const legend = document.getElementById('dataLegendSelectedShares');
            if (legend) legend.textContent = `Total Shares from Selected Unvoted Accounts: ${total.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
        }

        // Expose updater globally so legend and handlers can call it
        window.updateSelectedUnvotedProposalSharesLegend = updateSelectedUnvotedProposalSharesLegend;

        // wire up apply buttons
        ['voted', 'unvoted'].forEach(side => {
            const applyBtn = document.getElementById(`${side}_apply_filters`);
            const clearBtn = document.getElementById(`${side}_clear_filters`);

            if (applyBtn) {
                applyBtn.onclick = () => {
                    // read DOM inputs -> commit to appliedFilters
                    const domFilters = readFiltersFromDOM(side);
                    appliedFilters[side] = {
                        accountType: domFilters.accountType || '',
                        sharesMin: domFilters.sharesMin !== null ? domFilters.sharesMin : null,
                        rankMax: domFilters.rankMax !== null ? domFilters.rankMax : null,
                        scoreMin: domFilters.scoreMin !== null ? domFilters.scoreMin : null,
                        targetEncodedValue: domFilters.targetEncodedValue || '',
                        predictionValue: domFilters.predictionValue || '',
                        // keep existing sort choices if any
                        sortBy: (currentProposalAccountsState.sortState && currentProposalAccountsState.sortState[side]) ? currentProposalAccountsState.sortState[side].field : null,
                        sortDir: (currentProposalAccountsState.sortState && currentProposalAccountsState.sortState[side]) ? currentProposalAccountsState.sortState[side].dir : 'asc'
                    };
                    // update active filters display
                    const activeEl = document.getElementById(`${side}_active_filters`);
                    if (activeEl) activeEl.textContent = `Active filters: ${formatActiveFiltersSummary(appliedFilters[side])}`;
                    // clear pending flags and visual markers
                    pendingChanged[side] = false;
                    contentElem.querySelectorAll(`[data-side="${side}"] [data-filter]`).forEach(i => i.classList.remove('pending-filter'));
                    // apply and render
                    applyFiltersAndRender();
                };
            }

            if (clearBtn) {
                clearBtn.onclick = () => {
                    // clear per-column inputs in DOM
                    contentElem.querySelectorAll(`[data-side="${side}"] [data-filter]`).forEach(i => {
                        if ('value' in i) i.value = '';
                        if (i.tagName && i.tagName.toUpperCase() === 'SELECT') i.selectedIndex = 0;
                        i.classList.remove('pending-filter');
                    });
                    // clear applied filters
                    appliedFilters[side] = {};
                    // reset sort state for side
                    if (currentProposalAccountsState.sortState && currentProposalAccountsState.sortState[side]) {
                        currentProposalAccountsState.sortState[side].field = null;
                        currentProposalAccountsState.sortState[side].dir = 'asc';
                    }
                    // clear visual sort indicators
                    document.querySelectorAll(`[id^="${side}_sort_"]`).forEach(el => {
                        el.className = 'fas fa-sort text-muted ms-2';
                        el.style.fontSize = '14px';
                    });
                    // update active filters display
                    const activeEl = document.getElementById(`${side}_active_filters`);
                    if (activeEl) activeEl.textContent = `Active filters: ${formatActiveFiltersSummary(appliedFilters[side])}`;
                    // apply and render
                    applyFiltersAndRender();
                };
            }
        });

        // Build and insert separate pagination under each table
        const effectiveLimit = (currentProposalAccountsState && currentProposalAccountsState.limit) ? currentProposalAccountsState.limit : 50;
        const vTotal = (votedPagination && (votedPagination.total ?? voted.length)) || voted.length;
        const uTotal = (unvotedPagination && (unvotedPagination.total ?? unvoted.length)) || unvoted.length;
        const vTotalPages = (votedPagination && votedPagination.total_pages) ? votedPagination.total_pages : Math.max(1, Math.ceil(vTotal / effectiveLimit));
        const uTotalPages = (unvotedPagination && unvotedPagination.total_pages) ? unvotedPagination.total_pages : Math.max(1, Math.ceil(uTotal / effectiveLimit));
        const vCurrent = (votedPagination && votedPagination.current_page) ? votedPagination.current_page : 1;
        const uCurrent = (unvotedPagination && unvotedPagination.current_page) ? unvotedPagination.current_page : 1;

        // Always show pagination for debugging - remove the condition temporarily
        let votedPaginationHTML = '';
        // Always build for voted accounts for debugging
        votedPaginationHTML += '<nav aria-label="Voted accounts pagination" class="mt-2"><ul class="pagination pagination-sm justify-content-center">';
        if (vCurrent > 1) votedPaginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changeVotedAccountsPage(${vCurrent - 1});return false;">Prev</a></li>`;
        const vStart = Math.max(1, vCurrent - 2);
        const vEnd = Math.min(vTotalPages, vCurrent + 2);
        for (let i = vStart; i <= vEnd; i++) {
            votedPaginationHTML += `<li class="page-item ${i === vCurrent ? 'active' : ''}"><a class="page-link" href="#" onclick="changeVotedAccountsPage(${i});return false;">${i}</a></li>`;
        }
        if (vCurrent < vTotalPages) votedPaginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changeVotedAccountsPage(${vCurrent + 1});return false;">Next</a></li>`;
        votedPaginationHTML += `</ul><small class="text-muted">DEBUG: vTotal=${vTotal}, vTotalPages=${vTotalPages}, vCurrent=${vCurrent}, effectiveLimit=${effectiveLimit}</small></nav>`;

        let unvotedPaginationHTML = '';
        // Always build for unvoted accounts for debugging
        unvotedPaginationHTML += '<nav aria-label="Unvoted accounts pagination" class="mt-2"><ul class="pagination pagination-sm justify-content-center">';
        if (uCurrent > 1) unvotedPaginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changeUnvotedAccountsPage(${uCurrent - 1});return false;">Prev</a></li>`;
        const uStart = Math.max(1, uCurrent - 2);
        const uEnd = Math.min(uTotalPages, uCurrent + 2);
        for (let i = uStart; i <= uEnd; i++) {
            unvotedPaginationHTML += `<li class="page-item ${i === uCurrent ? 'active' : ''}"><a class="page-link" href="#" onclick="changeUnvotedAccountsPage(${i});return false;">${i}</a></li>`;
        }
        if (uCurrent < uTotalPages) unvotedPaginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changeUnvotedAccountsPage(${uCurrent + 1});return false;">Next</a></li>`;
        unvotedPaginationHTML += `</ul><small class="text-muted">DEBUG: uTotal=${uTotal}, uTotalPages=${uTotalPages}, uCurrent=${uCurrent}, effectiveLimit=${effectiveLimit}</small></nav>`;

        const votedPagContainer = contentElem.querySelector('[data-side="voted"]');
        const unvotedPagContainer = contentElem.querySelector('[data-side="unvoted"]');
        if (votedPagContainer) votedPagContainer.querySelectorAll('nav[aria-label^="Voted"]').forEach(n => n.remove());
        if (unvotedPagContainer) unvotedPagContainer.querySelectorAll('nav[aria-label^="Unvoted"]').forEach(n => n.remove());
        if (votedPagContainer) votedPagContainer.insertAdjacentHTML('beforeend', votedPaginationHTML);
        if (unvotedPagContainer) unvotedPagContainer.insertAdjacentHTML('beforeend', unvotedPaginationHTML);
    }

    // initial render
    renderTables();
    
    // Store render function globally for sorting
    window.currentRenderFunction = applyFiltersAndRender;

    // Populate title and pagination
    const container = document.getElementById('proposalAccountsContainer');
    const title = document.getElementById('proposalAccountsTitle');
    const paginationDiv = document.getElementById('proposalAccountsPagination');

    if (!container || !title) return;
    title.textContent = `Accounts for Proposal ID: ${proposal.id} - ${proposal.issuer_name || ''}`;

    // Use separate paginations per-table (voted/unvoted) which are inserted into each table's container.
    // Clear the top-level pagination area so it doesn't show a shared paginator.
    if (paginationDiv) paginationDiv.innerHTML = '';

    // Show container
    document.querySelectorAll('.content-section').forEach(section => section.style.display = 'none');
    const proposalsCard = document.getElementById('proposalsCard'); if (proposalsCard) proposalsCard.style.display = 'none';
    const proposalsSection = document.getElementById('proposals-section'); if (proposalsSection) proposalsSection.style.display = 'block';
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Setup page size change handler now that the container is visible
    setupPageSizeHandler();
}

// Helper function to get headers from data array
function getHeaders(dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) return [];
    
    // Get all unique keys from the data
    const allKeys = new Set();
    dataArray.forEach(item => {
        if (item && typeof item === 'object') {
            Object.keys(item).forEach(key => allKeys.add(key));
        }
    });
    
    return Array.from(allKeys);
}

// Helper function to apply filters to data
function applyFilters(dataArray, headers, filters) {
    if (!Array.isArray(dataArray) || !filters) return dataArray;
    
    return dataArray.filter(row => {
        if (!row) return false;
        
        // Account type filter
        if (filters.accountType && String(row.account_type) !== filters.accountType) return false;
        
        // Shares minimum filter
        if (filters.sharesMin !== undefined && filters.sharesMin !== null) {
            const val = (row.shares_summable !== undefined && row.shares_summable !== null) ? parseNumberRaw(row.shares_summable) : null;
            if (val === null || val < filters.sharesMin) return false;
        }
        
        // Rank maximum filter
        if (filters.rankMax !== undefined && filters.rankMax !== null) {
            const val = (row.rank_of_shareholding !== undefined && row.rank_of_shareholding !== null) ? parseNumberRaw(row.rank_of_shareholding) : null;
            if (val === null || val > filters.rankMax) return false;
        }
        
        // Score minimum filter
        if (filters.scoreMin !== undefined && filters.scoreMin !== null) {
            const scoreField = headers.find(h => h && h.startsWith && h.startsWith('score_model'));
            if (scoreField) {
                const sval = row[scoreField] !== undefined && row[scoreField] !== null ? parseNumberRaw(row[scoreField]) : null;
                if (sval === null || sval < filters.scoreMin) return false;
            }
        }
        
        // Target encoded filter
        if (filters.targetEncodedValue && filters.targetEncodedValue !== '') {
            const rowVal = row.Target_encoded !== undefined && row.Target_encoded !== null ? String(row.Target_encoded) : '';
            const filterVal = String(filters.targetEncodedValue);
            if (rowVal !== filterVal) return false;
        }
        
        // Prediction model filter
        if (filters.predictionValue) {
            const predictionField = headers.find(h => h && h.startsWith && h.startsWith('prediction_model'));
            if (predictionField) {
                const predVal = String(row[predictionField] || '');
                if (predVal !== filters.predictionValue) return false;
            }
        }
        
        return true;
    });
}

// Global browser-side sorting function
function toggleSort(field, sidePrefix) {
    // Initialize current state if it doesn't exist
    if (!window.currentProposalAccountsState) {
        window.currentProposalAccountsState = {};
    }
    if (!window.currentProposalAccountsState.sortState) {
        window.currentProposalAccountsState.sortState = {};
    }
    if (!window.currentProposalAccountsState.sortState[sidePrefix]) {
        window.currentProposalAccountsState.sortState[sidePrefix] = { field: null, dir: 'asc' };
    }

    const currentSort = window.currentProposalAccountsState.sortState[sidePrefix];
    
    // Toggle sort direction if same field, otherwise start with asc
    if (currentSort.field === field) {
        currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.dir = 'asc';
    }

    // Update visual indicators for all sortable columns on this side
    const sortableFields = ['account_type', 'shares_summable', 'rank_of_shareholding', 'Target_encoded'];
    // Get all prediction and score model fields from current data
    const allHeaders = window.currentProposalAccountsState.rawVoted && window.currentProposalAccountsState.rawUnvoted 
        ? [...Object.keys(window.currentProposalAccountsState.rawVoted[0] || {}), ...Object.keys(window.currentProposalAccountsState.rawUnvoted[0] || {})]
        : [];
    const predictionFields = allHeaders.filter(h => h && (h.startsWith('score_model') || h.startsWith('prediction_model')));
    const allSortableFields = [...sortableFields, ...predictionFields];

    allSortableFields.forEach(h => {
        const iconEl = document.getElementById(`${sidePrefix}_sort_${h}`);
        if (iconEl) {
            if (h === field) {
                // Update icon to show current sort direction
                iconEl.className = currentSort.dir === 'asc' 
                    ? 'fas fa-sort-up text-primary ms-2' 
                    : 'fas fa-sort-down text-primary ms-2';
            } else {
                // Reset to default unsorted icon
                iconEl.className = 'fas fa-sort text-muted ms-2';
            }
            iconEl.style.fontSize = '14px';
        }
    });

    // Trigger re-render by calling the stored render function
    if (window.currentRenderFunction) {
        window.currentRenderFunction();
    }
}

// Add selected unvoted proposal accounts to Outreach group (UNVOTED ACCOUNTS ONLY - voted accounts are not eligible for outreach)
async function addSelectedUnvotedToOutreach() {
    try {
        if (window._appView !== 'accounts') {
            showAlert('Please open a proposal accounts view to add unvoted accounts.', 'warning');
            return;
        }
        const container = document.getElementById('proposalAccountsContent');
        if (!container) return;
        const checked = Array.from(container.querySelectorAll('.unvoted-proposal-account-checkbox:checked'));
        if (!checked.length) {
            showAlert('No unvoted accounts selected.', 'warning');
            return;
        }
        // Collect distinct account_hash_key values (fallback to account_id if hash is missing)
        const hashes = checked.map(cb => cb.getAttribute('data-account-hash-key') || cb.getAttribute('data-account-id') || '')
                               .filter(v => v && v.trim() !== '');
        const uniqueHashes = Array.from(new Set(hashes));
        if (!uniqueHashes.length) {
            showAlert('Selected rows have no usable account identifiers.', 'warning');
            return;
        }
        const keyParam = currentProposalAccountsState ? currentProposalAccountsState.keyParam : null;
        const keyValue = currentProposalAccountsState ? currentProposalAccountsState.keyValue : null;
        if (!keyParam || keyValue === undefined || keyValue === null || keyValue === '') {
            showAlert('Missing key context; cannot add to outreach.', 'danger');
            return;
        }

        const resp = await fetch(`${API_BASE}/api/outreach/bulk-add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key_param: keyParam,
                key_value: keyValue,
                accounts: uniqueHashes.map(h => ({ account_hash_key: h }))
            })
        });
        const data = await resp.json().catch(() => ({}));
        
        console.log('=== OUTREACH RESPONSE DEBUG ===');
        console.log('Response OK:', resp.ok);
        console.log('Response status:', resp.status);
        console.log('Response data:', data);
        
        if (!resp.ok) {
            console.error('Bulk add outreach failed', data);
            showAlert(`Failed to add to outreach: ${escapeHtml(data.error || resp.statusText)}`, 'danger');
            return;
        }

        // Update data legend area with detailed results - ALWAYS SHOW FEEDBACK
        const dataLegendArea = document.getElementById('dataLegendArea');
        console.log('dataLegendArea element found:', !!dataLegendArea);
        
        // Force feedback display even if element is missing
        if (!dataLegendArea) {
            // Create the element if it doesn't exist
            const legendCard = document.getElementById('dataLegendCardBody');
            if (legendCard) {
                const newDiv = document.createElement('div');
                newDiv.id = 'dataLegendArea';
                newDiv.className = 'mt-3';
                legendCard.appendChild(newDiv);
                console.log('Created missing dataLegendArea element');
            }
        }
        
        const finalLegendArea = document.getElementById('dataLegendArea');
        if (finalLegendArea) {
            let legendHtml = '<h6 class="text-info">Outreach Operation Results:</h6>';
            
            // Success message for inserted accounts
            if (data.inserted && data.inserted > 0) {
                const sharesText = data.totalShares ? ` owning ${data.totalShares.toLocaleString()} shares` : '';
                legendHtml += `<div class="alert alert-success mb-2"><strong>✅ Success:</strong> ${data.inserted} accounts${sharesText} have been added to the outreach table</div>`;
            }
            
            // Duplicate messages
            if (data.duplicateMessages && data.duplicateMessages.length > 0) {
                legendHtml += '<div class="alert alert-warning mb-2">';
                legendHtml += '<strong>⚠️ Duplicates not inserted:</strong><br>';
                data.duplicateMessages.forEach(msg => {
                    legendHtml += `• ${escapeHtml(msg)}<br>`;
                });
                legendHtml += '</div>';
            }
            
            // If nothing was inserted
            if (!data.inserted || data.inserted === 0) {
                if (data.duplicateMessages && data.duplicateMessages.length > 0) {
                    legendHtml += '<div class="alert alert-info mb-2"><strong>ℹ️ Info:</strong> No new accounts were added (all were already in outreach table)</div>';
                } else {
                    legendHtml += '<div class="alert alert-warning mb-2"><strong>⚠️ Warning:</strong> No accounts were added to outreach table</div>';
                }
            }
            
            console.log('Setting legendHtml:', legendHtml);
            finalLegendArea.innerHTML = legendHtml;
            
            // Scroll to the legend area to make it visible
            finalLegendArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            console.log('Updated dataLegendArea and scrolled to it');
        } else {
            console.error('Still could not find or create dataLegendArea element!');
            // Fallback: show in alert
            let message = `Added ${data.inserted || 0} accounts. `;
            if (data.totalShares) message += `Total shares: ${data.totalShares.toLocaleString()}. `;
            if (data.duplicateMessages && data.duplicateMessages.length > 0) {
                message += `${data.duplicateMessages.length} duplicates skipped.`;
            }
            showAlert(message, 'success');
        }
        
        // Also show a brief alert
        showAlert(`Added ${data.inserted || 0} record(s) to outreach. Skipped ${data.skipped || 0} duplicate(s).`, 'success');
    } catch (e) {
        console.error('Error adding to outreach group:', e);
        showAlert('Error adding to outreach group', 'danger');
    }
}

// Debug functions
// Load outreach accounts count for dashboard
async function loadOutreachCount() {
    try {
        const resp = await fetch(`${API_BASE}/api/outreach`);
        if (!resp.ok) {
            const el = document.getElementById('outreachAccountsCount');
            if (el) el.textContent = '0';
            return;
        }
        const rows = await resp.json();
        const el = document.getElementById('outreachAccountsCount');
        if (el) el.textContent = Array.isArray(rows) ? rows.length : 0;
    } catch (e) {
        console.warn('Failed to load outreach count', e);
        const el = document.getElementById('outreachAccountsCount');
        if (el) el.textContent = '0';
    }
}

// Load and render outreach accounts list
async function loadOutreachAccounts() {
    const tbody = document.getElementById('outreachAccountsTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center">Loading...</td></tr>`;
    try {
        const resp = await fetch(`${API_BASE}/api/outreach`);
        if (!resp.ok) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted">No outreach endpoint (HTTP ${resp.status})</td></tr>`;
            return;
        }
        const rows = await resp.json();
        if (!Array.isArray(rows) || rows.length === 0) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted">No outreach accounts</td></tr>`;
            return;
        }
        const html = rows.map((r, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td>${escapeHtml(r.account_hash_key || '')}</td>
                <td>${escapeHtml(String(r.proposal_master_skey ?? ''))}</td>
                <td>${escapeHtml(String(r.director_master_skey ?? ''))}</td>
                <td>${escapeHtml(r.account_type || '')}</td>
                <td class="text-end">${Number(r.shares_summable || 0).toLocaleString('en-US')}</td>
                <td class="text-end">${escapeHtml(String(r.rank_of_shareholding ?? ''))}</td>
                <td class="text-end">${r.score_model1 !== null && r.score_model1 !== undefined ? Number(r.score_model1).toLocaleString('en-US', { maximumFractionDigits: 6 }) : ''}</td>
                <td class="text-end">${escapeHtml(String(r.prediction_model1 ?? ''))}</td>
                <td class="text-end">${escapeHtml(String(r.Target_encoded ?? ''))}</td>
                <td>${escapeHtml(r.created_at ? new Date(r.created_at).toLocaleString() : '')}</td>
            </tr>
        `).join('');
        if (tbody) tbody.innerHTML = html;
    } catch (e) {
        console.error('Failed to load outreach accounts', e);
        if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center text-danger">Failed to load outreach accounts</td></tr>`;
    }
}

// Extend showSection to handle outreach-accounts
const _orig_showSection = typeof showSection === 'function' ? showSection : null;
window.showSection = function(section) {
    // Hide all
    document.querySelectorAll('.content-section').forEach(el => el.style.display = 'none');
    if (section === 'dashboard') {
        { const el = document.getElementById('dashboard-section'); if (el) el.style.display = 'block'; }
        loadDashboardData();
        loadOutreachCount();
        return;
    }
    if (section === 'outreach-accounts') {
        { const el = document.getElementById('outreach-accounts-section'); if (el) el.style.display = 'block'; }
        loadOutreachAccounts();
        return;
    }
    // Fallback to original handler for other sections
    if (_orig_showSection) return _orig_showSection(section);
};

// Ensure count is loaded on initial dashboard
document.addEventListener('DOMContentLoaded', () => {
    try { loadOutreachCount(); } catch {}
});

// Test function to verify feedback display works
function testFeedback() {
    const dataLegendArea = document.getElementById('dataLegendArea');
    if (dataLegendArea) {
        const testHtml = `
            <h6 class="text-info">Test Feedback Results:</h6>
            <div class="alert alert-success mb-2"><strong>✅ Success:</strong> 5 accounts owning 1,234,567 shares have been added to the outreach table</div>
            <div class="alert alert-warning mb-2">
                <strong>⚠️ Duplicates not inserted:</strong><br>
                • account_hash_key(ABC123)+proposal_master_skey(279)+director_master_skey(-1) is not inserted because it is already in outreach table<br>
                • account_hash_key(DEF456)+proposal_master_skey(279)+director_master_skey(-1) is not inserted because it is already in outreach table
            </div>
        `;
        dataLegendArea.innerHTML = testHtml;
        dataLegendArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        console.log('Test feedback displayed successfully');
    } else {
        console.error('dataLegendArea not found for test');
        alert('dataLegendArea element not found!');
    }
}

// Pagination functions for proposal accounts
async function changeVotedAccountsPage(page) {
    console.log('changeVotedAccountsPage called with page:', page);
    if (!currentProposalAccountsState.proposalId) {
        console.error('No proposal ID stored in state');
        return;
    }
    
    // Store the target page for voted accounts only
    currentProposalAccountsState.votedPage = page;
    
    // Just reload the full view with updated page - simpler approach
    await viewProposalAccounts(currentProposalAccountsState.proposalId, 1);
}

async function changeUnvotedAccountsPage(page) {
    console.log('changeUnvotedAccountsPage called with page:', page);
    if (!currentProposalAccountsState.proposalId) {
        console.error('No proposal ID stored in state');
        return;
    }
    
    // Store the target page for unvoted accounts only
    currentProposalAccountsState.unvotedPage = page;
    
    // Just reload the full view with updated page - simpler approach  
    await viewProposalAccounts(currentProposalAccountsState.proposalId, 1);
}

// Load only voted accounts with separate pagination
async function loadVotedAccounts(proposalId, page = 1) {
    try {
        const params = new URLSearchParams();
        
        // Set up API parameters for voted accounts only
        if (currentProposalAccountsState.keyParam === 'proposal_master_skey') {
            params.append('proposal_master_skey', String(currentProposalAccountsState.keyValue));
        } else if (currentProposalAccountsState.keyParam === 'director_master_skey') {
            params.append('director_master_skey', String(currentProposalAccountsState.keyValue));
        }
        
        params.append('voted_page', String(page));
        params.append('unvoted_page', String(currentProposalAccountsState.unvotedPage || 1));
        params.append('limit', String(currentProposalAccountsState.limit || 1000));
        params.append('load_type', 'voted_only');
        
        const resp = await fetch(`/api/proposal-accounts?${params.toString()}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        
        const data = await resp.json();
        
        // Update only voted data in state
        currentProposalAccountsState.rawVoted = Array.isArray(data.voted) ? data.voted : [];
        if (data.pagination && data.pagination.voted) {
            currentProposalAccountsState.pagination.voted = data.pagination.voted;
        }
        if (data.totals && data.totals.voted_shares !== undefined) {
            currentProposalAccountsState.totals.voted_shares = data.totals.voted_shares;
        }
        
        // Re-render only the voted accounts table
        renderVotedAccountsTable();
        
    } catch (error) {
        console.error('Error loading voted accounts:', error);
        showAlert('Failed to load voted accounts: ' + error.message, 'danger');
    }
}

// Load only unvoted accounts with separate pagination
async function loadUnvotedAccounts(proposalId, page = 1) {
    try {
        const params = new URLSearchParams();
        
        // Set up API parameters for unvoted accounts only
        if (currentProposalAccountsState.keyParam === 'proposal_master_skey') {
            params.append('proposal_master_skey', String(currentProposalAccountsState.keyValue));
        } else if (currentProposalAccountsState.keyParam === 'director_master_skey') {
            params.append('director_master_skey', String(currentProposalAccountsState.keyValue));
        }
        
        params.append('voted_page', String(currentProposalAccountsState.votedPage || 1));
        params.append('unvoted_page', String(page));
        params.append('limit', String(currentProposalAccountsState.limit || 1000));
        params.append('load_type', 'unvoted_only');
        
        const resp = await fetch(`/api/proposal-accounts?${params.toString()}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        
        const data = await resp.json();
        
        // Update only unvoted data in state
        currentProposalAccountsState.rawUnvoted = Array.isArray(data.unvoted) ? data.unvoted : [];
        if (data.pagination && data.pagination.unvoted) {
            currentProposalAccountsState.pagination.unvoted = data.pagination.unvoted;
        }
        if (data.totals && data.totals.unvoted_shares !== undefined) {
            currentProposalAccountsState.totals.unvoted_shares = data.totals.unvoted_shares;
        }
        
        // Re-render only the unvoted accounts table
        renderUnvotedAccountsTable();
        
    } catch (error) {
        console.error('Error loading unvoted accounts:', error);
        showAlert('Failed to load unvoted accounts: ' + error.message, 'danger');
    }
}

// ========== ADMIN FUNCTIONS ==========

// Admin authentication state
let isAdminAuthenticated = false;
const ADMIN_PASSWORD = '12345678';

// Prompt for admin login
function promptAdminLogin() {
    // Reset form
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminLoginError').style.display = 'none';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('adminLoginModal'));
    modal.show();
    
    // Focus on password field
    setTimeout(() => {
        document.getElementById('adminPassword').focus();
    }, 500);
}

// Verify admin password
async function verifyAdminPassword() {
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('adminLoginError');
    
    try {
        const response = await fetchWithCredentials('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            isAdminAuthenticated = true;
            
            // Hide modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('adminLoginModal'));
            modal.hide();
            
            // Show admin section
            showSection('admin', null);
            
            // Update nav link to active
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            document.querySelector('[onclick="promptAdminLogin()"]').classList.add('active');
            
            // Show success message
            showAlert('Admin access granted', 'success');
            
        } else {
            // Show error
            errorDiv.textContent = result.message || 'Invalid password. Please try again.';
            errorDiv.style.display = 'block';
            document.getElementById('adminPassword').value = '';
            document.getElementById('adminPassword').focus();
        }
    } catch (error) {
        console.error('Admin login error:', error);
        errorDiv.textContent = 'Login failed. Please try again.';
        errorDiv.style.display = 'block';
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();
    }
}

// Handle Enter key in password field
document.addEventListener('DOMContentLoaded', function() {
    const passwordField = document.getElementById('adminPassword');
    if (passwordField) {
        passwordField.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                verifyAdminPassword();
            }
        });
    }
});

// Logout from admin (optional - can be called manually)
function adminLogout() {
    isAdminAuthenticated = false;
    showSection('dashboard', null);
    showAlert('Logged out from admin panel', 'info');
}

// Show database statistics
async function showDatabaseStats() {
    if (!isAdminAuthenticated) {
        showAlert('Admin authentication required', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/database-stats');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const stats = await response.json();
        const resultDiv = document.getElementById('databaseStatsResult');
        
        resultDiv.innerHTML = `
            <div class="card mt-2">
                <div class="card-body">
                    <h6>Database Statistics</h6>
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Voted Accounts:</strong> ${stats.voted_count ? stats.voted_count.toLocaleString() : 'N/A'}</p>
                            <p><strong>Unvoted Accounts:</strong> ${stats.unvoted_count ? stats.unvoted_count.toLocaleString() : 'N/A'}</p>
                            <p><strong>Total Accounts:</strong> ${stats.total_accounts ? stats.total_accounts.toLocaleString() : 'N/A'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Outreach Logs:</strong> ${stats.outreach_logs ? stats.outreach_logs.toLocaleString() : 'N/A'}</p>
                            <p><strong>Proposals:</strong> ${stats.proposals ? stats.proposals.toLocaleString() : 'N/A'}</p>
                            <p><strong>Database Size:</strong> ${stats.database_size || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        document.getElementById('databaseStatsResult').innerHTML = 
            `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
}

// Export database
async function exportDatabase() {
    if (!isAdminAuthenticated) {
        showAlert('Admin authentication required', 'warning');
        return;
    }
    
    if (!confirm('This will create a database backup. Continue?')) return;
    
    try {
        const response = await fetch('/api/admin/export-database', { method: 'POST' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        showAlert('Database export started. Check server logs for progress.', 'success');
        
        document.getElementById('databaseStatsResult').innerHTML = 
            `<div class="alert alert-success">Export initiated: ${result.message}</div>`;
    } catch (error) {
        document.getElementById('databaseStatsResult').innerHTML = 
            `<div class="alert alert-danger">Export failed: ${error.message}</div>`;
    }
}

// Clear database (with confirmation)
async function clearDatabase() {
    if (!isAdminAuthenticated) {
        showAlert('Admin authentication required', 'warning');
        return;
    }
    
    const confirmText = 'DELETE ALL DATA';
    const userInput = prompt(`This will DELETE ALL DATA from the database. Type "${confirmText}" to confirm:`);
    
    if (userInput !== confirmText) {
        showAlert('Database clear cancelled.', 'info');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/clear-database', { method: 'POST' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        showAlert('Database cleared successfully.', 'success');
        
        document.getElementById('databaseStatsResult').innerHTML = 
            `<div class="alert alert-success">Database cleared: ${result.message}</div>`;
            
        // Refresh dashboard if visible
        if (document.getElementById('dashboard-section').style.display !== 'none') {
            loadDashboard();
        }
    } catch (error) {
        document.getElementById('databaseStatsResult').innerHTML = 
            `<div class="alert alert-danger">Clear failed: ${error.message}</div>`;
    }
}

// Show issuer list with selection capability
async function showIssuerList() {
    if (!isAdminAuthenticated) {
        showAlert('Admin authentication required', 'warning');
        return;
    }
    
    try {
        const response = await fetchWithCredentials('/api/admin/issuer-list');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const resultDiv = document.getElementById('systemInfoResult');
        
        if (data.issuers && data.issuers.length > 0) {
            resultDiv.innerHTML = `
                <div class="card mt-2">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6>Issuer Selection & Filter</h6>
                            <div>
                                <button class="btn btn-success btn-sm me-2" onclick="selectAllIssuers()">
                                    <i class="fas fa-check-double me-1"></i>Select All
                                </button>
                                <button class="btn btn-warning btn-sm me-2" onclick="clearAllIssuers()">
                                    <i class="fas fa-times me-1"></i>Clear All
                                </button>
                                <button class="btn btn-primary btn-sm" onclick="applyIssuerFilter()">
                                    <i class="fas fa-filter me-1"></i>Apply Filter
                                </button>
                            </div>
                        </div>
                        
                        <div class="alert alert-info">
                            <small>
                                <i class="fas fa-info-circle me-1"></i>
                                Selected issuers: <strong id="selectedCount">${data.selectedCount}</strong> / ${data.totalIssuers}
                                <br>Only data from selected issuers will be shown across all sections.
                            </small>
                        </div>
                        
                        <div style="max-height: 400px; overflow-y: auto;">
                            <table class="table table-sm table-striped">
                                <thead class="table-dark sticky-top">
                                    <tr>
                                        <th style="width: 40px;">
                                            <input type="checkbox" id="selectAllCheckbox" onchange="toggleAllIssuers(this)">
                                        </th>
                                        <th>Issuer Name</th>
                                        <th>Proposals</th>
                                        <th>Directors</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.issuers.map((issuer, index) => `
                                        <tr>
                                            <td>
                                                <input type="checkbox" 
                                                       class="issuer-checkbox" 
                                                       value="${issuer.name}" 
                                                       ${issuer.selected ? 'checked' : ''}
                                                       onchange="updateSelectedCount()">
                                            </td>
                                            <td>${issuer.name}</td>
                                            <td>${issuer.proposal_count ? issuer.proposal_count.toLocaleString() : '0'}</td>
                                            <td>${issuer.director_count ? issuer.director_count.toLocaleString() : '0'}</td>
                                            <td><span class="badge bg-success">active</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            // Update the select all checkbox state
            updateSelectAllCheckbox();
            
        } else {
            resultDiv.innerHTML = `
                <div class="card mt-2">
                    <div class="card-body">
                        <h6>Issuer List</h6>
                        <div class="alert alert-info">No issuers found in the database.</div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        document.getElementById('systemInfoResult').innerHTML = 
            `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
}

// Select all issuers
function selectAllIssuers() {
    const checkboxes = document.querySelectorAll('.issuer-checkbox');
    checkboxes.forEach(cb => cb.checked = true);
    updateSelectedCount();
    updateSelectAllCheckbox();
}

// Clear all issuer selections
function clearAllIssuers() {
    const checkboxes = document.querySelectorAll('.issuer-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    updateSelectedCount();
    updateSelectAllCheckbox();
}

// Toggle all issuers from header checkbox
function toggleAllIssuers(selectAllCheckbox) {
    const checkboxes = document.querySelectorAll('.issuer-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
    updateSelectedCount();
}

// Update selected count display
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.issuer-checkbox:checked');
    const countElement = document.getElementById('selectedCount');
    if (countElement) {
        countElement.textContent = checkboxes.length;
    }
    updateSelectAllCheckbox();
}

// Update the state of select all checkbox
function updateSelectAllCheckbox() {
    const allCheckboxes = document.querySelectorAll('.issuer-checkbox');
    const checkedCheckboxes = document.querySelectorAll('.issuer-checkbox:checked');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    if (selectAllCheckbox) {
        if (checkedCheckboxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCheckboxes.length === allCheckboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
}

// Apply issuer filter
async function applyIssuerFilter() {
    try {
        const checkboxes = document.querySelectorAll('.issuer-checkbox:checked');
        const selectedIssuers = Array.from(checkboxes).map(cb => cb.value);
        
        const response = await fetchWithCredentials('/api/admin/set-selected-issuers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ selectedIssuers })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        
        if (selectedIssuers.length === 0) {
            showAlert('Filter cleared - all issuer data will be shown', 'info');
        } else {
            showAlert(`Filter applied to ${selectedIssuers.length} issuers`, 'success');
        }
        
        // Refresh current section data if applicable
        const currentSection = document.querySelector('.content-section:not([style*="display: none"])');
        if (currentSection) {
            const sectionId = currentSection.id.replace('-section', '');
            if (sectionId === 'dashboard') {
                loadDashboardData();
            } else if (sectionId === 'proposals') {
                loadProposalsData();
            } else if (sectionId === 'outreach') {
                loadOutreachLogs();
            }
        }
        
    } catch (error) {
        showAlert('Error applying filter: ' + error.message, 'danger');
    }
}

// Show application logs
async function showApplicationLogs() {
    if (!isAdminAuthenticated) {
        showAlert('Admin authentication required', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/logs');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const logs = await response.json();
        const resultDiv = document.getElementById('systemInfoResult');
        
        resultDiv.innerHTML = `
            <div class="card mt-2">
                <div class="card-body">
                    <h6>Recent Application Logs</h6>
                    <pre style="height: 300px; overflow-y: auto; font-size: 12px;">${logs.logs || 'No logs available'}</pre>
                </div>
            </div>
        `;
    } catch (error) {
        document.getElementById('systemInfoResult').innerHTML = 
            `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
}

// User management functions (placeholders for future implementation)
function showUsers() {
    if (!isAdminAuthenticated) {
        showAlert('Admin authentication required', 'warning');
        return;
    }
    
    document.getElementById('userManagementResult').innerHTML = 
        `<div class="alert alert-info">User management feature coming soon...</div>`;
}

function addUser() {
    if (!isAdminAuthenticated) {
        showAlert('Admin authentication required', 'warning');
        return;
    }
    
    document.getElementById('userManagementResult').innerHTML = 
        `<div class="alert alert-info">Add user feature coming soon...</div>`;
}

function managePermissions() {
    if (!isAdminAuthenticated) {
        showAlert('Admin authentication required', 'warning');
        return;
    }
    
    document.getElementById('userManagementResult').innerHTML = 
        `<div class="alert alert-info">Permission management feature coming soon...</div>`;
}

// Manage databases - show comprehensive database and table information
async function manageDatabases() {
    if (!isAdminAuthenticated) {
        showAlert('Admin authentication required', 'warning');
        return;
    }
    
    try {
        const response = await fetchWithCredentials('/api/admin/manage-database');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const resultDiv = document.getElementById('databaseManagementResult');
        
        // Update database selector if it exists
        if (data.databases && data.currentDatabase) {
            updateDatabaseSelector(data.databases, data.currentDatabase);
        }
        
        let html = `
            <div class="card mt-2">
                <div class="card-header">
                    <h6><i class="fas fa-server me-2"></i>Database Management Overview</h6>
                </div>
                <div class="card-body">`;
        
        // Show databases
        if (data.databases && data.databases.length > 0) {
            html += `
                <div class="mb-4">
                    <h6><i class="fas fa-database me-2"></i>Available Databases</h6>
                    <div class="table-responsive">
                        <table class="table table-sm table-striped">
                            <thead>
                                <tr>
                                    <th>Database Name</th>
                                    <th>Size (MB)</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>`;
            
            data.databases.forEach(db => {
                html += `
                    <tr${db.current ? ' class="table-primary"' : ''}>
                        <td>${escapeHtml(db.name)}</td>
                        <td>${parseFloat(db.size_mb || 0).toFixed(2)}</td>
                        <td>
                            ${db.current ? '<span class="badge bg-primary">Current</span>' : '<span class="badge bg-secondary">Available</span>'}
                        </td>
                    </tr>`;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>`;
        }
        
        // Show tables for current database
        if (data.tables && data.tables.length > 0) {
            html += `
                <div class="mb-4">
                    <h6><i class="fas fa-table me-2"></i>Tables in ${escapeHtml(data.currentDatabase)}</h6>
                    <div class="table-responsive">
                        <table class="table table-sm table-striped">
                            <thead>
                                <tr>
                                    <th>Table Name</th>
                                    <th>Records</th>
                                    <th>Size (MB)</th>
                                    <th>Engine</th>
                                </tr>
                            </thead>
                            <tbody>`;
            
            data.tables.forEach(table => {
                html += `
                    <tr>
                        <td>${escapeHtml(table.table_name)}</td>
                        <td>${(table.table_rows || 0).toLocaleString()}</td>
                        <td>${parseFloat(table.size_mb || 0).toFixed(2)}</td>
                        <td>${escapeHtml(table.engine || '-')}</td>
                    </tr>`;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>`;
        }
        
        // Show summary
        if (data.summary) {
            html += `
                <div class="row">
                    <div class="col-md-6">
                        <h6><i class="fas fa-chart-pie me-2"></i>Summary</h6>
                        <ul class="list-unstyled">
                            <li><strong>Total Tables:</strong> ${data.summary.total_tables || 0}</li>
                            <li><strong>Total Records:</strong> ${(data.summary.total_records || 0).toLocaleString()}</li>
                            <li><strong>Total Size:</strong> ${parseFloat(data.summary.total_size_mb || 0).toFixed(2)} MB</li>
                        </ul>
                    </div>
                </div>`;
        }
        
        html += `
                </div>
            </div>`;
        
        resultDiv.innerHTML = html;
        
    } catch (error) {
        console.error('Error managing databases:', error);
        document.getElementById('databaseManagementResult').innerHTML = 
            `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
}

// Update database selector dropdown
function updateDatabaseSelector(databases, currentDatabase) {
    const selector = document.getElementById('databaseSelector');
    const currentInfo = document.getElementById('currentDatabaseInfo');
    
    if (!selector || !currentInfo) return;
    
    // Clear existing options
    selector.innerHTML = '';
    
    // Add database options
    databases.forEach(db => {
        const option = document.createElement('option');
        option.value = db.name;
        option.textContent = `${db.name} (${parseFloat(db.size_mb || 0).toFixed(2)} MB)`;
        if (db.current) {
            option.selected = true;
        }
        selector.appendChild(option);
    });
    
    // Update current database info
    currentInfo.textContent = `Current: ${currentDatabase}`;
}

// Set target database
async function setTargetDatabase() {
    if (!isAdminAuthenticated) {
        showAlert('Admin authentication required', 'warning');
        return;
    }
    
    const selector = document.getElementById('databaseSelector');
    const selectedDatabase = selector.value;
    
    if (!selectedDatabase) {
        showAlert('Please select a database', 'warning');
        return;
    }
    
    try {
        const response = await fetchWithCredentials('/api/admin/set-database', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ database: selectedDatabase })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(`Database switched to ${result.currentDatabase}`, 'success');
            
            // Update current database info
            const currentInfo = document.getElementById('currentDatabaseInfo');
            if (currentInfo) {
                currentInfo.textContent = `Current: ${result.currentDatabase}`;
            }
            
            // Refresh database management if it's currently displayed
            const resultDiv = document.getElementById('databaseManagementResult');
            if (resultDiv && resultDiv.innerHTML.includes('Database Management Overview')) {
                manageDatabases();
            }
            
        } else {
            showAlert('Failed to switch database', 'danger');
        }
        
    } catch (error) {
        console.error('Error setting database:', error);
        showAlert('Error setting database: ' + error.message, 'danger');
    }
}

// Load database selector on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize database selector when page loads
    if (document.getElementById('databaseSelector')) {
        // Load initial database information - but only if admin is authenticated
        setTimeout(() => {
            if (isAdminAuthenticated) {
                manageDatabases().catch(console.error);
            }
        }, 1000);
    }
});
