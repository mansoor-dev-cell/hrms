const fs = require('fs');
const files = [
    'c:/Users/manso/Documents/hr-management/client/emp.html',
    'c:/Users/manso/Documents/hr-management/client/attendance.html',
    'c:/Users/manso/Documents/hr-management/client/leave.html',
    'c:/Users/manso/Documents/hr-management/client/dashboard.html'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    // Replace <span class="name">Admin User</span> with <span class="name">User</span>
    content = content.replace('<span class="name">Admin User</span>', '<span class="name">User</span>');
    fs.writeFileSync(file, content);
});

console.log('Removed hardcoded names');
