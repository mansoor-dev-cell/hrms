const fs = require('fs');
const file = 'c:/Users/manso/Documents/hr-management/client/emp.html';

let content = fs.readFileSync(file, 'utf8');

// The file has two identical <select class="form-control" style="margin: 0;"> lines
// We need to target the first one as Dept and second as Status.
let firstReplaced = content.replace(
    '<select class="form-control" style="margin: 0;">',
    '<select class="form-control" style="margin: 0;" id="empDeptFilter">'
);

let secondReplaced = firstReplaced.replace(
    '<select class="form-control" style="margin: 0;">',
    '<select class="form-control" style="margin: 0;" id="empStatusFilter">'
);

fs.writeFileSync(file, secondReplaced);
console.log('patched emp.html');
