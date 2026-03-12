const fs = require('fs');
const p = 'c:/Users/manso/Documents/hr-management/client/dashboard.html';
let content = fs.readFileSync(p, 'utf8');

// Attendance Stat
content = content.replace( // 118/124
    '<h2 style="font-size: 32px; font-weight: 700; margin: 8px 0;">118<span\\n                                            style="font-size: 18px; color: var(--text-muted); font-weight: 500;">/124</span>\\n                                    </h2>',
    '<h2 id="todaysAttendanceCount" style="font-size: 32px; font-weight: 700; margin: 8px 0;">...</h2>'
);

// Fallback if the strict multiline replace fails
content = content.replace(/<h2 style="font-size: 32px; font-weight: 700; margin: 8px 0;">118[\s\S]*?<\/h2>/, '<h2 id="todaysAttendanceCount" style="font-size: 32px; font-weight: 700; margin: 8px 0;">...</h2>');

// Leave stat
content = content.replace(
    '<h2 style="font-size: 32px; font-weight: 700; margin: 8px 0;">6</h2>',
    '<h2 id="employeesOnLeaveCount" style="font-size: 32px; font-weight: 700; margin: 8px 0;">...</h2>'
);

// Clear recent hirings table body (there is already an ID applied from earlier: id="recentHiringsTableBody")
// Wait, is there an ID on recent hirings table body?
if (content.indexOf('id="recentHiringsTableBody"') === -1) {
    content = content.replace(/<tbody>[\s\S]*?<\/tbody>/, '<tbody id="recentHiringsTableBody">\n                                    <tr><td colspan="6" style="text-align: center; padding: 20px;" class="text-muted">Loading recent hirings...</td></tr>\n                                </tbody>');
} else {
    content = content.replace(/<tbody id="recentHiringsTableBody">[\s\S]*?<\/tbody>/, '<tbody id="recentHiringsTableBody">\n                                    <tr><td colspan="6" style="text-align: center; padding: 20px;" class="text-muted">Loading recent hirings...</td></tr>\n                                </tbody>');
}

fs.writeFileSync(p, content);
console.log('dashboard.html updated');
