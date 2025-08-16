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
            loadAccounts();
            break;
        case 'outreach':
            loadOutreachLogs();
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
    
    try {
        tbody.innerHTML = proposals.map(proposal => `
            <tr>
                <td>${proposal.id}</td>
                <td>${proposal.proposal_master_skey || '-'}</td>
                <td>${proposal.director_master_skey || '-'}</td>
                <td class="text-truncate" style="max-width: 150px;" title="${(proposal.issuer_name || '').replace(/"/g, '&quot;')}">${proposal.issuer_name || '-'}</td>
                <td>${proposal.category || '-'}</td>
                <td>
                    <span class="badge ${proposal.prediction_correct ? 'bg-success' : 'bg-danger'}">
                        ${proposal.prediction_correct ? 'Correct' : 'Incorrect'}
                    </span>
                </td>
                <td>
                    <span class="badge ${proposal.approved ? 'bg-success' : 'bg-secondary'}">
                        ${proposal.approved ? 'Yes' : 'No'}
                    </span>
                </td>
                <td>${proposal.for_percentage ? parseFloat(proposal.for_percentage).toFixed(2) + '%' : '-'}</td>
                <td>${proposal.against_percentage ? parseFloat(proposal.against_percentage).toFixed(2) + '%' : '-'}</td>
                <td>
                    <div class="btn-group" role="group" aria-label="Actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewProposalDetails(${proposal.id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <!-- New: show accounts button -->
                        <button class="btn btn-sm btn-outline-secondary ms-1" onclick="viewProposalAccounts(${proposal.id})" title="Show Accounts">
                            <i class="fas fa-table"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
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
    
    // Create a simple modal to show proposal details
    const modalContent = `
        <div class="modal fade" id="proposalDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Proposal Details - ID: ${proposal.id}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <strong>Proposal Master Key:</strong><br>${proposal.proposal_master_skey || 'N/A'}<br><br>
                                <strong>Director Master Key:</strong><br>${proposal.director_master_skey || 'N/A'}<br><br>
                                <strong>Issuer Name:</strong><br>${proposal.issuer_name || 'N/A'}<br><br>
                                <strong>Category:</strong><br>${proposal.category || 'N/A'}<br><br>
                                <strong>Subcategory:</strong><br>${proposal.subcategory || 'N/A'}<br><br>
                            </div>
                            <div class="col-md-6">
                                <strong>Job Number:</strong><br>${proposal.job_number || 'N/A'}<br><br>
                                <strong>Prediction Correct:</strong><br>
                                <span class="badge ${proposal.prediction_correct ? 'bg-success' : 'bg-danger'}">
                                    ${proposal.prediction_correct ? 'Yes' : 'No'}
                                </span><br><br>
                                <strong>Approved:</strong><br>
                                <span class="badge ${proposal.approved ? 'bg-success' : 'bg-secondary'}">
                                    ${proposal.approved ? 'Yes' : 'No'}
                                </span><br><br>
                                <strong>For %:</strong><br>${proposal.for_percentage ? proposal.for_percentage.toFixed(2) + '%' : 'N/A'}<br><br>
                                <strong>Against %:</strong><br>${proposal.against_percentage ? proposal.against_percentage.toFixed(2) + '%' : 'N/A'}<br><br>
                                <strong>Abstain %:</strong><br>${proposal.abstain_percentage ? proposal.abstain_percentage.toFixed(2) + '%' : 'N/A'}<br><br>
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-12">
                                <strong>Final Key:</strong><br>
                                <div class="text-muted small" style="max-height: 100px; overflow-y: auto;">
                                    ${proposal.final_key || 'N/A'}
                                </div>
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-12">
                                <strong>Proposal:</strong><br>
                                <div class="text-muted small" style="max-height: 100px; overflow-y: auto;">
                                    ${proposal.proposal || 'N/A'}
                                </div>
                            </div>
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

function renderAccountsTable() {
    const tbody = document.getElementById('accountsTableBody');
    
    if (accounts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>No accounts found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = accounts.map(account => `
        <tr>
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
    `).join('');
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
    const cardBodies = document.querySelectorAll('.card .card-body');
    for (const cb of cardBodies) {
        const h6 = cb.querySelector('h6');
        if (h6 && h6.textContent && h6.textContent.trim().includes('Data Legend')) {
            return cb;
        }
    }
    return null;
}

// Initialize original legend HTML on first DOM ready
document.addEventListener('DOMContentLoaded', function() {
    try {
        const cb = findDataLegendCardBody();
        if (cb) _originalDataLegendHTML = cb.innerHTML;
    } catch (e) {
        console.warn('Could not capture original Data Legend HTML', e);
    }
});

function renderProposalLegendSummary(summary) {
    // summary: { predicted_for_shares, predicted_against_shares, predicted_unvoted_shares }
    const cb = findDataLegendCardBody();
    if (!cb) return;
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
                </ul>
            </div>
        </div>
    `;
}

function restoreOriginalProposalLegend() {
    const cb = findDataLegendCardBody();
    if (!cb) return;
    if (_originalDataLegendHTML !== null) cb.innerHTML = _originalDataLegendHTML;
}

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
    const commonExclusions = ['row_index', 'unnamed_col', 'created_at'];
    // Show score_model2 / prediction_model2 for VOTED accounts
    // and score_model1 / prediction_model1 for UNVOTED accounts.
    const votedExclusions = [...commonExclusions, 'score_model1', 'prediction_model1'];
    const unvotedExclusions = [...commonExclusions, 'score_model2', 'prediction_model2'];

    const votedHeaders = allHeaders.filter(h => !votedExclusions.includes(h));
    const unvotedHeaders = allHeaders.filter(h => !unvotedExclusions.includes(h));

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

    // Build proposal-level predicted share summary
    (function computeAndRenderSummary() {
        // Prefer prediction_model2, then model1, then any prediction field
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
            // fallback: cannot find prediction field; set N/A
            renderProposalLegendSummary({ predicted_for_shares: 'N/A', predicted_against_shares: 'N/A', predicted_unvoted_shares: formatNumberWithCommas(predicted_unvoted) });
        } else {
            renderProposalLegendSummary({ predicted_for_shares: formatNumberWithCommas(predicted_for), predicted_against_shares: formatNumberWithCommas(predicted_against), predicted_unvoted_shares: formatNumberWithCommas(predicted_unvoted) });
        }
    })();

    // Table builder (keeps existing behavior but without debug elements)
    function buildTableHTML(rows, headers, sidePrefix) {
        if (!rows || rows.length === 0) {
            return `<div class="text-center text-muted py-4">No records</div>`;
        }

        const filterRowCells = headers.map(h => {
            if (h === 'account_type') {
                const uniqueValues = [...new Set(currentProposalAccountsState[sidePrefix === 'voted' ? 'rawVoted' : 'rawUnvoted'].map(r => r[h]).filter(v => v))].sort();
                return `<td><select class="form-select form-select-sm" data-filter="${h}" data-side="${sidePrefix}"><option value="">All</option>${uniqueValues.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}</select></td>`;
            } else if (['shares_summable', 'rank_of_shareholding'].includes(h)) {
                const placeholder = h === 'shares_summable' ? 'min' : 'max';
                return `<td><input type="number" class="form-control form-control-sm" data-filter="${h}" data-side="${sidePrefix}" placeholder="${placeholder}" step="any"></td>`;
            } else if (h.startsWith('score_model')) {
                return `<td><input type="number" class="form-control form-control-sm" data-filter="${h}" data-side="${sidePrefix}" placeholder="min" step="any"></td>`;
            } else if (h.startsWith('prediction_model')) {
                // allow filtering by prediction (1 or 0)
                return `<td><select class="form-select form-select-sm" data-filter="${h}" data-side="${sidePrefix}"><option value="">All</option><option value="1">1</option><option value="0">0</option></select></td>`;
            } else {
                return `<td></td>`;
            }
        }).join('');

        const headerRowCells = headers.map(h => {
            const sortable = ['account_type', 'shares_summable', 'rank_of_shareholding'].includes(h) || h.startsWith('score_model');
            if (sortable) {
                return `<th style="min-width:110px; cursor:pointer;" onclick="toggleSort('${h}', '${sidePrefix}')">${escapeHtml(h)} <span id="${sidePrefix}_sort_${h}" class="text-muted">↕</span></th>`;
            } else {
                return `<th style="min-width:110px;">${escapeHtml(h)}</th>`;
            }
        }).join('');

        const thead = `<thead class="table-light"><tr>${headerRowCells}</tr><tr>${filterRowCells}</tr></thead>`;

        const CHUNK = 200;
        const visibleRows = rows._visibleCount || CHUNK;
        const bodyRows = rows.slice(0, visibleRows);
        const tbody = `<tbody>${bodyRows.map(row => `<tr>${headers.map(h => `<td title="${escapeHtml(row[h])}">${escapeHtml(row[h])}</td>`).join('')}<td>${row.account_id ? `<button class="btn btn-sm btn-outline-primary" onclick="window.location.href='account.html?id=${encodeURIComponent(row.account_id)}'" title="View Account"><i class="fas fa-user"></i></button>` : ''}</td></tr>`).join('')}</tbody>`;
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

        const headers = side === 'voted' ? votedHeaders : unvotedHeaders;
        const scoreField = headers.find(h => h && h.startsWith && h.startsWith('score_model')) || null;
        const scoreEl = scoreField ? contentElem.querySelector(`[data-side="${side}"] [data-filter="${scoreField}"]`) : null;

        const accountType = accTypeEl?.value || '';
        const sharesMin = parseNumberRaw(sharesEl?.value);
        const rankMax = parseNumberRaw(rankEl?.value);
        const scoreMin = scoreEl ? parseNumberRaw(scoreEl?.value) : null;

        return { accountType, sharesMin, rankMax, scoreMin };
    }

    function formatActiveFiltersSummary(f) {
        if (!f) return 'None';
        const parts = [];
        if (f.accountType) parts.push(`Type: ${escapeHtml(f.accountType)}`);
        if (f.sharesMin !== undefined && f.sharesMin !== null) parts.push(`Shares ≥ ${f.sharesMin}`);
        if (f.rankMax !== undefined && f.rankMax !== null) parts.push(`Rank ≤ ${f.rankMax}`);
        if (f.scoreMin !== undefined && f.scoreMin !== null) parts.push(`Score ≥ ${f.scoreMin}`);
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

        const leftHtmlFiltered = buildTableHTMLFiltered(filteredVoted, votedHeaders, 'voted');
        const rightHtmlFiltered = buildTableHTMLFiltered(filteredUnvoted, unvotedHeaders, 'unvoted');
        if (!contentElem) return;
        contentElem.innerHTML = `
            <div class="row">
                <div class="col-lg-6 mb-3" data-side="voted">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <h6 class="mb-0">Voted Accounts <small class="text-muted">(Total: ${votedPagination.total || voted.length})</small></h6>
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
                            <h6 class="mb-0">Unvoted Accounts <small class="text-muted">(Total: ${unvotedPagination.total || unvoted.length})</small></h6>
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

// Global function for header click sorting
function toggleSort(field, side) {
    if (!currentProposalAccountsState.sortState) currentProposalAccountsState.sortState = {};
    if (!currentProposalAccountsState.sortState[side]) currentProposalAccountsState.sortState[side] = {};
    
    const sortState = currentProposalAccountsState.sortState[side];
    if (sortState.field === field) {
        // toggle direction
        sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
    } else {
        // new field
        sortState.field = field;
        sortState.dir = 'asc';
    }
    
    // Update UI indicators
    document.querySelectorAll(`[id^="${side}_sort_"]`).forEach(el => el.textContent = '↕');
    const indicator = document.getElementById(`${side}_sort_${field}`);
    if (indicator) {
        indicator.textContent = sortState.dir === 'asc' ? '↑' : '↓';
    }
    
    // re-render with new sort
    renderProposalAccountsInline({id: currentProposalAccountsState.proposalId, issuer_name: ''}, {
        voted: currentProposalAccountsState.rawVoted,
        unvoted: currentProposalAccountsState.rawUnvoted,
        pagination: currentProposalAccountsState.pagination
    });
}

function returnToProposalView() {
    // Hide inline container and show proposals section
    const container = document.getElementById('proposalAccountsContainer');
    if (container) container.style.display = 'none';
    // Restore proposals table/card
    const proposalsCard = document.getElementById('proposalsCard');
    if (proposalsCard) proposalsCard.style.display = 'block';
    // Refresh proposals table to ensure data is visible
    loadProposalsTable();
    restoreOriginalProposalLegend();
}

// Change page for Voted accounts (separate from Unvoted)
function changeVotedAccountsPage(page) {
    if (!currentProposalAccountsState || !currentProposalAccountsState.proposalId) return;
    const params = new URLSearchParams();
    if (currentProposalAccountsState.keyParam && currentProposalAccountsState.keyValue !== undefined) {
        params.append(currentProposalAccountsState.keyParam, String(currentProposalAccountsState.keyValue));
    }
    params.append('voted_page', String(page));
    params.append('limit', String(currentProposalAccountsState.limit || 1000));

    // Optionally include persisted filters if backend supports them
    const f = currentProposalAccountsState.filters || {};
    if (f.voted) {
        Object.keys(f.voted).forEach(k => {
            const val = f.voted[k];
            if (val !== undefined && val !== null && val !== '') params.append(`voted_${k}`, String(val));
        });
    }
    if (f.unvoted) {
        Object.keys(f.unvoted).forEach(k => {
            const val = f.unvoted[k];
            if (val !== undefined && val !== null && val !== '') params.append(`unvoted_${k}`, String(val));
        });
    }

    fetch(`${API_BASE}/api/proposal-accounts?${params.toString()}`)
        .then(r => r.json())
        .then(data => {
            // Update only voted side
            if (Array.isArray(data.voted)) {
                currentProposalAccountsState.rawVoted = data.voted;
            }
            // Merge pagination, preserve other side
            currentProposalAccountsState.pagination = data.pagination || currentProposalAccountsState.pagination || {};
            if (currentProposalAccountsState.pagination.voted) {
                currentProposalAccountsState.pagination.voted.current_page = (data.pagination && data.pagination.voted && data.pagination.voted.current_page) ? data.pagination.voted.current_page : page;
            }
            // Re-render inline view
            renderProposalAccountsInline({ id: currentProposalAccountsState.proposalId, issuer_name: '' }, {
                voted: currentProposalAccountsState.rawVoted,
                unvoted: currentProposalAccountsState.rawUnvoted,
                pagination: currentProposalAccountsState.pagination
            });
        })
        .catch(err => {
            console.error('Error fetching voted accounts page', err);
            showAlert('Error fetching voted accounts page', 'danger');
        });
}

// Change page for Unvoted accounts (separate from Voted)
function changeUnvotedAccountsPage(page) {
    if (!currentProposalAccountsState || !currentProposalAccountsState.proposalId) return;
    const params = new URLSearchParams();
    if (currentProposalAccountsState.keyParam && currentProposalAccountsState.keyValue !== undefined) {
        params.append(currentProposalAccountsState.keyParam, String(currentProposalAccountsState.keyValue));
    }
    params.append('unvoted_page', String(page));
    params.append('limit', String(currentProposalAccountsState.limit || 1000));

    const f = currentProposalAccountsState.filters || {};
    if (f.voted) {
        Object.keys(f.voted).forEach(k => {
            const val = f.voted[k];
            if (val !== undefined && val !== null && val !== '') params.append(`voted_${k}`, String(val));
        });
    }
    if (f.unvoted) {
        Object.keys(f.unvoted).forEach(k => {
            const val = f.unvoted[k];
            if (val !== undefined && val !== null && val !== '') params.append(`unvoted_${k}`, String(val));
        });
    }

    fetch(`${API_BASE}/api/proposal-accounts?${params.toString()}`)
        .then(r => r.json())
        .then(data => {
            // Update only unvoted side
            if (Array.isArray(data.unvoted)) {
                currentProposalAccountsState.rawUnvoted = data.unvoted;
            }
            currentProposalAccountsState.pagination = data.pagination || currentProposalAccountsState.pagination || {};
            if (currentProposalAccountsState.pagination.unvoted) {
                currentProposalAccountsState.pagination.unvoted.current_page = (data.pagination && data.pagination.unvoted && data.pagination.unvoted.current_page) ? data.pagination.unvoted.current_page : page;
            }
            renderProposalAccountsInline({ id: currentProposalAccountsState.proposalId, issuer_name: '' }, {
                voted: currentProposalAccountsState.rawVoted,
                unvoted: currentProposalAccountsState.rawUnvoted,
                pagination: currentProposalAccountsState.pagination
            });
        })
        .catch(err => {
            console.error('Error fetching unvoted accounts page', err);
            showAlert('Error fetching unvoted accounts page', 'danger');
        });
}
