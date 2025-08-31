// Helper: showProposalConfusionWithFilters (global)
window.showProposalConfusionWithFilters = function() {
    // Always show confusion matrix with current filters
    window.showProposalConfusion();
};
// Fetch all proposals from backend (all pages, not just 50)
async function fetchAllProposals() {
    let allProposals = [];
    let page = 1;
    let totalPages = 1;
    const limit = 1000; // Increase limit to reduce number of requests
    do {
        const url = `${API_BASE ? API_BASE : ''}/api/proposals?page=${page}&limit=${limit}`;
        const response = await (typeof fetchWithCredentials === 'function' ? fetchWithCredentials(url) : fetch(url));
        const data = await response.json();
        if (Array.isArray(data.proposals)) {
            allProposals = allProposals.concat(data.proposals);
        }
        totalPages = data.pagination && data.pagination.total_pages ? data.pagination.total_pages : 1;
        page++;
    } while (page <= totalPages);
    return allProposals;
}
// Debug area update function (moved to top level for global access)
// Debug legend function removed
// Global variables
// FIXED EVENT TARGET BUG - Version 2.0 - 2025-08-23 16:00

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
    
    // First try server-side authentication
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
            return;
        }
    } catch (error) {
        console.warn('Server-side admin login failed, falling back to client-side check:', error);
    }
    
    // Fallback to client-side password check
    if (password === ADMIN_PASSWORD) {
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
        errorDiv.textContent = 'Invalid password. Please try again.';
        errorDiv.style.display = 'block';
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();
    }
}

