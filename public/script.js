// Debug area update function (moved to top level for global access)
// Debug legend function removed
// Global variables
let accounts = [];
let outreachLogs = [];
let currentEditingAccount = null;

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
        
        // Try to load accounts and outreach logs if functions exist
        if (typeof loadAccounts === 'function') {
            loadAccounts();
        } else {
            console.log('loadAccounts function not found, skipping...');
        }
        
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
function showSection(sectionName) {
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
    event.target.classList.add('active');
    
    // Load section-specific data
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'proposals':
            loadProposalsData();
            loadProposalsCategories();
            break;
        case 'accounts':
            // Reset any previously selected unvoted account selections on entering Accounts view
            try {
                if (Array.isArray(selectedUnvotedAccountIds)) selectedUnvotedAccountIds.length = 0; else selectedUnvotedAccountIds = [];
            } catch (e) { /* noop */ }
            try {
                if (typeof window !== 'undefined') window.selectedUnvotedProposalAccountIds = [];
            } catch (e) { /* noop */ }
            loadAccounts();
            break;
        case 'outreach':
            loadOutreachLogs();
            break;
        case 'outreach-accounts':
            loadOutreachAccounts();
            break;
    }
}

// Dashboard functions
async function loadDashboardData() {
    console.log('=== loadDashboardData: Starting... ===');
    try {
        console.log('loadDashboardData: Making fetch request...');
        const response = await fetch(`${API_BASE}/api/dashboard`);
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
        
        const predictionFilter = document.getElementById('predictionFilter')?.value || '';
        const approvalFilter = document.getElementById('approvalFilter')?.value || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const searchTerm = document.getElementById('proposalSearchInput')?.value || '';
        
        let url = `${API_BASE}/api/proposals?page=${currentProposalsPage}&limit=50`;
        
        if (predictionFilter) url += `&prediction_correct=${predictionFilter}`;
        if (approvalFilter) url += `&approved=${approvalFilter}`;
        if (categoryFilter) url += `&category=${encodeURIComponent(categoryFilter)}`;
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
        
        console.log('Fetching proposals from:', url);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('Proposals response:', data);
        
        proposals = data.proposals;
        totalProposalsPages = data.pagination.total_pages;
        
        renderProposalsTable();
        renderProposalsPagination(data.pagination);
        
        console.log('Proposals table rendered successfully');
        
    } catch (error) {
        console.error('Error loading proposals table:', error);
        showAlert('Error loading proposals table', 'danger');
    }
}

