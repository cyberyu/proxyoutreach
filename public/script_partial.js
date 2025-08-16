// Global variables
let accounts = [];
let outreachLogs = [];
let currentEditingAccount = null;

// API URL base
const API_BASE = '';

// Initialize the application - COMMENTED OUT FOR TESTING
// document.addEventListener('DOMContentLoaded', function() {
//     console.log('=== DOMContentLoaded: Starting initialization... ===');
//     
//     // Add a small delay to ensure DOM is fully ready
//     setTimeout(function() {
//         console.log('=== Delayed initialization starting... ===');
//         
//         // Load dashboard data
//         loadDashboardData();
//         
//         // Also try a direct approach as backup
//         setTimeout(function() {
//             console.log('=== Backup approach - direct DOM update ===');
//             // Direct API call and DOM update as backup
//             fetch('/api/dashboard')
//                 .then(response => response.json())
//                 .then(data => {
//                     console.log('Backup: Data received', data);
//                     const elements = {
//                         'totalProposals': data.totalProposals,
//                         'votedAccounts': data.votedAccounts,
//                         'unvotedAccounts': data.unvotedAccounts,
//                         'pendingOutreach': data.pendingOutreach
//                     };
//                     
//                     for (const [id, value] of Object.entries(elements)) {
//                         const element = document.getElementById(id);
//                         if (element && element.textContent === '-') {
//                             element.textContent = value || 0;
//                             console.log('Backup: Updated', id, 'to', value);
//                         }
//                     }
//                 })
//                 .catch(error => console.error('Backup approach failed:', error));
//         }, 2000);
//         
//         // Try to load accounts and outreach logs if functions exist
//         if (typeof loadAccounts === 'function') {
//             loadAccounts();
//         } else {
//             console.log('loadAccounts function not found, skipping...');
//         }
//         
//         if (typeof loadOutreachLogs === 'function') {
//             loadOutreachLogs();
//         } else {
//             console.log('loadOutreachLogs function not found, skipping...');
//         }
//         
//         // Set current date as default for contact date (if element exists)
//         const contactDateElement = document.getElementById('contactDateInput');
//         if (contactDateElement) {
//             contactDateElement.valueAsDate = new Date();
//         } else {
//             console.log('contactDateInput element not found, skipping date setup...');
//         }
//         
//         // Setup import form (if function exists)
//         if (typeof setupImportForm === 'function') {
//             setupImportForm();
//         } else {
//             console.log('setupImportForm function not found, skipping...');
//         }
//         
//         console.log('=== Initialization complete ===');
//     }, 100); // 100ms delay
// });

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
