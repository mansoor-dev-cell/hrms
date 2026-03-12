const fs = require('fs');
const p = 'c:/Users/manso/Documents/hr-management/client/emp.html';
let content = fs.readFileSync(p, 'utf8');

content = content.replace(/<tbody>[\s\S]*?<\/tbody>/, '<tbody id="employeeTableBody">\n                                <tr><td colspan="6" style="text-align: center; padding: 20px;" class="text-muted">Loading employees...</td></tr>\n                            </tbody>');
content = content.replace('<span class="text-muted" style="font-size: 13px;">Showing 1 to 5 of 124 entries</span>', '<span class="text-muted showing-entries" id="employeeCountText" style="font-size: 13px;">Showing 0 to 0 entries</span>');

fs.writeFileSync(p, content);
console.log('emp.html updated');