async function loadProposalsCategories() {
    try {
        const response = await fetch(`${API_BASE}/api/proposals/categories`);
        const categories = await response.json();
        
        const categorySelect = document.getElementById('categoryFilter');
        if (categorySelect) {
            // Clear existing options except "All Categories"
            categorySelect.innerHTML = '<option value="">All Categories</option>';
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderProposalsTable() {
    console.log('renderProposalsTable called with', proposals.length, 'proposals');
    
    const tbody = document.getElementById('proposalsTableBody');
    
    if (!tbody) {
        console.error('proposalsTableBody element not found!');
        return;
    }
    
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

function filterProposals() {
    currentProposalsPage = 1;
    loadProposalsTable();
}

function searchProposals() {
    currentProposalsPage = 1;
    loadProposalsTable();
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
async function loadAccounts() {
    try {
        const votingStatus = document.getElementById('votingStatusFilter')?.value || '';
        const outreachStatus = document.getElementById('outreachStatusFilter')?.value || '';
        
        let url = `${API_BASE}/api/accounts`;
        const params = new URLSearchParams();
        
        if (votingStatus) params.append('voting_status', votingStatus);
        if (outreachStatus) params.append('status', outreachStatus);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await fetch(url);
        accounts = await response.json();
        
        renderAccountsTable();
        
    } catch (error) {
        console.error('Error loading accounts:', error);
        showAlert('Error loading accounts', 'danger');
    }
}

// Track selected unvoted account IDs
let selectedUnvotedAccountIds = [];

function renderAccountsTable() {
    const tbody = document.getElementById('accountsTableBody');
    if (accounts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>No accounts found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = accounts.map(account => {
        const isUnvoted = account.voting_status === 'unvoted';
        const checked = isUnvoted && (selectedUnvotedAccountIds || []).map(String).includes(String(account.account_id)) ? 'checked' : '';
        // Normalize shares to a number for embedding in the checkbox
        const rawShares = account.shares_summable;
        let sharesVal = (rawShares === null || rawShares === undefined || rawShares === '') ? 0 : (typeof rawShares === 'string' ? rawShares.replace(/,/g, '').trim() : rawShares);
        const sharesNum = Number.isFinite(Number(sharesVal)) ? Number(sharesVal) : 0;
        return `
        <tr>
            <td>${isUnvoted ? `<input type="checkbox" class="unvoted-account-checkbox" id="unvoted-account-checkbox-${account.account_id}" data-account-id="${account.account_id}" data-shares="${sharesNum}" ${checked}>` : ''}</td>
            <td>${account.account_id || ''}</td>
            <td>${account.account_name || ''}</td>
            <td>
                <span class="badge status-badge voting-status-${account.voting_status}">
                    ${account.voting_status || 'unknown'}
                </span>
            </td>
            <td class="contact-info">${account.contact_email || '-'}</td>
            <td>
                <span class="badge status-badge outreach-status-${account.outreach_status}">
                    ${account.outreach_status || 'pending'}
                </span>
            </td>
            <td>${account.last_contact_date ? formatDate(account.last_contact_date) : '-'}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="editAccount('${account.account_id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteAccount('${account.account_id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');

    // Add event listeners for checkboxes
    document.querySelectorAll('.unvoted-account-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            const accountId = String(this.getAttribute('data-account-id'));
            if (this.checked) {
                if (!(selectedUnvotedAccountIds || []).map(String).includes(accountId)) selectedUnvotedAccountIds.push(accountId);
            } else {
                selectedUnvotedAccountIds = (selectedUnvotedAccountIds || []).filter(id => String(id) !== accountId);
            }
            updateSelectedUnvotedSharesLegend();
        });
    });
    updateSelectedUnvotedSharesLegend();
}

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

function filterAccounts() {
    loadAccounts();
}

function searchAccounts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm) {
        renderAccountsTable();
        return;
    }
    
    const filteredAccounts = accounts.filter(account => 
        (account.account_id && account.account_id.toLowerCase().includes(searchTerm)) ||
        (account.account_name && account.account_name.toLowerCase().includes(searchTerm)) ||
        (account.contact_email && account.contact_email.toLowerCase().includes(searchTerm))
    );
    
    const originalAccounts = accounts;
    accounts = filteredAccounts;
    renderAccountsTable();
    accounts = originalAccounts;
}

function showAddAccountModal() {
    currentEditingAccount = null;
    document.getElementById('accountModalTitle').textContent = 'Add Account';
    document.getElementById('accountForm').reset();
    document.getElementById('accountId').value = '';
    document.getElementById('accountIdInput').disabled = false;
    
    const modal = new bootstrap.Modal(document.getElementById('accountModal'));
    modal.show();
}

async function editAccount(accountId) {
    try {
        const response = await fetch(`${API_BASE}/api/accounts/${accountId}`);
        const account = await response.json();
        
        currentEditingAccount = accountId;
        document.getElementById('accountModalTitle').textContent = 'Edit Account';
        
        // Populate form
        document.getElementById('accountId').value = account.account_id;
        document.getElementById('accountIdInput').value = account.account_id;
        document.getElementById('accountIdInput').disabled = true;
        document.getElementById('accountNameInput').value = account.account_name || '';
        document.getElementById('votingStatusInput').value = account.voting_status || 'unvoted';
        document.getElementById('contactEmailInput').value = account.contact_email || '';
        document.getElementById('contactPhoneInput').value = account.contact_phone || '';
        document.getElementById('outreachStatusInput').value = account.outreach_status || 'pending';
        document.getElementById('lastContactDateInput').value = account.last_contact_date ? account.last_contact_date.split('T')[0] : '';
        document.getElementById('notesInput').value = account.notes || '';
        
        const modal = new bootstrap.Modal(document.getElementById('accountModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading account:', error);
        showAlert('Error loading account details', 'danger');
    }
}

async function saveAccount() {
    const accountData = {
        account_id: document.getElementById('accountIdInput').value,
        account_name: document.getElementById('accountNameInput').value,
        voting_status: document.getElementById('votingStatusInput').value,
        contact_email: document.getElementById('contactEmailInput').value,
        contact_phone: document.getElementById('contactPhoneInput').value,
        outreach_status: document.getElementById('outreachStatusInput').value,
        last_contact_date: document.getElementById('lastContactDateInput').value || null,
        notes: document.getElementById('notesInput').value
    };
    
    try {
        let response;
        if (currentEditingAccount) {
            // Update existing account
            response = await fetch(`${API_BASE}/api/accounts/${currentEditingAccount}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(accountData)
            });
        } else {
            // Create new account
            response = await fetch(`${API_BASE}/api/accounts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(accountData)
            });
        }
        
        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('accountModal'));
            modal.hide();
            
            showAlert(
                currentEditingAccount ? 'Account updated successfully' : 'Account created successfully',
                'success'
            );
            
            loadAccounts();
            loadDashboardData();
        } else {
            const error = await response.json();
            showAlert('Error saving account: ' + error.error, 'danger');
        }
        
    } catch (error) {
        console.error('Error saving account:', error);
        showAlert('Error saving account', 'danger');
    }
}

async function deleteAccount(accountId) {
    if (!confirm('Are you sure you want to delete this account?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/accounts/${accountId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Account deleted successfully', 'success');
            loadAccounts();
            loadDashboardData();
        } else {
            const error = await response.json();
            showAlert('Error deleting account: ' + error.error, 'danger');
        }
        
    } catch (error) {
        console.error('Error deleting account:', error);
        showAlert('Error deleting account', 'danger');
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
            loadAccounts(); // Refresh accounts to update last contact date
            
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
                loadAccounts();
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

// enhance state to remember filters
currentProposalAccountsState.filters = currentProposalAccountsState.filters || {
    voted: {},
    unvoted: {}
};

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

    // Calculate additional shares needed if for < against
    let additionalSharesNeeded = '';
    if (forShares !== 'N/A' && againstShares !== 'N/A') {
        const forNum = parseFloat(String(forShares).replace(/,/g, ''));
        const againstNum = parseFloat(String(againstShares).replace(/,/g, ''));
        if (!isNaN(forNum) && !isNaN(againstNum) && forNum < againstNum) {
            const needed = againstNum - forNum;
            const formattedNeeded = needed.toLocaleString('en-US', {maximumFractionDigits: 2});
            additionalSharesNeeded = `<li><strong style="color: red;">Additional Shares Needed to Pass:</strong> <span style="color: red; font-weight: bold;">${formattedNeeded}</span></li>`;
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

    params.append('page', String(page));
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
        
        // Auto-select accounts that are already in outreach table
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
    const votedExclusions = [...commonExclusions, 'score_model1', 'prediction_model1'];
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

        // sum unvoted shares
        predicted_unvoted = (unvoted || []).reduce((acc, r) => {
            const v = r && r.shares_summable !== undefined && r.shares_summable !== null ? parseNumberRaw(r.shares_summable) : null;
            return acc + (v === null ? 0 : v);
        }, 0);

        if (predField) {
            const allRows = [...(voted || []), ...(unvoted || [])];
            allRows.forEach(r => {
                const s = r && r.shares_summable !== undefined && r.shares_summable !== null ? parseNumberRaw(r.shares_summable) : null;
                const p = r && (r[predField] === 1 || r[predField] === '1' || r[predField] === true) ? 1 : (r && (r[predField] === 0 || r[predField] === '0' || r[predField] === false) ? 0 : null);
                if (s !== null && p === 1) predicted_for += s;
                if (s !== null && p === 0) predicted_against += s;
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
                return '<th style="width:40px;"></th>';
            }
            
            // Create display name with explanations for specific columns
            let displayName = h;
            let explanation = '';
            
            if (h === 'Target_encoded') {
                displayName = '🎯 Target_encoded';
                explanation = '<div class="small text-muted mt-1">(0: Unvoted, 1: For, 2: Against)</div>';
            } else if (h === 'score_model2') {
                displayName = 'score_model2';
                explanation = '<div class="small text-muted mt-1">(0: Strong Against ~ 1: Strong For)</div>';
            } else if (h === 'prediction_model2') {
                displayName = 'prediction_model2';
                explanation = '<div class="small text-muted mt-1">(0: Against / 1: For)</div>';
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
                return `<th style="min-width:110px; cursor:pointer;" onclick="toggleSort('${h}', '${sidePrefix}')">${displayName} <span id="${sidePrefix}_sort_${h}" class="text-muted">↕</span>${explanation}</th>`;
            } else {
                return `<th style="min-width:110px;">${displayName}${explanation}</th>`;
            }
        }).join('');

        const thead = `<thead class="table-light"><tr>${headerRowCells}</tr><tr>${filterRowCells}</tr></thead>`;

        const CHUNK = 200;
        const visibleRows = rows._visibleCount || CHUNK;
        const bodyRows = rows.slice(0, visibleRows);
        const tbody = `<tbody>${bodyRows.map((row, idx) => {
            let checkboxCell = '';
            if (addCheckbox) {
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
                // Also maintain compatibility with existing selectedUnvotedProposalRowKeys
                const isInOutreach = row.in_outreach === true;
                const isManuallySelected = window.selectedUnvotedProposalRowKeys && window.selectedUnvotedProposalRowKeys.has(rowKey);
                const isChecked = isInOutreach || isManuallySelected;
                
                // Store the outreach status in the checkbox for reference
                checkboxCell = `<td><input type="checkbox" class="unvoted-proposal-account-checkbox" id="unvoted-proposal-checkbox-${rowKey}" data-row-key="${rowKey}" data-account-id="${row.account_id ?? ''}" data-account-hash-key="${row.account_hash_key ?? ''}" data-shares="${sharesNum}" data-in-outreach="${isInOutreach}" ${isChecked ? 'checked' : ''}></td>`;
            }
            return `<tr>${addCheckbox ? checkboxCell : ''}${headers.map(h => `<td title="${escapeHtml(row[h])}">${escapeHtml(row[h])}</td>`).join('')}<td>${row.account_id ? `<button class="btn btn-sm btn-outline-primary" onclick="window.location.href='account.html?id=${encodeURIComponent(row.account_id)}'" title="View Account"><i class="fas fa-user"></i></button>` : ''}</td></tr>`;
        }).join('')}</tbody>`;
        const moreButton = rows.length > visibleRows ? `<div class="text-center p-2"><button class="btn btn-sm btn-outline-primary" data-visible="${visibleRows}" onclick="(function(btn){const side=btn.closest('.col-lg-6').getAttribute('data-side'); const state = currentProposalAccountsState; const arr = side==='voted'?state.rawVoted:state.rawUnvoted; arr._visibleCount = (arr._visibleCount||${CHUNK}) + ${CHUNK}; renderProposalAccountsInline({id: state.proposalId, issuer_name: ''}, {voted: state.rawVoted, unvoted: state.rawUnvoted, pagination: state.pagination});})(this);">Show more</button></div>` : '';
        return `<div class="table-responsive" style="max-height:500px; overflow:auto;"><table class="table table-sm table-bordered mb-0">${thead}${tbody}</table></div>${moreButton}`;
    }

    // Prepare filters and rendering
    let filteredVoted = currentProposalAccountsState.rawVoted.slice();
    let filteredUnvoted = currentProposalAccountsState.rawUnvoted.slice();

    // Track applied filters (committed) and pending changes
    const appliedFilters = { voted: {}, unvoted: {} };
    const pendingChanged = { voted: false, unvoted: false };

    // Robust numeric parser: strips commas/spaces, returns null for empty/non-numeric
    function parseNumberRaw(raw) {
        if (raw === undefined || raw === null) return null;
        const s = String(raw).trim().replace(/,/g, '');
        if (s === '') return null;
        const n = Number(s);
        if (!isFinite(n)) return null;
        return n;
    }

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

        const accountType = accTypeEl?.value || '';
        const sharesMin = parseNumberRaw(sharesEl?.value);
        const rankMax = parseNumberRaw(rankEl?.value);
        const scoreMin = scoreEl ? parseNumberRaw(scoreEl?.value) : null;
        const targetEncodedValue = targetEncodedEl?.value || '';
        const predictionValue = predictionEl?.value || '';

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
            const p = r && votedPredField ? (r[votedPredField] === 1 || r[votedPredField] === '1' || r[votedPredField] === true) : false;
            return acc + ((s !== null && p) ? s : 0);
        }, 0);

        // compute accumulated 'For' shares for the currently filtered voted rows
        const filteredAccumulatedFor = (filteredVoted || []).reduce((acc, r) => {
            const s = r && r.shares_summable !== undefined && r.shares_summable !== null ? parseNumberRaw(r.shares_summable) : null;
            const p = r && votedPredField ? (r[votedPredField] === 1 || r[votedPredField] === '1' || r[votedPredField] === true) : false;
            return acc + ((s !== null && p) ? s : 0);
        }, 0);

        // compute accumulated 'Unvoted' shares for unvoted rows where prediction_model1 == 0
        const unvotedPredField = unvotedHeaders.includes('prediction_model1') ? 'prediction_model1' : (unvotedHeaders.find(h => h && h.startsWith && h.startsWith('prediction_model')) || null);

        const totalAccumulatedUnvoted = (currentProposalAccountsState.rawUnvoted || []).reduce((acc, r) => {
            const s = r && r.shares_summable !== undefined && r.shares_summable !== null ? parseNumberRaw(r.shares_summable) : null;
            const p = r && unvotedPredField ? (r[unvotedPredField] === 0 || r[unvotedPredField] === '0' || r[unvotedPredField] === false) : false;
            return acc + ((s !== null && p) ? s : 0);
        }, 0);

        const filteredAccumulatedUnvoted = (filteredUnvoted || []).reduce((acc, r) => {
            const s = r && r.shares_summable !== undefined && r.shares_summable !== null ? parseNumberRaw(r.shares_summable) : null;
            const p = r && unvotedPredField ? (r[unvotedPredField] === 0 || r[unvotedPredField] === '0' || r[unvotedPredField] === false) : false;
            return acc + ((s !== null && p) ? s : 0);
        }, 0);

        // Track selected unvoted account IDs for proposal-specific view
        if (!window.selectedUnvotedProposalAccountIds) window.selectedUnvotedProposalAccountIds = [];

        const leftHtmlFiltered = buildTableHTMLFiltered(filteredVoted, votedHeaders, 'voted');
        const rightHtmlFiltered = buildTableHTMLFiltered(filteredUnvoted, unvotedHeaders, 'unvoted');
        if (!contentElem) return;
        contentElem.innerHTML = `
            <div class="row">
                <div class="col-lg-6 mb-3" data-side="voted">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <h6 class="mb-0"><i class="fas fa-check-circle me-2"></i>Voted Accounts <small class="text-muted">(Total: ${votedPagination.total || voted.length})</small></h6>
                            <div class="small text-muted">Total Accumulated For Shares: ${formatNumberWithCommas(totalAccumulatedFor)}</div>
                            <div id="voted_active_filters" class="small text-muted">Active filters: ${formatActiveFiltersSummary(appliedFilters.voted)} • Acc For (applied): ${formatNumberWithCommas(filteredAccumulatedFor)}</div>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-primary" id="voted_apply_filters">Apply</button>
                            <button class="btn btn-sm btn-outline-secondary" id="voted_clear_filters">Clear</button>
                        </div>
                    </div>
                    ${leftHtmlFiltered}
                </div>
                <div class="col-lg-6 mb-3" data-side="unvoted">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <h6 class="mb-0"><i class="fas fa-clock me-2"></i>Unvoted Accounts <small class="text-muted">(Total: ${unvotedPagination.total || unvoted.length})</small></h6>
                            <div class="small text-muted">Total Accumulated Unvoted Shares: ${formatNumberWithCommas(totalAccumulatedUnvoted)}</div>
                            <div id="unvoted_active_filters" class="small text-muted">Active filters: ${formatActiveFiltersSummary(appliedFilters.unvoted)} • Acc Unvoted (applied): ${formatNumberWithCommas(filteredAccumulatedUnvoted)}</div>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-primary" id="unvoted_apply_filters">Apply</button>
                            <button class="btn btn-sm btn-outline-secondary" id="unvoted_clear_filters">Clear</button>
                        </div>
                    </div>
                    ${rightHtmlFiltered}
                </div>
            </div>
        `;

        // wire up per-column input events to mark pending changes (do NOT apply automatically)
        contentElem.querySelectorAll('[data-filter]').forEach(el => {
            // mark pending on input
            el.removeEventListener('input', () => {});
            el.addEventListener('input', function() {
                const side = el.closest('[data-side]')?.getAttribute('data-side');
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
        // Don't call updateSelectedUnvotedProposalSharesLegend here - only call it when checkboxes are actually clicked
        // This ensures the total starts at 0 and only increases when accounts are selected
        // Update Data Legend for selected unvoted proposal accounts
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
                    document.querySelectorAll(`[id^="${side}_sort_"]`).forEach(el => el.textContent = '↕');
                    // update active filters display
                    const activeEl = document.getElementById(`${side}_active_filters`);
                    if (activeEl) activeEl.textContent = `Active filters: ${formatActiveFiltersSummary(appliedFilters[side])}`;
                    // apply and render
                    applyFiltersAndRender();
                };
            }
        });
    }

    // initial render
    renderTables();

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
}

// Add selected unvoted proposal accounts to Outreach group
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
        const keyParam = currentProposalAccountsState?.keyParam;
        const keyValue = currentProposalAccountsState?.keyValue;
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
        loadDashboard();
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
