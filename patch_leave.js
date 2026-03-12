const fs = require('fs');
const file = 'c:/Users/manso/Documents/hr-management/client/leave.html';

let content = fs.readFileSync(file, 'utf8');

// 1. Filter links
content = content.replace(
    '<a href="#" class="btn btn-outline"\r\n                        style="background-color: var(--bg-surface); border-color: var(--primary); color: var(--primary);">All\r\n                        Requests</a>',
    '<a href="#" class="btn btn-outline leave-status-link" data-status="" style="background-color: var(--bg-surface); border-color: var(--primary); color: var(--primary);">All Requests</a>'
);
content = content.replace(
    '<a href="#" class="btn btn-outline" style="background-color: var(--bg-surface);">Pending</a>',
    '<a href="#" class="btn btn-outline leave-status-link" data-status="pending" style="background-color: var(--bg-surface);">Pending</a>'
);
content = content.replace(
    '<a href="#" class="btn btn-outline" style="background-color: var(--bg-surface);">Approved</a>',
    '<a href="#" class="btn btn-outline leave-status-link" data-status="approved" style="background-color: var(--bg-surface);">Approved</a>'
);
content = content.replace(
    '<a href="#" class="btn btn-outline" style="background-color: var(--bg-surface);">Rejected</a>',
    '<a href="#" class="btn btn-outline leave-status-link" data-status="rejected" style="background-color: var(--bg-surface);">Rejected</a>'
);

// 2. Search Input ID
content = content.replace(
    '<input type="text" class="form-control" placeholder="Search employee..."',
    '<input type="text" id="leaveSearchFilter" class="form-control" placeholder="Search employee..."'
);

// 3. tbody replacement using regex
// Matches <tbody> through </tbody> and replaces entire block
content = content.replace(/<tbody>[\s\S]*?<\/tbody>/, '<tbody id="leaveTableBody"><tr><td colspan="6" style="text-align: center; padding: 20px;" class="text-muted">Loading leaves...</td></tr></tbody>');

fs.writeFileSync(file, content);
console.log('patched leave.html');