// Logout from admin (optional - can be called manually)
function adminLogout() {
    isAdminAuthenticated = false;
    showSection('dashboard', null);
    showAlert('Logged out from admin panel', 'info');
}

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
        
        // Setup admin password field Enter key handler
        const passwordField = document.getElementById('adminPassword');
        if (passwordField) {
            passwordField.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    verifyAdminPassword();
                }
            });
        }
        
        // Initialize database selector when page loads
        if (document.getElementById('databaseSelector')) {
            // Load initial database information
            manageDatabases().catch(console.error);
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
        tbody.innerHTML = '<tr><td colspan="19" class="text-center">No proposals found</td></tr>';
        return;
    }
    
    // Only show succinct fields in the main table
    const succinctFields = [
        { key: 'id', label: 'ID' },
        { key: 'proposal_master_skey', label: 'Proposal Master Key' },
        { key: 'director_master_skey', label: 'Director Master Key' },
        { key: 'issuer_name', label: 'Issuer Name' },
        { key: 'category', label: 'Category' },
        { key: 'proposal', label: 'Proposal Content' },
        { key: 'prediction_correct', label: 'Prediction Accuracy' },
        { key: 'approved', label: 'Approved Status' },
        { key: 'for_percentage', label: 'For Percentage' },
        { key: 'against_percentage', label: 'Against Percentage' },
        // Added share summary fields to appear in main view before detailed view
        { key: 'predicted_for_shares', label: 'Predicted For Shares' },
        { key: 'predicted_against_shares', label: 'Predicted Against Shares' },
        { key: 'predicted_abstain_shares', label: 'Predicted Abstain Shares' },
        { key: 'predicted_unvoted_shares', label: 'Predicted Unvoted Shares' },
        { key: 'total_for_shares', label: 'True For' },
        { key: 'total_against_shares', label: 'True Against' },
        { key: 'total_abstain_shares', label: 'True Abstain' },
        { key: 'total_unvoted_shares', label: 'True Unvoted' }
    ];

    // Helper function to truncate text to first N words
    function truncateToWords(text, wordLimit = 10) {
        if (!text || typeof text !== 'string') return '-';
        const words = text.trim().split(/\s+/);
        if (words.length <= wordLimit) return text;
        return words.slice(0, wordLimit).join(' ') + '...';
    }

    // Helper function to escape HTML for safe tooltip display
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // local helper to format numeric share values
    function formatShares(val) {
        if (val === undefined || val === null || val === '') return '-';
        const n = Number(val);
        if (Number.isNaN(n)) return String(val);
        return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }

    try {
        tbody.innerHTML = proposals.map(proposal => {
            return `<tr>` +
                succinctFields.map(field => {
                    if (field.key === 'proposal') {
                        // Try multiple possible field names for proposal content
                        const possibleFieldNames = ['proposal', 'Proposal', 'description', 'text', 'content', 'proposal_text', 'proposal_description'];
                        let proposalText = '-';
                        
                        for (const fieldName of possibleFieldNames) {
                            if (proposal[fieldName] && proposal[fieldName].trim().length > 0) {
                                proposalText = proposal[fieldName];
                                break;
                            }
                        }
                        
                        const truncatedText = truncateToWords(proposalText, 10);
                        const fullText = escapeHtml(proposalText);
                        
                        if (proposalText && proposalText !== '-' && proposalText.trim().length > 0) {
                            return `<td><span class="proposal-content" data-bs-toggle="tooltip" 
                                data-bs-placement="top" title="${fullText}">${truncatedText}</span></td>`;
                        } else {
                            return '<td>-</td>';
                        }
                    } else if (field.key === 'prediction_correct') {
                        return `<td><span class="badge ${proposal.prediction_correct ? 'bg-success' : 'bg-danger'}">${proposal.prediction_correct ? 'Correct' : 'Incorrect'}</span></td>`;
                    } else if (field.key === 'approved') {
                        return `<td><span class="badge ${proposal.approved ? 'bg-success' : 'bg-secondary'}">${proposal.approved ? 'Yes' : 'No'}</span></td>`;
                    } else if (field.key === 'for_percentage' || field.key === 'against_percentage') {
                        const val = proposal[field.key];
                        return `<td>${val !== undefined && val !== null ? (parseFloat(val) * 100).toFixed(2) + '%' : '-'}</td>`;
                    } else if (['predicted_for_shares','predicted_against_shares','predicted_abstain_shares','predicted_unvoted_shares','total_for_shares','total_against_shares','total_abstain_shares','total_unvoted_shares'].includes(field.key)) {
                        return `<td>${formatShares(proposal[field.key])}</td>`;
                    } else if (field.key === 'issuer_name') {
                        return `<td class="text-truncate" style="max-width: 150px;" title="${(proposal.issuer_name || '').replace(/\"/g, '&quot;')}">${proposal.issuer_name || '-'}</td>`;
                    } else {
                        return `<td>${proposal[field.key] !== undefined && proposal[field.key] !== null && proposal[field.key] !== '' ? proposal[field.key] : '-'}</td>`;
                    }
                }).join('') +
                `<td class="text-center">
                    <button class="btn btn-sm btn-outline-info" onclick="showProposalConfusion(${proposal.id})" title="View Confusion Matrix">
                        <i class="fas fa-chart-bar"></i>
                    </button>
                </td>` +
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
        
        // Initialize Bootstrap tooltips for proposal content
        setTimeout(() => {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }, 100);
        
        console.log('Proposals table rendered successfully');
    } catch (error) {
        console.error('Error rendering proposals table:', error);
        tbody.innerHTML = '<tr><td colspan="20" class="text-center text-danger">Error rendering table</td></tr>';
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
    
    // Define fields shown in main table for highlighting
    const mainTableFields = [
        'id', 'proposal_master_skey', 'director_master_skey', 'issuer_name', 'category',
        'proposal', 'prediction_correct', 'approved', 'for_percentage', 'against_percentage',
        'predicted_for_shares', 'predicted_against_shares', 'predicted_abstain_shares', 'predicted_unvoted_shares',
        'total_for_shares', 'total_against_shares', 'total_abstain_shares', 'total_unvoted_shares'
    ];
    
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
        return Object.keys(obj).map(key => {
            const isMainTableField = mainTableFields.includes(key);
            const rowClass = isMainTableField ? 'table-warning' : '';
            const keyClass = isMainTableField ? 'fw-bold text-primary' : 'fw-bold';
            const indicator = isMainTableField ? ' <i class="fas fa-eye text-info" title="Shown in main table"></i>' : '';
            
            return `<tr class="${rowClass}"><td class="${keyClass}">${key}${indicator}</td><td>${renderValue(obj[key], key)}</td></tr>`;
        }).join('');
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
                        <div class="alert alert-info py-2 mb-3" style="font-size: 0.85rem;">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>Legend:</strong> 
                            <span class="badge bg-warning text-dark me-2">Highlighted rows</span> are fields shown in the main proposals table
                            <i class="fas fa-eye text-info ms-1" title="Shown in main table"></i>
                        </div>
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
        const predictionEl = predictionField ? contentElem.querySelector(`[data-side="${side}"]`) : null;

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

// Database Management Functions

// Manage databases - show comprehensive database and table information
async function manageDatabases() {
    if (!isAdminAuthenticated) {
        const success = await promptAdminLogin();
        if (!success) return;
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
                const sizeDisplay = db.size_mb ? parseFloat(db.size_mb).toFixed(2) : 'N/A';
                const statusBadge = db.current ? 
                    '<span class="badge bg-success">Current</span>' : 
                    '<span class="badge bg-secondary">Available</span>';
                    
                html += `
                    <tr>
                        <td><strong>${db.name}</strong></td>
                        <td>${sizeDisplay}</td>
                        <td>${statusBadge}</td>
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
                    <h6><i class="fas fa-table me-2"></i>Tables in '${data.currentDatabase}' Database</h6>
                    <div class="table-responsive">
                        <table class="table table-sm table-striped">
                            <thead>
                                <tr>
                                    <th>Table Name</th>
                                    <th>Records</th>
                                    <th>Size (MB)</th>
                                    <th>Type</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>`;
            
            data.tables.forEach(table => {
                const recordCount = table.table_rows ? table.table_rows.toLocaleString() : '0';
                const sizeDisplay = table.size_mb ? parseFloat(table.size_mb).toFixed(2) : '0.00';
                let tableType = 'Data';
                let typeClass = 'bg-primary';
                
                if (table.table_name.includes('backup')) {
                    tableType = 'Backup';
                    typeClass = 'bg-warning';
                } else if (table.table_name.includes('_logs')) {
                    tableType = 'Logs';
                    typeClass = 'bg-info';
                } else if (table.table_name.includes('proposals')) {
                    tableType = 'Predictions';
                    typeClass = 'bg-success';
                }
                
                html += `
                    <tr>
                        <td><strong>${table.table_name}</strong></td>
                        <td>${recordCount}</td>
                        <td>${sizeDisplay}</td>
                        <td><span class="badge ${typeClass}">${tableType}</span></td>
                        <td>
                            <button class="btn btn-outline-info btn-xs" onclick="showTableDetails('${table.table_name}')" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>`;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>`;
        }
        
        // Show summary statistics
        if (data.summary) {
            html += `
                <div class="row">
                    <div class="col-md-6">
                        <div class="card bg-light">
                            <div class="card-body">
                                <h6><i class="fas fa-chart-pie me-2"></i>Summary Statistics</h6>
                                <div class="row">
                                    <div class="col-6">
                                        <small class="text-muted">Total Tables:</small><br>
                                        <strong>${data.summary.total_tables || 0}</strong>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted">Total Records:</small><br>
                                        <strong>${data.summary.total_records?.toLocaleString() || '0'}</strong>
                                    </div>
                                </div>
                                <div class="row mt-2">
                                    <div class="col-6">
                                        <small class="text-muted">Database Size:</small><br>
                                        <strong>${parseFloat(data.summary.total_size_mb || 0).toFixed(2)} MB</strong>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted">Data Tables:</strong><br>
                                        <strong>${data.summary.data_tables || 0}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card bg-light">
                            <div class="card-body">
                                <h6><i class="fas fa-info-circle me-2"></i>Database Health</h6>
                                <div class="row">
                                    <div class="col-6">
                                        <small class="text-muted">Backup Tables:</small><br>
                                        <strong>${data.summary.backup_tables || 0}</strong>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted">Active Connections:</small><br>
                                        <strong>${data.summary.connections || 'N/A'}</strong>
                                    </div>
                                </div>
                                <div class="row mt-2">
                                    <div class="col-12">
                                        <small class="text-muted">Status:</small><br>
                                        <span class="badge bg-success">Operational</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
        }
        
        html += `
                </div>
            </div>`;
        
        resultDiv.innerHTML = html;
        
    } catch (error) {
        console.error('Error managing databases:', error);
        showAlert('Failed to load database management: ' + error.message, 'error');
        
        const resultDiv = document.getElementById('databaseManagementResult');
        resultDiv.innerHTML = `
            <div class="alert alert-danger mt-2">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error loading database information: ${error.message}
            </div>`;
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
        promptAdminLogin();
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
            showAlert('Failed to switch database', 'error');
        }
        
    } catch (error) {
        console.error('Error setting target database:', error);
        showAlert('Failed to switch database: ' + error.message, 'error');
    }
}

// Show table details (placeholder function)
function showTableDetails(tableName) {
    showAlert(`Table details for '${tableName}' - Feature coming soon!`, 'info');
}

// ========== MISSING FUNCTIONS FROM GITHUB REPOSITORY ==========

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
    if (!proposalsSortState.field) return;
    
    proposals.sort((a, b) => {
        let aVal = a[proposalsSortState.field];
        let bVal = b[proposalsSortState.field];
        
        // Handle null/undefined values
        if (aVal === null || aVal === undefined) aVal = '';
        if (bVal === null || bVal === undefined) bVal = '';
        
        // Convert to strings for comparison
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        
        let comparison = 0;
        if (aVal < bVal) {
            comparison = -1;
        } else if (aVal > bVal) {
            comparison = 1;
        }
        
        return proposalsSortState.dir === 'asc' ? comparison : -comparison;
    });
}

function getContactMethodIcon(method) {
    switch(method) {
        case 'email':
            return 'envelope';
        case 'phone':
            return 'phone';
        case 'meeting':
            return 'users';
        case 'letter':
            return 'mail-bulk';
        default:
            return 'comment';
    }
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

    // Apply the sort using the global render function if available
    if (typeof window.currentRenderFunction === 'function') {
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

// Test function to verify feedback display works
function testFeedback() {
    const dataLegendArea = document.getElementById('dataLegendArea');
    if (dataLegendArea) {
        dataLegendArea.innerHTML = '<div class="alert alert-info">Test feedback message - this should be visible!</div>';
        dataLegendArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        console.log('Test feedback displayed');
    } else {
        console.error('dataLegendArea not found for test');
        showAlert('Test feedback - dataLegendArea not found', 'warning');
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

// Admin authentication state - variables declared earlier in the file

// Prompt for admin login (duplicate removed - using original implementation)

// Verify admin password (duplicate removed - using original implementation)

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
        document.getElementById('databaseStatsResult').innerHTML = `
            <div class="card mt-2">
                <div class="card-body">
                    <h6>Database Statistics</h6>
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Voted Accounts:</strong> ${stats.voted_accounts ? stats.voted_accounts.toLocaleString() : 'N/A'}</p>
                            <p><strong>Unvoted Accounts:</strong> ${stats.unvoted_accounts ? stats.unvoted_accounts.toLocaleString() : 'N/A'}</p>
                            <p><strong>Total Accounts:</strong> ${stats.total_accounts ? stats.total_accounts.toLocaleString() : 'N/A'}</p>
                        </div>
                        <div class="col-md-6">
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
        const response = await fetchWithCredentials('/api/admin/issuers');
        
        if (!response.ok) {
            // API endpoint not implemented yet - show helpful message
            const resultDiv = document.getElementById('systemInfoResult');
            if (resultDiv) {
                resultDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <h6><i class="fas fa-exclamation-triangle me-2"></i>Issuer List Feature</h6>
                        <p>The issuer filtering feature requires server-side implementation of the <code>/api/admin/issuers</code> endpoint.</p>
                        <p><strong>Expected API Response:</strong></p>
                        <pre class="mb-0">[
  {
    "issuer_name": "Company A",
    "proposal_count": 15
  },
  {
    "issuer_name": "Company B", 
    "proposal_count": 8
  }
]</pre>
                        <p class="mt-2 mb-0"><small class="text-muted">Once implemented, this will provide issuer selection and filtering capabilities.</small></p>
                    </div>
                `;
            } else {
                showAlert('Server endpoint /api/admin/issuers not implemented yet', 'warning');
            }
            return;
        }
        
        const issuers = await response.json();
        let html = `
            <div class="card mt-2">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6>Select Issuers for Filtering</h6>
                    <div>
                        <button class="btn btn-sm btn-outline-primary me-2" onclick="selectAllIssuers()">Select All</button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="clearAllIssuers()">Clear All</button>
                    </div>
                </div>
                <div class="card-body" style="max-height: 400px; overflow-y: auto;">
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" id="selectAllCheckbox" onchange="toggleAllIssuers(this)">
                        <label class="form-check-label fw-bold" for="selectAllCheckbox">Select All Issuers</label>
                    </div>
                    <hr>
        `;
        
        issuers.forEach((issuer, index) => {
            html += `
                <div class="form-check">
                    <input class="form-check-input issuer-checkbox" type="checkbox" id="issuer_${index}" value="${issuer.issuer_name}" onchange="updateSelectAllCheckbox()">
                    <label class="form-check-label" for="issuer_${index}">${issuer.issuer_name} (${issuer.proposal_count} proposals)</label>
                </div>
            `;
        });
        
        html += `
                </div>
                <div class="card-footer">
                    <div class="row">
                        <div class="col">
                            <small id="selectedCount" class="text-muted">0 issuers selected</small>
                        </div>
                        <div class="col-auto">
                            <button class="btn btn-primary" onclick="applyIssuerFilter()">Apply Filter</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const resultDiv = document.getElementById('systemInfoResult');
        if (resultDiv) {
            resultDiv.innerHTML = html;
            updateSelectedCount();
        } else {
            showAlert('Could not display issuer list - target element not found', 'error');
        }
        
    } catch (error) {
        console.error('Error in showIssuerList:', error);
        const resultDiv = document.getElementById('systemInfoResult');
        if (resultDiv) {
            resultDiv.innerHTML = `<div class="alert alert-danger">Error loading issuer list: ${error.message}</div>`;
        } else {
            showAlert('Error loading issuer list: ' + error.message, 'error');
        }
    }
}

// Select all issuers
function selectAllIssuers() {
    const checkboxes = document.querySelectorAll('.issuer-checkbox');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    if (checkboxes.length === 0) {
        showAlert('No issuer checkboxes found', 'warning');
        return;
    }
    
    checkboxes.forEach(cb => {
        cb.checked = true;
    });
    
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = true;
    }
    
    updateSelectedCount();
}

// Clear all issuer selections
function clearAllIssuers() {
    const checkboxes = document.querySelectorAll('.issuer-checkbox');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    if (checkboxes.length === 0) {
        showAlert('No issuer checkboxes found', 'warning');
        return;
    }
    
    checkboxes.forEach(cb => {
        cb.checked = false;
    });
    
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
    }
    
    updateSelectedCount();
}

// Toggle all issuers from header checkbox
function toggleAllIssuers(selectAllCheckbox) {
    document.querySelectorAll('.issuer-checkbox').forEach(cb => {
        cb.checked = selectAllCheckbox.checked;
    });
    updateSelectedCount();
}

// Update selected count display
function updateSelectedCount() {
    const checked = document.querySelectorAll('.issuer-checkbox:checked').length;
    const total = document.querySelectorAll('.issuer-checkbox').length;
    const countElement = document.getElementById('selectedCount');
    
    if (countElement) {
        countElement.textContent = `${checked} of ${total} issuers selected`;
    }
}

// Update the state of select all checkbox
function updateSelectAllCheckbox() {
    const checkboxes = document.querySelectorAll('.issuer-checkbox');
    const checkedBoxes = document.querySelectorAll('.issuer-checkbox:checked');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    if (!selectAllCheckbox) {
        return; // Element not found, skip update
    }
    
    if (checkedBoxes.length === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (checkedBoxes.length === checkboxes.length) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.indeterminate = true;
        selectAllCheckbox.checked = false;
    }
    
    updateSelectedCount();
}

// Apply issuer filter
async function applyIssuerFilter() {
    if (!isAdminAuthenticated) {
        showAlert('Admin authentication required', 'warning');
        return;
    }
    
    try {
        const selectedIssuers = Array.from(document.querySelectorAll('.issuer-checkbox:checked'))
            .map(cb => cb.value);
        
        if (selectedIssuers.length === 0) {
            showAlert('Please select at least one issuer', 'warning');
            return;
        }
        
        // Apply filter to backend (implementation depends on backend API)
        const response = await fetchWithCredentials('/api/admin/apply-issuer-filter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ issuers: selectedIssuers })
        });
        
        if (!response.ok) {
            // API endpoint not implemented yet
            showAlert(`Issuer filter API not implemented yet. Selected ${selectedIssuers.length} issuers: ${selectedIssuers.join(', ')}`, 'info');
            return;
        }
        
        const result = await response.json();
        showAlert(`Filter applied to ${selectedIssuers.length} issuers`, 'success');
        
        // Refresh current view if needed
        const currentSection = document.querySelector('.content-section[style*="block"]');
        if (currentSection) {
            const sectionId = currentSection.id.replace('-section', '');
            if (sectionId === 'dashboard') {
                loadDashboardData();
            } else if (sectionId === 'proposals') {
                loadProposalsData();
            }
        }
        
    } catch (error) {
        console.error('Error applying issuer filter:', error);
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

// Extend showSection to handle outreach-accounts
const _orig_showSection = typeof showSection === 'function' ? showSection : null;
window.showSection = function(section) {
    // CRITICAL: Always clean up confusion matrix when switching sections
    // This ensures confusion matrix never coexists with other views
    const confusionContainer = document.getElementById('confusionMatrixContainer');
    if (confusionContainer) {
        // Store the confusion matrix HTML for later restoration if needed
        if (!window.confusionMatrixHTML) {
            window.confusionMatrixHTML = confusionContainer.outerHTML;
            window.confusionMatrixParent = confusionContainer.parentNode;
        }
        
        // Completely remove from DOM
        confusionContainer.remove();
        console.log('Confusion matrix cleaned up during section switch to:', section);
    }
    
    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(el => el.style.display = 'none');
    
    if (section === 'dashboard') {
        { const el = document.getElementById('dashboard-section'); if (el) el.style.display = 'block'; }
        loadDashboardData();
        loadOutreachCount();
        return;
    }
    if (section === 'proposals') {
        { const el = document.getElementById('proposals-section'); if (el) el.style.display = 'block'; }
        loadProposalsData();
        return;
    }
    if (section === 'accounts') {
        { const el = document.getElementById('accounts-section'); if (el) el.style.display = 'block'; }
        // Reset any previously selected unvoted account selections on entering Accounts view
        try {
            if (typeof window !== 'undefined') window.selectedUnvotedProposalAccountIds = [];
        } catch (e) { /* noop */ }
        return;
    }
    if (section === 'outreach-accounts') {
        { const el = document.getElementById('outreach-accounts-section'); if (el) el.style.display = 'block'; }
        loadOutreachAccounts();
        return;
    }
    if (section === 'admin') {
        if (!isAdminAuthenticated) {
            showAlert('Admin authentication required', 'warning');
            window.showSection('dashboard');
            return;
        }
        { const el = document.getElementById('admin-section'); if (el) el.style.display = 'block'; }
        return;
    }
    // Fallback to original handler for other sections
    if (_orig_showSection) return _orig_showSection(section);
};

// Ensure count is loaded on initial dashboard
document.addEventListener('DOMContentLoaded', () => {
    try { loadOutreachCount(); } catch {}
});

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

// Additional missing functions
function renderVotedAccountsTable() {
    // Placeholder function - would need implementation based on specific requirements
    console.log('renderVotedAccountsTable called - placeholder implementation');
    if (typeof window.currentRenderFunction === 'function') {
        window.currentRenderFunction();
    }
}

function renderUnvotedAccountsTable() {
    // Placeholder function - would need implementation based on specific requirements
    console.log('renderUnvotedAccountsTable called - placeholder implementation');
    if (typeof window.currentRenderFunction === 'function') {
        window.currentRenderFunction();
    }
}

function loadDashboard() {
    // Alias for loadDashboardData
    loadDashboardData();
}

// Show proposal confusion matrix
async function showProposalConfusion(proposalId = null) {
    console.log('showProposalConfusion called with proposalId:', proposalId);
    
    try {
        // First, check if confusion matrix exists in DOM, if not restore it
        let confusionContainer = document.getElementById('confusionMatrixContainer');
        if (!confusionContainer && window.confusionMatrixHTML && window.confusionMatrixParent) {
            console.log('Restoring confusion matrix to DOM...');
            // Restore the confusion matrix to the DOM
            window.confusionMatrixParent.insertAdjacentHTML('beforeend', window.confusionMatrixHTML);
            confusionContainer = document.getElementById('confusionMatrixContainer');
        }
        
        const proposalsSection = document.getElementById('proposals-section');
        const confusionTableDiv = document.getElementById('confusionMatrixTable');
        
        console.log('Debug: Elements found:', {
            confusionContainer: !!confusionContainer,
            proposalsSection: !!proposalsSection,
            confusionTableDiv: !!confusionTableDiv
        });
        
        if (!confusionContainer) {
            console.error('confusionMatrixContainer not found and could not be restored!');
            showAlert('Confusion matrix container not found in DOM', 'danger');
            return;
        }
        
        if (!confusionTableDiv) {
            console.error('confusionMatrixTable not found!');
            showAlert('Confusion matrix table element not found in DOM', 'danger');
            return;
        }
        
        // Hide all other sections and show confusion matrix
        document.querySelectorAll('.content-section').forEach(el => el.style.display = 'none');
        if (proposalsSection) proposalsSection.style.display = 'none';
        
        // Show confusion matrix with all visibility properties
        confusionContainer.style.display = 'block';
        confusionContainer.style.opacity = '1';
        confusionContainer.style.visibility = 'visible';
        confusionContainer.style.removeProperty('position');
        confusionContainer.style.removeProperty('left');
        confusionContainer.style.removeProperty('top');
        confusionContainer.style.removeProperty('z-index');
        confusionContainer.classList.remove('hidden');
        
        // Scroll to top
        confusionContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Prepare title
        let titleText = 'All Proposals';
        
        if (proposalId) {
            const proposal = proposals.find(p => p.id == proposalId);
            titleText = proposal ? `Proposal ${proposalId} (${proposal.issuer_name || 'Unknown'})` : `Proposal ${proposalId}`;
        }
        
        // Update title
        const titleElement = confusionContainer.querySelector('h4');
        if (titleElement) {
            titleElement.innerHTML = `<i class="fas fa-chart-bar me-2"></i>Confusion Matrix - ${titleText}`;
        }
        
        // Show loading state briefly
        confusionTableDiv.innerHTML = `
            <div class="text-center p-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Calculating confusion matrix from proposal data...</p>
            </div>
        `;
        
        // Calculate and show real confusion matrix data using ALL proposals
        setTimeout(async () => {
            // If showing all proposals, fetch all pages
            if (!proposalId) {
                try {
                    const allProposals = await fetchAllProposals();
                    if (Array.isArray(allProposals) && allProposals.length > 0) {
                        proposals = allProposals;
                    }
                } catch (e) {
                    console.error('Failed to fetch all proposals for confusion matrix:', e);
                }
            }
            const confusionData = calculateRealConfusionMatrix(proposalId);
            renderConfusionMatrix(confusionData);
        }, 300); // Brief loading animation
        
        /* 
        // Uncomment when API endpoint is ready:
        // Prepare API call
        let apiUrl = '/api/confusion-matrix';
        if (proposalId) {
            apiUrl += `?proposal_id=${proposalId}`;
        }
        
        // Fetch confusion matrix data
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Render confusion matrix
        renderConfusionMatrix(data);
        */
        
    } catch (error) {
        console.error('Error loading confusion matrix:', error);
        
        // Show error state and placeholder data
        const confusionTableDiv = document.getElementById('confusionMatrixTable');
        if (confusionTableDiv) {
            confusionTableDiv.innerHTML = `
                <div class="alert alert-warning">
                    <h6><i class="fas fa-exclamation-triangle me-2"></i>Error Loading Confusion Matrix</h6>
                    <p class="mb-0">${error.message}</p>
                    <small class="text-muted">Showing demo data below.</small>
                </div>
            `;
        }
        
        // Show error state but still try to show real data if possible
        setTimeout(() => {
            const confusionData = calculateRealConfusionMatrix(proposalId);
            renderConfusionMatrix(confusionData);
        }, 500);
    }
}

// Render confusion matrix table and metrics
function renderConfusionMatrix(data) {
    // Default structure if no data provided
    const matrix = data.matrix || {
        'true_positive': 85,
        'false_positive': 12,
        'false_negative': 8,
        'true_negative': 95
    };
    const metrics = data.metrics || calculateMetrics(matrix);
    const dataInfo = data.dataInfo || null;

    // --- Delta1 and Delta2 Regression Metrics ---
    // Helper: calculate Delta1 and Delta2 for a proposal
    function calcDelta1(p) {
        // Delta1 = |Predicted For Shares - True For Shares| / True For Shares
        const pred = Number(p.predicted_for_shares);
        const truth = Number(p.total_for_shares);
        if (!isFinite(pred) || !isFinite(truth) || truth === 0) return null;
        return Math.abs(pred - truth) / Math.abs(truth);
    }
    function calcDelta2(p) {
        // Delta2 = |(Pred For Shares / (Pred For + Pred Against + Pred Abstain)) - (True For Shares / (True For + True Against + True Abstain))|
        const predFor = Number(p.predicted_for_shares);
        const predAgainst = Number(p.predicted_against_shares);
        const predAbstain = Number(p.predicted_abstain_shares);
        const trueFor = Number(p.total_for_shares);
        const trueAgainst = Number(p.total_against_shares);
        const trueAbstain = Number(p.total_abstain_shares);
        const predDenom = predFor + predAgainst + predAbstain;
        const trueDenom = trueFor + trueAgainst + trueAbstain;
        if (!isFinite(predFor) || !isFinite(predAgainst) || !isFinite(predAbstain) || predDenom === 0 ||
            !isFinite(trueFor) || !isFinite(trueAgainst) || !isFinite(trueAbstain) || trueDenom === 0) return null;
        return Math.abs((predFor / predDenom) - (trueFor / trueDenom));
    }

    let delta1Arr = [], delta2Arr = [], isSingleProposal = false;
    let proposalsArr = [];
    // Try to get proposals array from dataInfo, or fallback to global proposals
    if (dataInfo && Array.isArray(dataInfo.proposals) && dataInfo.proposals.length > 0) {
        proposalsArr = dataInfo.proposals;
    } else if (typeof proposals !== 'undefined' && Array.isArray(proposals) && proposals.length > 0) {
        proposalsArr = proposals;
    }

    // Only use proposals with all required fields for both metrics
    const validProposals = proposalsArr.filter(p => {
        // For Delta1: need predicted_for_shares and total_for_shares
        // For Delta2: need predicted_for_shares, predicted_against_shares, predicted_abstain_shares, total_for_shares, total_against_shares, total_abstain_shares
        const hasDelta1 = p.predicted_for_shares !== undefined && p.total_for_shares !== undefined && p.total_for_shares !== 0;
        const hasDelta2 = p.predicted_for_shares !== undefined && p.predicted_against_shares !== undefined && p.predicted_abstain_shares !== undefined &&
            p.total_for_shares !== undefined && p.total_against_shares !== undefined && p.total_abstain_shares !== undefined;
        // Also check for non-null and finite
        return hasDelta1 && hasDelta2 &&
            isFinite(Number(p.predicted_for_shares)) && isFinite(Number(p.total_for_shares)) &&
            isFinite(Number(p.predicted_against_shares)) && isFinite(Number(p.predicted_abstain_shares)) &&
            isFinite(Number(p.total_against_shares)) && isFinite(Number(p.total_abstain_shares));
    });

    if (dataInfo && dataInfo.validProposals === 1 && validProposals.length === 1) {
        isSingleProposal = true;
        delta1Arr = [calcDelta1(validProposals[0])];
        delta2Arr = [calcDelta2(validProposals[0])];
    } else if (validProposals.length > 0) {
        delta1Arr = validProposals.map(calcDelta1).filter(v => v !== null && v !== undefined);
        delta2Arr = validProposals.map(calcDelta2).filter(v => v !== null && v !== undefined);
    }
    // If no valid proposals, arrays remain empty

    // --- Filter Dropdowns ---
    function getUniqueFiltered(arr, key) {
        return Array.from(new Set(arr.map(x => x && x[key] != null ? x[key] : '').filter(Boolean))).sort();
    }
    
    // Try multiple possible field names for robustness
    function getUniqueMultiKey(arr, keys) {
        const allValues = [];
        keys.forEach(key => {
            const values = arr.map(x => x && x[key] != null ? x[key] : '').filter(Boolean);
            allValues.push(...values);
        });
        return Array.from(new Set(allValues)).sort();
    }
    
    const allProposals = Array.isArray(proposals) ? proposals : [];
    const issuers = getUniqueFiltered(allProposals, 'issuer_name');
    const types = getUniqueFiltered(allProposals, 'proposal_type');
    // Try both 'category' and 'categorization' field names
    const categorizations = getUniqueMultiKey(allProposals, ['category', 'categorization']);
    // Try both 'subcategory' and 'subcategorization' field names  
    const subcategorizations = getUniqueMultiKey(allProposals, ['subcategory', 'subcategorization']);
    const trueOutcomes = ['Approved', 'Rejected'];

    // Debug: log the extracted values to help troubleshoot
    console.log('[DEBUG] Filter options extracted:', {
        issuers: issuers.length,
        types: types.length, 
        categorizations: categorizations,
        subcategorizations: subcategorizations
    });

    const filterState = window.confusionMatrixFilters || {
        issuer: '-- ALL --',
        type: '-- ALL --',
        outcome: '-- ALL --',
        categorization: '-- ALL --',
        subcategorization: '-- ALL --'
    };
    function makeDropdown(id, label, options, selected) {
        return `<div class="me-2 mb-2"><label for="${id}" class="form-label mb-1">${label}</label><select class="form-select form-select-sm" id="${id}">
            <option${selected === '-- ALL --' ? ' selected' : ''}>-- ALL --</option>
            ${options.map(opt => `<option${selected === opt ? ' selected' : ''}>${opt}</option>`).join('')}
        </select></div>`;
    }
    const filtersHtml = `
        <div class="d-flex flex-wrap align-items-end mb-3" id="confusionMatrixFiltersRow" style="background: #f8f9fa; border-radius: 6px; padding: 8px 0; min-height: 48px;">
            ${makeDropdown('filterIssuer', 'Issuers', issuers, filterState.issuer)}
            ${makeDropdown('filterType', 'Proposal Type', types, filterState.type)}
            ${makeDropdown('filterOutcome', 'True Outcome', trueOutcomes, filterState.outcome)}
            ${makeDropdown('filterCategorization', 'Categorization', categorizations, filterState.categorization)}
            ${makeDropdown('filterSubcategorization', 'SubCategorization', subcategorizations, filterState.subcategorization)}
        </div>
    `;

    const matrixCol = `<div class="col-lg-4 col-md-12 mb-3">
        <div class="card h-100">
            <div class="card-header bg-light"><b>Confusion Matrix and Predicted Shares Variances</b></div>
            <div class="card-body">
                <table class="table table-bordered text-center mb-3" style="width: 100%; max-width: 400px; margin: 0 auto;">
                    <thead>
                        <tr>
                            <th class="bg-light"></th>
                            <th class="bg-primary text-white">Predicted YES</th>
                            <th class="bg-primary text-white">Predicted NO</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th class="bg-primary text-white">Actual YES</th>
                            <td style="vertical-align: middle; font-size: 24px; font-weight: bold;">${matrix.true_positive || 0}</td>
                            <td style="vertical-align: middle; font-size: 24px; font-weight: bold;">${matrix.false_negative || 0}</td>
                        </tr>
                        <tr>
                            <th class="bg-primary text-white">Actual NO</th>
                            <td style="vertical-align: middle; font-size: 24px; font-weight: bold;">${matrix.false_positive || 0}</td>
                            <td style="vertical-align: middle; font-size: 24px; font-weight: bold;">${matrix.true_negative || 0}</td>
                        </tr>
                    </tbody>
                </table>
                ${dataInfo ? `<div class="alert ${dataInfo.validProposals > 0 ? 'alert-info' : 'alert-warning'} mb-3"><i class="fas fa-info-circle me-2"></i><strong>Data Source:</strong> ${dataInfo.message}<br><small>Analyzed ${dataInfo.validProposals} of ${dataInfo.totalProposals} total proposals</small></div>` : ''}
                <div class="row g-2">
                    <div class="col-6">
                        <div class="card bg-success text-white"><div class="card-body text-center p-2"><h6 class="card-title mb-1">Accuracy</h6><h5 class="mb-0" id="accuracyMetric">${(metrics.accuracy * 100).toFixed(1)}%</h5></div></div>
                    </div>
                    <div class="col-6">
                        <div class="card bg-info text-white"><div class="card-body text-center p-2"><h6 class="card-title mb-1">Precision</h6><h5 class="mb-0" id="precisionMetric">${(metrics.precision * 100).toFixed(1)}%</h5></div></div>
                    </div>
                    <div class="col-6">
                        <div class="card bg-warning text-white"><div class="card-body text-center p-2"><h6 class="card-title mb-1">Recall</h6><h5 class="mb-0" id="recallMetric">${(metrics.recall * 100).toFixed(1)}%</h5></div></div>
                    </div>
                    <div class="col-6">
                        <div class="card bg-secondary text-white"><div class="card-body text-center p-2"><h6 class="card-title mb-1">F1-Score</h6><h5 class="mb-0" id="f1Metric">${(metrics.f1_score * 100).toFixed(1)}%</h5></div></div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    // Delta1 column: For Shares error
    let delta1Col = `<div class="col-lg-4 col-md-12 mb-3">
        <div class="card h-100">
            <div class="card-header bg-light"><b>Delta1: For Shares Error</b></div>
            <div class="card-body">
                <div class="mb-2"><b>Formula:</b><br><code>Delta1 = |Pred For Shares - True For Shares| / True For Shares</code></div>
                <div class="mb-2 text-muted">Measures the relative error between predicted and true For Shares. 0 is perfect.</div>`;
    if (isSingleProposal && delta1Arr && delta1Arr.length === 1) {
        delta1Col += `<div class="mb-2"><b>Value:</b> <span class="fs-4 text-primary">${delta1Arr[0] !== undefined ? delta1Arr[0].toFixed(4) : 'N/A'}</span></div>`;
    } else if (delta1Arr && delta1Arr.length > 1) {
        delta1Col += `<div class="mb-2"><b>Histogram:</b><canvas id="delta1Histogram" height="240"></canvas></div>`;
    } else {
        delta1Col += `<div class="mb-2">No Delta1 data available.</div>`;
    }
    // Delta1 summary table
    if (delta1Arr && delta1Arr.length > 0) {
        const total = delta1Arr.length;
        const thresholds = [0.15, 0.30, 0.50, 0.75];
        const labels = ["Delta1 ≤ 15%", "Delta1 ≤ 30%", "Delta1 ≤ 50%", "Delta1 ≤ 75%"];
        let rows = "";
        thresholds.forEach((thresh, i) => {
            const count = delta1Arr.filter(v => v !== undefined && v <= thresh).length;
            const percent = total > 0 ? (count / total * 100).toFixed(1) : "0.0";
            rows += `<tr><td>${labels[i]}</td><td>${count}</td><td>${percent}%</td></tr>`;
        });
        delta1Col += `<div class="mb-2"><b>Summary Table:</b><table class="table table-sm table-bordered mt-2"><thead><tr><th>Condition</th><th>Count of Proposals</th><th>Percentage of All Proposals</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    delta1Col += `<div class="small text-muted">Lower is better. Larger Delta1 means greater variance between predicted and true For Shares.</div></div></div></div>`;

    // Delta2 column: For Voting Ratio error
    let delta2Col = `<div class="col-lg-4 col-md-12 mb-3">
        <div class="card h-100">
            <div class="card-header bg-light"><b>Delta2: For Voting Ratio Error</b></div>
            <div class="card-body">
                <div class="mb-2"><b>Formula:</b><br><code>Delta2 = |(Pred For Shares / (Pred For + Pred Against + Pred Abstain)) - (True For Shares / (True For + True Against + True Abstain))|</code></div>
                <div class="mb-2 text-muted">Measures the error in predicted vs. true For voting ratio. 0 is perfect.</div>`;
    if (isSingleProposal && delta2Arr && delta2Arr.length === 1) {
        delta2Col += `<div class="mb-2"><b>Value:</b> <span class="fs-4 text-primary">${delta2Arr[0] !== undefined ? delta2Arr[0].toFixed(4) : 'N/A'}</span></div>`;
    } else if (delta2Arr && delta2Arr.length > 1) {
        delta2Col += `<div class="mb-2"><b>Histogram:</b><canvas id="delta2Histogram" height="240"></canvas></div>`;
    } else {
        delta2Col += `<div class="mb-2">No Delta2 data available.</div>`;
    }
    // Delta2 summary table
    if (delta2Arr && delta2Arr.length > 0) {
        const total = delta2Arr.length;
        const thresholds = [0.15, 0.30, 0.50, 0.75];
        const labels = ["Delta2 ≤ 15%", "Delta2 ≤ 30%", "Delta2 ≤ 50%", "Delta2 ≤ 75%"];
        let rows = "";
        thresholds.forEach((thresh, i) => {
            const count = delta2Arr.filter(v => v !== undefined && v <= thresh).length;
            const percent = total > 0 ? (count / total * 100).toFixed(1) : "0.0";
            rows += `<tr><td>${labels[i]}</td><td>${count}</td><td>${percent}%</td></tr>`;
        });
        delta2Col += `<div class="mb-2"><b>Summary Table:</b><table class="table table-sm table-bordered mt-2"><thead><tr><th>Condition</th><th>Count of Proposals</th><th>Percentage of All Proposals</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    delta2Col += `<div class="small text-muted">Lower is better. Larger Delta2 means greater variance between predicted and true For voting ratio.</div></div></div></div>`;

    // Render the filter row full width, then the 3 analytics columns below
    const html = `
        <div class="row w-100 mx-0">
            <div class="col-12 mb-2">
                ${filtersHtml}
            </div>
        </div>
        <div class="row g-3 align-items-stretch w-100 mx-0">
            ${matrixCol}${delta1Col}${delta2Col}
        </div>
    `;
    const cmTableDiv = document.getElementById('confusionMatrixTable');
    if (!cmTableDiv) {
        console.error('[ERROR] confusionMatrixTable element not found in DOM!');
        return;
    }
    cmTableDiv.innerHTML = html;
    // No Additional Metrics section is rendered here. If any block/div for Additional Metrics existed, it is now fully removed.

    // ========== Confusion Matrix Filters ==========
    // Set up event handlers for filter dropdowns with real-time filtering
    setTimeout(() => {
        const filterIssuer = document.getElementById('filterIssuer');
        const filterType = document.getElementById('filterType');
        const filterOutcome = document.getElementById('filterOutcome');
        const filterCategorization = document.getElementById('filterCategorization');
        const filterSubcategorization = document.getElementById('filterSubcategorization');

        // Real-time filtering function
        function applyFiltersRealtime() {
            // Collect filter values
            const filters = {
                issuer: filterIssuer ? filterIssuer.value : '-- ALL --',
                type: filterType ? filterType.value : '-- ALL --',
                outcome: filterOutcome ? filterOutcome.value : '-- ALL --',
                categorization: filterCategorization ? filterCategorization.value : '-- ALL --',
                subcategorization: filterSubcategorization ? filterSubcategorization.value : '-- ALL --'
            };

            // Store in global state
            window.confusionMatrixFilters = filters;
            console.log('Applied confusion matrix filters in real-time:', filters);

            // Re-render with filters
            const confusionData = calculateRealConfusionMatrix();
            renderConfusionMatrix(confusionData);
        }

        // Apply real-time filtering on dropdown changes
        [filterIssuer, filterType, filterOutcome, filterCategorization, filterSubcategorization].forEach(dropdown => {
            if (dropdown) {
                dropdown.addEventListener('change', applyFiltersRealtime);
            }
        });
    }, 100); // Small delay to ensure DOM elements are rendered

    // If histograms are needed, render them (using Chart.js if available)
    function createHistogramBins(arr, binCount = 10, minVal = null, maxVal = null) {
        if (!arr || arr.length === 0) return { bins: [], counts: [] };
        const min = minVal !== null ? minVal : Math.min(...arr);
        const max = maxVal !== null ? maxVal : Math.max(...arr);
        if (min === max) {
            // All values are the same, single bin
            return { bins: [min.toFixed(2)], counts: [arr.length] };
        }
        const binSize = (max - min) / binCount;
        const bins = [];
        const counts = Array(binCount).fill(0);
        for (let i = 0; i < binCount; i++) {
            const binStart = min + i * binSize;
            bins.push(`${binStart.toFixed(2)}`);
        }
        arr.forEach(v => {
            let idx = Math.floor((v - min) / binSize);
            if (idx >= binCount) idx = binCount - 1; // Edge case for max value
            counts[idx]++;
        });
        return { bins, counts };
    }

    // Debug: log delta arrays and canvas presence
    if (!isSingleProposal) {
        console.log('[DEBUG] delta1Arr:', delta1Arr);
        console.log('[DEBUG] delta2Arr:', delta2Arr);
        const c1 = document.getElementById('delta1Histogram');
        const c2 = document.getElementById('delta2Histogram');
        console.log('[DEBUG] delta1Histogram canvas:', !!c1);
        console.log('[DEBUG] delta2Histogram canvas:', !!c2);
    }

    // Helper to destroy old charts if present (prevents Chart.js error)
    if (!window._deltaCharts) window._deltaCharts = {};
    function destroyChart(id) {
        if (window._deltaCharts[id]) {
            try { window._deltaCharts[id].destroy(); } catch(e) {}
            window._deltaCharts[id] = null;
        }
    }

    // Helper to load Chart.js dynamically if not present
    function ensureChartJsLoaded(callback) {
        if (typeof Chart !== 'undefined') {
            callback();
            return;
        }
        // Check if already loading
        if (window._chartJsLoading) {
            const interval = setInterval(() => {
                if (typeof Chart !== 'undefined') {
                    clearInterval(interval);
                    callback();
                }
            }, 50);
            return;
        }
        window._chartJsLoading = true;
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => {
            window._chartJsLoading = false;
            callback();
        };
        document.head.appendChild(script);
    }

    // Render Delta1 and Delta2 histograms (with Chart.js auto-load)
    function renderDeltaHistograms() {
        // Delta1
        if (!isSingleProposal && delta1Arr && delta1Arr.length > 1) {
            const canvas1 = document.getElementById('delta1Histogram');
            if (typeof Chart !== 'undefined' && canvas1 && canvas1.offsetParent !== null) {
                destroyChart('delta1');
                const { bins, counts } = createHistogramBins(delta1Arr, 10);
                const ctx1 = canvas1.getContext('2d');
                window._deltaCharts['delta1'] = new Chart(ctx1, {
                    type: 'bar',
                    data: {
                        labels: bins,
                        datasets: [{ label: 'Delta1 Count', data: counts, backgroundColor: 'rgba(54, 162, 235, 0.6)' }]
                    },
                    options: {
                        animation: false,
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { x: { title: { display: true, text: 'Delta1' } }, y: { beginAtZero: true, title: { display: true, text: 'Count' } } },
                        plugins: { legend: { display: false } }
                    }
                });
            }
        }
        // Delta2
        if (!isSingleProposal && delta2Arr && delta2Arr.length > 1) {
            const canvas2 = document.getElementById('delta2Histogram');
            if (typeof Chart !== 'undefined' && canvas2 && canvas2.offsetParent !== null) {
                destroyChart('delta2');
                const { bins, counts } = createHistogramBins(delta2Arr, 10);
                const ctx2 = canvas2.getContext('2d');
                window._deltaCharts['delta2'] = new Chart(ctx2, {
                    type: 'bar',
                    data: {
                        labels: bins,
                        datasets: [{ label: 'Delta2 Count', data: counts, backgroundColor: 'rgba(255, 99, 132, 0.6)' }]
                    },
                    options: {
                        animation: false,
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { x: { title: { display: true, text: 'Delta2' } }, y: { beginAtZero: true, title: { display: true, text: 'Count' } } },
                        plugins: { legend: { display: false } }
                    }
                });
            }
        }
    }

    // Always ensure Chart.js is loaded before rendering histograms
    ensureChartJsLoaded(renderDeltaHistograms);
    // Old rendering left for reference:
    // document.getElementById('confusionMatrixTable').innerHTML = matrixHtml;
}

// Calculate metrics from confusion matrix
function calculateMetrics(matrix) {
    const tp = matrix.true_positive || 0;
    const fp = matrix.false_positive || 0;
    const fn = matrix.false_negative || 0;
    const tn = matrix.true_negative || 0;
    
    const total = tp + fp + fn + tn;
    const accuracy = total > 0 ? (tp + tn) / total : 0;
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const f1_score = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
    
    return { accuracy, precision, recall, f1_score };
}

// Calculate real confusion matrix from proposals data
function calculateRealConfusionMatrix(proposalId = null) {
    // Accept optional filterState as second argument
    let filterState = window.confusionMatrixFilters || null;
    console.log('Calculating real confusion matrix for proposalId:', proposalId, 'with filters:', filterState);

    // Debug: Log initial proposals data structure
    if (proposals && proposals.length > 0) {
        console.log('[DEBUG] Sample proposal structure:', {
            totalProposals: proposals.length,
            sampleKeys: Object.keys(proposals[0] || {}),
            firstProposal: proposals[0]
        });
    } else {
        console.warn('[DEBUG] No proposals data available for confusion matrix');
    }

    // Filter proposals based on proposalId if provided
    let dataToAnalyze = proposals;
    if (proposalId && proposalId !== null) {
        dataToAnalyze = proposals.filter(p => p.id == proposalId);
        console.log(`Filtered to ${dataToAnalyze.length} proposal(s) for ID ${proposalId}`);
    } else {
        console.log(`Analyzing all ${dataToAnalyze.length} proposals`);
    }

    // Apply filters if present
    if (filterState) {
        dataToAnalyze = dataToAnalyze.filter(p => {
            let pass = true;
            if (filterState.issuer && filterState.issuer !== '-- ALL --') pass = pass && p.issuer_name === filterState.issuer;
            if (filterState.type && filterState.type !== '-- ALL --') pass = pass && p.proposal_type === filterState.type;
            if (filterState.outcome && filterState.outcome !== '-- ALL --') {
                if (filterState.outcome === 'Approved') pass = pass && (p.approved === true || p.approved === 1);
                if (filterState.outcome === 'Rejected') pass = pass && (p.approved === false || p.approved === 0);
            }
            // Handle both possible field names for categorization  
            if (filterState.categorization && filterState.categorization !== '-- ALL --') {
                pass = pass && (p.categorization === filterState.categorization || p.category === filterState.categorization);
            }
            // Handle both possible field names for subcategorization
            if (filterState.subcategorization && filterState.subcategorization !== '-- ALL --') {
                pass = pass && (p.subcategorization === filterState.subcategorization || p.subcategory === filterState.subcategorization);
            }
            return pass;
        });
        console.log(`Filtered to ${dataToAnalyze.length} proposals after applying filters`);
    }

    // Filter out proposals without the required data
    const validProposals = dataToAnalyze.filter(p => {
        // Check for approval data - try multiple field names that might be used
        const hasApprovalData = p.approved !== undefined && p.approved !== null ||
                               p.proposal_approved !== undefined && p.proposal_approved !== null ||
                               p.outcome !== undefined && p.outcome !== null;
        
        // Check for prediction data - try multiple field names and patterns
        const hasPredictionData = 
            // Method 1: Has prediction shares data
            (p.predicted_for_shares !== undefined && p.predicted_against_shares !== undefined) ||
            // Method 2: Has prediction_correct field
            p.prediction_correct !== undefined ||
            // Method 3: Has any prediction model fields
            Object.keys(p).some(key => key.includes('prediction') || key.includes('predict')) ||
            // Method 4: Has target encoded or score model fields (common in ML datasets)
            p.Target_encoded !== undefined || 
            Object.keys(p).some(key => key.includes('score_model'));
        
        const isValid = hasApprovalData && hasPredictionData;
        
        // Debug logging for first few proposals
        if (dataToAnalyze.indexOf(p) < 5) {
            console.log(`[DEBUG] Proposal ${p.id || 'unknown'} validation:`, {
                hasApprovalData,
                hasPredictionData,
                isValid,
                approvalFields: ['approved', 'proposal_approved', 'outcome'].filter(field => p[field] !== undefined),
                predictionFields: Object.keys(p).filter(key => 
                    key.includes('prediction') || key.includes('predict') || 
                    key.includes('score_model') || key === 'Target_encoded'
                ),
                sampleFields: Object.keys(p).slice(0, 10)
            });
        }
        
        return isValid;
    });

    console.log(`Found ${validProposals.length} proposals with valid data for confusion matrix`);

    if (validProposals.length === 0) {
        console.warn('No valid proposals found for confusion matrix calculation');
        // Return placeholder data if no valid data
        return {
            matrix: {
                'true_positive': 0,
                'false_positive': 0,
                'false_negative': 0,
                'true_negative': 0
            },
            metrics: { accuracy: 0, precision: 0, recall: 0, f1_score: 0 },
            dataInfo: {
                totalProposals: dataToAnalyze.length,
                validProposals: 0,
                message: 'No valid prediction data available',
                proposals: dataToAnalyze  // Include filtered proposals even if no valid data
            }
        };
    }

    // Calculate confusion matrix values
    let truePositive = 0;   // Predicted Approved, Actually Approved
    let falsePositive = 0;  // Predicted Approved, Actually Rejected
    let falseNegative = 0;  // Predicted Rejected, Actually Approved
    let trueNegative = 0;   // Predicted Rejected, Actually Rejected

    validProposals.forEach((proposal, index) => {
        // Determine actual approval - try multiple field names
        let actuallyApproved = false;
        if (proposal.approved !== undefined && proposal.approved !== null) {
            actuallyApproved = proposal.approved === true || proposal.approved === 1 || proposal.approved === '1';
        } else if (proposal.proposal_approved !== undefined && proposal.proposal_approved !== null) {
            actuallyApproved = proposal.proposal_approved === true || proposal.proposal_approved === 1 || proposal.proposal_approved === '1';
        } else if (proposal.outcome !== undefined && proposal.outcome !== null) {
            actuallyApproved = proposal.outcome === 'approved' || proposal.outcome === 'Approved' || proposal.outcome === 1;
        }

        // Determine predicted approval - try multiple methods
        let predictedApproved = false;
        let predictionMethod = 'unknown';

        // Method 1: Use prediction_correct if available
        if (proposal.prediction_correct !== undefined && proposal.prediction_correct !== null) {
            // If prediction_correct is true, it means prediction matches reality
            predictedApproved = proposal.prediction_correct ? actuallyApproved : !actuallyApproved;
            predictionMethod = 'prediction_correct';
        }
        // Method 2: Compare predicted_for_shares vs predicted_against_shares
        else if (proposal.predicted_for_shares !== undefined && proposal.predicted_against_shares !== undefined) {
            const forShares = parseFloat(proposal.predicted_for_shares) || 0;
            const againstShares = parseFloat(proposal.predicted_against_shares) || 0;
            predictedApproved = forShares > againstShares;
            predictionMethod = 'predicted_shares';
        }
        // Method 3: Use for_percentage if available (>50% means predicted approved)
        else if (proposal.for_percentage !== undefined) {
            const forPercentage = parseFloat(proposal.for_percentage) || 0;
            predictedApproved = forPercentage > 0.5;
            predictionMethod = 'for_percentage';
        }
        // Method 4: Use Target_encoded field (common in ML datasets, 1 = approved)
        else if (proposal.Target_encoded !== undefined) {
            predictedApproved = proposal.Target_encoded === 1 || proposal.Target_encoded === '1';
            predictionMethod = 'Target_encoded';
        }
        // Method 5: Use any prediction_model field that might indicate outcome
        else {
            const predictionKeys = Object.keys(proposal).filter(key => 
                key.includes('prediction_model') || key.includes('score_model')
            );
            if (predictionKeys.length > 0) {
                // Use the first prediction field found, assuming >0.5 means approved
                const predValue = parseFloat(proposal[predictionKeys[0]]) || 0;
                predictedApproved = predValue > 0.5;
                predictionMethod = predictionKeys[0];
            }
        }

        // Update confusion matrix
        if (predictedApproved && actuallyApproved) {
            truePositive++;
        } else if (predictedApproved && !actuallyApproved) {
            falsePositive++;
        } else if (!predictedApproved && actuallyApproved) {
            falseNegative++;
        } else if (!predictedApproved && !actuallyApproved) {
            trueNegative++;
        }

        // Debug logging for first few proposals
        if (index < 5) {
            console.log(`[DEBUG] Proposal ${proposal.id || index} confusion matrix:`, {
                actuallyApproved,
                predictedApproved, 
                predictionMethod,
                confusionCell: predictedApproved && actuallyApproved ? 'TP' : 
                              predictedApproved && !actuallyApproved ? 'FP' :
                              !predictedApproved && actuallyApproved ? 'FN' : 'TN'
            });
        }
    });

    const matrix = {
        'true_positive': truePositive,
        'false_positive': falsePositive,
        'false_negative': falseNegative,
        'true_negative': trueNegative
    };

    const metrics = calculateMetrics(matrix);

    console.log('Confusion Matrix Results:', matrix);
    console.log('Calculated Metrics:', metrics);

    return {
        matrix: matrix,
        metrics: metrics,
        dataInfo: {
            totalProposals: dataToAnalyze.length,
            validProposals: validProposals.length,
            message: `Analysis of ${validProposals.length} proposals with prediction data`,
            proposals: dataToAnalyze  // Include filtered proposals for Delta1/Delta2 calculations
        }
    };
}

// Show placeholder matrix for demo purposes
function showPlaceholderMatrix() {
    const placeholderData = {
        matrix: {
            'true_positive': 85,
            'false_positive': 12,
            'false_negative': 8,
            'true_negative': 95
        }
    };
    
    placeholderData.metrics = calculateMetrics(placeholderData.matrix);
    renderConfusionMatrix(placeholderData);
    
    // Add demo notice if it doesn't already exist
    const tableContainer = document.getElementById('confusionMatrixTable');
    if (!tableContainer.querySelector('.demo-notice')) {
        const notice = document.createElement('div');
        notice.className = 'alert alert-info mt-3 demo-notice';
        notice.innerHTML = `
            <i class="fas fa-info-circle me-2"></i>
            <strong>Demo Data:</strong> This is placeholder data showing example confusion matrix results. 
            Real data will be available when the <code>/api/confusion-matrix</code> endpoint is implemented.
        `;
        tableContainer.appendChild(notice);
    }
}

function hideConfusionMatrix() {
    // Nuclear option: completely remove confusion matrix from DOM
    const confusionContainer = document.getElementById('confusionMatrixContainer');
    if (confusionContainer) {
        // Store the confusion matrix HTML for later restoration if needed
        if (!window.confusionMatrixHTML) {
            window.confusionMatrixHTML = confusionContainer.outerHTML;
            window.confusionMatrixParent = confusionContainer.parentNode;
        }
        
        // Completely remove from DOM
        confusionContainer.remove();
        console.log('Confusion matrix removed from DOM via hideConfusionMatrix');
    }
    
    // Properly return to proposals view
    const proposalsSection = document.getElementById('proposals-section');
    if (proposalsSection) {
        proposalsSection.style.display = 'block';
        
        // Make sure proposals content is visible
        const proposalsCard = document.getElementById('proposalsCard');
        if (proposalsCard) proposalsCard.style.display = 'block';
        
        // Scroll back to proposals
        proposalsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Set app view back to proposals
    if (typeof window !== 'undefined') {
        window._appView = 'proposals';
    }
}

function showAddAccountModal() {
    showAlert('Add account modal feature coming soon!', 'info');
}

// Filter and search functions for accounts
function filterAccounts() {
    showAlert('Filter accounts feature coming soon!', 'info');
}

function searchAccounts() {
    showAlert('Search accounts feature coming soon!', 'info');
}

// Debug function to test confusion matrix
function testConfusionMatrix() {
    console.log('=== TESTING CONFUSION MATRIX ===');
    
    // Check if elements exist
    const elements = {
        confusionContainer: document.getElementById('confusionMatrixContainer'),
        proposalsSection: document.getElementById('proposals-section'),
        confusionTableDiv: document.getElementById('confusionMatrixTable'),
        accuracyMetric: document.getElementById('accuracyMetric'),
        precisionMetric: document.getElementById('precisionMetric'),
        recallMetric: document.getElementById('recallMetric'),
        f1Metric: document.getElementById('f1Metric')
    };
    
    console.log('Elements check:', elements);
    
    // Test showing the confusion matrix directly
    if (elements.confusionContainer && elements.confusionTableDiv) {
        console.log('All required elements found, testing display...');
        
        // Show container
        elements.confusionContainer.style.display = 'block';
        if (elements.proposalsSection) {
            elements.proposalsSection.style.display = 'none';
        }
        
        // Test rendering placeholder data
        showPlaceholderMatrix();
        
        console.log('Confusion matrix should now be visible');
        return true;
    } else {
        console.error('Missing required elements:', Object.keys(elements).filter(key => !elements[key]));
        return false;
    }
}

// Add test button in console - call testConfusionMatrix() to debug
console.log('Debug functions available:');
console.log('- testConfusionMatrix() - Test confusion matrix display');
console.log('- showProposalConfusion() - Show confusion matrix with REAL DATA');
console.log('- hideConfusionMatrix() - Hide confusion matrix');
console.log('- forceCleanupConfusionMatrix() - Force remove confusion matrix from DOM');
console.log('- resetToDashboard() - Complete reset to dashboard');
console.log('- testConfusionMatrixIsolation() - Test isolation across all sections');
console.log('- calculateRealConfusionMatrix() - Calculate confusion matrix from proposal data');
console.log('- window.debugConfusionMatrix() or window.testCM() - Visual debug tool');
console.log('🎉 REAL DATA: Confusion matrix now uses actual proposal prediction data!');
console.log('To test real data: testRealConfusionMatrix() or testRealConfusionMatrix(279) for specific proposal');

// Add global test function for easy access
window.debugConfusionMatrix = function() {
    console.log('=== DEBUGGING CONFUSION MATRIX ===');
    
    // Check if elements exist
    const elements = {
        confusionContainer: document.getElementById('confusionMatrixContainer'),
        proposalsSection: document.getElementById('proposals-section'),
        confusionTableDiv: document.getElementById('confusionMatrixTable'),
        accuracyMetric: document.getElementById('accuracyMetric'),
        precisionMetric: document.getElementById('precisionMetric'),
        recallMetric: document.getElementById('recallMetric'),
        f1Metric: document.getElementById('f1Metric')
    };
    
    console.log('Elements found:', elements);
    
    // Create visual indicator on page
    let debugDiv = document.getElementById('debugResults');
    if (!debugDiv) {
        debugDiv = document.createElement('div');
        debugDiv.id = 'debugResults';
        debugDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #fff; border: 2px solid #007bff; padding: 15px; border-radius: 5px; z-index: 9999; max-width: 300px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);';
        document.body.appendChild(debugDiv);
    }
    
    let resultHtml = '<h6 style="color: #007bff;">Confusion Matrix Debug</h6>';
    
    // Check elements
    for (const [name, element] of Object.entries(elements)) {
        const status = element ? '✅' : '❌';
        const color = element ? 'green' : 'red';
        resultHtml += `<div style="color: ${color};">${status} ${name}</div>`;
    }
    
    // Test showing confusion matrix
    if (elements.confusionContainer && elements.confusionTableDiv) {
        resultHtml += '<div style="color: blue;">🔧 Testing display...</div>';
        
        // Show the confusion matrix
        if (elements.proposalsSection) elements.proposalsSection.style.display = 'none';
        elements.confusionContainer.style.display = 'block';
        
        // Add placeholder data
        elements.confusionTableDiv.innerHTML = `
            <div class="table-responsive">
                <table class="table table-bordered text-center">
                    <thead class="table-light">
                        <tr>
                            <th rowspan="2" class="align-middle">Actual</th>
                            <th colspan="2">Predicted</th>
                        </tr>
                        <tr>
                            <th class="bg-success bg-opacity-25">Approved</th>
                            <th class="bg-danger bg-opacity-25">Rejected</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th class="bg-success bg-opacity-25">Approved</th>
                            <td class="fs-5 fw-bold text-success">85</td>
                            <td class="fs-5 fw-bold text-warning">8</td>
                        </tr>
                        <tr>
                            <th class="bg-danger bg-opacity-25">Rejected</th>
                            <td class="fs-5 fw-bold text-warning">12</td>
                            <td class="fs-5 fw-bold text-success">95</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="alert alert-success mt-2">
                <strong>✅ DEBUG SUCCESS:</strong> Confusion matrix is now visible with test data!
            </div>
        `;
        
        // Update metrics
        if (elements.accuracyMetric) elements.accuracyMetric.textContent = '90.0%';
        if (elements.precisionMetric) elements.precisionMetric.textContent = '87.6%';
        if (elements.recallMetric) elements.recallMetric.textContent = '91.4%';
        if (elements.f1Metric) elements.f1Metric.textContent = '89.5%';
        
        // Scroll to confusion matrix
        elements.confusionContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        resultHtml += '<div style="color: green;">✅ Test completed! Check confusion matrix above.</div>';
        resultHtml += '<button onclick="hideConfusionMatrix();document.getElementById(\'debugResults\').remove();" style="margin-top:10px;padding:5px 10px;background:#dc3545;color:white;border:none;border-radius:3px;">Close & Reset</button>';
    } else {
        resultHtml += '<div style="color: red;">❌ Required elements missing!</div>';
    }
    
    debugDiv.innerHTML = resultHtml;
    
    return elements;
};

// Also make it easily accessible
window.testCM = window.debugConfusionMatrix;

// Comprehensive cleanup function to ensure confusion matrix isolation
function forceCleanupConfusionMatrix() {
    console.log('=== FORCE CLEANUP CONFUSION MATRIX ===');
    
    const confusionContainer = document.getElementById('confusionMatrixContainer');
    if (confusionContainer) {
        // Store the confusion matrix HTML for later restoration if needed
        if (!window.confusionMatrixHTML) {
            window.confusionMatrixHTML = confusionContainer.outerHTML;
            window.confusionMatrixParent = confusionContainer.parentNode;
        }
        
        // Completely remove from DOM
        confusionContainer.remove();
        console.log('Confusion matrix forcibly removed from DOM');
        return 'Confusion matrix removed from DOM';
    } else {
        console.log('Confusion matrix container not found in DOM');
        return 'Confusion matrix not found in DOM';
    }
}

// Global cleanup function for easy access
window.forceCleanupConfusionMatrix = forceCleanupConfusionMatrix;

// Complete dashboard reset function with improved confusion matrix cleanup
function resetToDashboard() {
    console.log('=== COMPLETE DASHBOARD RESET ===');
    
    // Force cleanup confusion matrix first
    forceCleanupConfusionMatrix();
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show dashboard section
    const dashboardSection = document.getElementById('dashboard-section');
    if (dashboardSection) {
        dashboardSection.style.display = 'block';
        console.log('Dashboard section shown');
    }
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    const dashboardLink = document.querySelector('a[onclick*="dashboard"]');
    if (dashboardLink) {
        dashboardLink.classList.add('active');
    }
    
    // Load dashboard data
    loadDashboardData();
    
    return 'Dashboard completely reset with confusion matrix cleanup';
}

// Global access
window.resetToDashboard = resetToDashboard;

// Comprehensive test to verify confusion matrix isolation
function testConfusionMatrixIsolation() {
    console.log('=== TESTING CONFUSION MATRIX ISOLATION ===');
    
    let testResults = [];
    
    // Test 1: Show confusion matrix
    console.log('Test 1: Showing confusion matrix...');
    showProposalConfusion();
    setTimeout(() => {
        const isVisible = !!document.getElementById('confusionMatrixContainer');
        testResults.push(`✅ Confusion matrix shown: ${isVisible}`);
        console.log(`Confusion matrix visible: ${isVisible}`);
        
        // Test 2: Switch to Dashboard
        console.log('Test 2: Switching to Dashboard...');
        window.showSection('dashboard');
        setTimeout(() => {
            const stillVisible = !!document.getElementById('confusionMatrixContainer');
            testResults.push(`${stillVisible ? '❌' : '✅'} Confusion matrix after Dashboard switch: ${stillVisible ? 'STILL VISIBLE (BAD)' : 'HIDDEN (GOOD)'}`);
            console.log(`Confusion matrix after Dashboard: ${stillVisible}`);
            
            // Test 3: Switch to Accounts
            console.log('Test 3: Switching to Accounts...');
            window.showSection('accounts');
            setTimeout(() => {
                const stillVisible2 = !!document.getElementById('confusionMatrixContainer');
                testResults.push(`${stillVisible2 ? '❌' : '✅'} Confusion matrix after Accounts switch: ${stillVisible2 ? 'STILL VISIBLE (BAD)' : 'HIDDEN (GOOD)'}`);
                console.log(`Confusion matrix after Accounts: ${stillVisible2}`);
                
                // Test 4: Switch to Admin
                console.log('Test 4: Switching to Admin...');
                window.showSection('admin');
                setTimeout(() => {
                    const stillVisible3 = !!document.getElementById('confusionMatrixContainer');
                    testResults.push(`${stillVisible3 ? '❌' : '✅'} Confusion matrix after Admin switch: ${stillVisible3 ? 'STILL VISIBLE (BAD)' : 'HIDDEN (GOOD)'}`);
                    console.log(`Confusion matrix after Admin: ${stillVisible3}`);
                    
                    // Show final results
                    console.log('\n=== FINAL TEST RESULTS ===');
                    testResults.forEach(result => console.log(result));
                    
                    // Display results on page
                    let resultsDiv = document.getElementById('testResults');
                    if (!resultsDiv) {
                        resultsDiv = document.createElement('div');
                        resultsDiv.id = 'testResults';
                        resultsDiv.style.cssText = 'position: fixed; top: 10px; left: 10px; background: #f8f9fa; border: 2px solid #007bff; padding: 15px; border-radius: 5px; z-index: 10000; max-width: 400px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);';
                        document.body.appendChild(resultsDiv);
                    }
                    
                    resultsDiv.innerHTML = `
                        <h6 style="color: #007bff; margin-bottom: 10px;">🧪 Confusion Matrix Isolation Test</h6>
                        ${testResults.map(result => `<div style="margin: 5px 0; font-size: 14px;">${result}</div>`).join('')}
                        <button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">Close</button>
                        <button onclick="window.showSection('dashboard')" style="margin-top: 10px; margin-left: 10px; padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">Back to Dashboard</button>
                    `;
                    
                }, 500);
            }, 500);
        }, 500);
    }, 500);
}

// Make test function globally accessible
window.testConfusionMatrixIsolation = testConfusionMatrixIsolation;

// Global function to test real confusion matrix calculation
window.testRealConfusionMatrix = function(proposalId = null) {
    console.log('=== TESTING REAL CONFUSION MATRIX CALCULATION ===');
    const result = calculateRealConfusionMatrix(proposalId);
    
    console.log('Confusion Matrix Results:');
    console.table(result.matrix);
    console.log('Metrics:');
    console.table(result.metrics);
    console.log('Data Info:', result.dataInfo);
    
    return result;
};

// Make calculation function globally accessible
window.calculateRealConfusionMatrix = calculateRealConfusionMatrix;
