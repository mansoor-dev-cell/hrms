const fs = require('fs');

// Patch 1: emp.html
const p1 = 'c:/Users/manso/Documents/hr-management/client/emp.html';
let content1 = fs.readFileSync(p1, 'utf8');
content1 = content1.replace('<select class="form-control" style="margin: 0;">\\n                                    <option value="">All Departments</option>', '<select id="empDeptFilter" class="form-control" style="margin: 0;">\\n                                    <option value="">All Departments</option>');
content1 = content1.replace('<select class="form-control" style="margin: 0;">\\n                                    <option value="">All Statuses</option>', '<select id="empStatusFilter" class="form-control" style="margin: 0;">\\n                                    <option value="">All Statuses</option>');

// Also hook up the form tags on Add Employee
content1 = content1.replace('<input type="text" class="form-control" placeholder="Enter first name" required>', '<input type="text" id="addEmpFirstName" class="form-control" placeholder="Enter first name" required>');
content1 = content1.replace('<input type="text" class="form-control" placeholder="Enter last name" required>', '<input type="text" id="addEmpLastName" class="form-control" placeholder="Enter last name" required>');
content1 = content1.replace('<input type="email" class="form-control" placeholder="employee@company.com" required>', '<input type="email" id="addEmpEmail" class="form-control" placeholder="employee@company.com" required>');
content1 = content1.replace('<select class="form-control" required style="width: 100%;">\\n                                <option value="" disabled selected>Select Dept</option>', '<select id="addEmpDept" class="form-control" required style="width: 100%;">\\n                                <option value="" disabled selected>Select Dept</option>');
content1 = content1.replace('<input type="text" class="form-control" placeholder="e.g. Developer">', '<input type="text" id="addEmpRole" class="form-control" placeholder="e.g. Developer">');
content1 = content1.replace('<input type="date" class="form-control" required>', '<input type="date" id="addEmpDate" class="form-control" required>');

// Also fix the form button to not submit but trigger a JS function
content1 = content1.replace('<button class="btn btn-primary" onclick="document.getElementById(\\\'employeeForm\\\').submit()">Save\\n                    Employee</button>', '<button type="button" class="btn btn-primary" id="saveEmployeeBtn">Save Employee</button>');
// Add feedback
content1 = content1.replace('</form>\\n            </div>\\n            <div class="modal-footer">', '<p id="addEmpFeedback" style="font-size: 13px; margin-top: 12px; font-weight: 500;"></p>\\n                </form>\\n            </div>\\n            <div class="modal-footer">');
fs.writeFileSync(p1, content1);

// Patch 2: attendance.html
const p2 = 'c:/Users/manso/Documents/hr-management/client/attendance.html';
let content2 = fs.readFileSync(p2, 'utf8');
content2 = content2.replace('<input type="date" class="form-control" style="margin: 0; padding: 6px 12px;"\\n                                        value="2026-03-05">', '<input type="date" id="attDateFilter" class="form-control" style="margin: 0; padding: 6px 12px;"\\n                                        value="2026-03-05">');
content2 = content2.replace('<input type="text" class="form-control" placeholder="Search employee..."\\n                                        style="padding-left: 44px; margin: 0;">', '<input type="text" id="attSearchFilter" class="form-control" placeholder="Search employee..."\\n                                        style="padding-left: 44px; margin: 0;">');
fs.writeFileSync(p2, content2);

// Patch 3: leave.html
const p3 = 'c:/Users/manso/Documents/hr-management/client/leave.html';
let content3 = fs.readFileSync(p3, 'utf8');
content3 = content3.replace('<input type="text" class="form-control" placeholder="Search employee..."\\n                                        style="padding-left: 44px; margin: 0;">', '<input type="text" id="leaveSearchFilter" class="form-control" placeholder="Search employee..."\\n                                        style="padding-left: 44px; margin: 0;">');
content3 = content3.replace('<select class="form-control" style="margin: 0;">\\n                                    <option value="">All Statuses</option>', '<select id="leaveStatusFilter" class="form-control" style="margin: 0;">\\n                                    <option value="">All Statuses</option>');
fs.writeFileSync(p3, content3);
console.log('HTML files patched');
