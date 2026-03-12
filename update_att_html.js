const fs = require('fs');
const p = 'c:/Users/manso/Documents/hr-management/client/attendance.html';
let content = fs.readFileSync(p, 'utf8');

content = content.replace(
    '<h2 style="font-size: 32px; font-weight: 700; margin: 12px 0 0;">124</h2>',
    '<h2 id="attTotalEmployees" style="font-size: 32px; font-weight: 700; margin: 12px 0 0;">...</h2>'
);

content = content.replace(
    '<h2 style="font-size: 32px; font-weight: 700; color: var(--success); margin: 12px 0 0;">118\\n                            </h2>',
    '<h2 id="attPresentToday" style="font-size: 32px; font-weight: 700; color: var(--success); margin: 12px 0 0;">...</h2>'
);
content = content.replace(/<h2 style="font-size: 32px; font-weight: 700; color: var\(--success\); margin: 12px 0 0;">118[\s\S]*?<\/h2>/, '<h2 id="attPresentToday" style="font-size: 32px; font-weight: 700; color: var(--success); margin: 12px 0 0;">...</h2>');

content = content.replace(
    '<h2 style="font-size: 32px; font-weight: 700; color: var(--danger); margin: 12px 0 0;">3\\n                            </h2>',
    '<h2 id="attAbsentToday" style="font-size: 32px; font-weight: 700; color: var(--danger); margin: 12px 0 0;">...</h2>'
);
content = content.replace(/<h2 style="font-size: 32px; font-weight: 700; color: var\(--danger\); margin: 12px 0 0;">3[\s\S]*?<\/h2>/, '<h2 id="attAbsentToday" style="font-size: 32px; font-weight: 700; color: var(--danger); margin: 12px 0 0;">...</h2>');

content = content.replace(
    '<h2 style="font-size: 32px; font-weight: 700; color: #d97706; margin: 12px 0 0;">3</h2>',
    '<h2 id="attLateArrivals" style="font-size: 32px; font-weight: 700; color: #d97706; margin: 12px 0 0;">...</h2>'
);

fs.writeFileSync(p, content);
console.log('attendance.html updated');
