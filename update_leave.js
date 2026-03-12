const fs = require('fs');
const p = 'c:/Users/manso/Documents/hr-management/client/leave.html';
let content = fs.readFileSync(p, 'utf8');

// Header Bell
content = content.replace(
    '<button class="btn btn-outline"',
    '<button class="btn btn-outline" id="notificationBell"'
);

content = content.replace(
    '<i class="ph ph-bell" style="font-size: 20px;"></i>',
    `<i class="ph ph-bell" style="font-size: 20px;"></i>
   <span id="bellBadge" style="position: absolute; top: -5px; right: -5px; background: var(--danger); color: white; border-radius: 50%; padding: 2px 6px; font-size: 10px; font-weight: bold; display: none;">0</span>`
);

// Stat cards updates
content = content.replace('<h2 style="font-size: 28px; font-weight: 700; margin: 4px 0 0;">12</h2>', '<h2 id="pendingRequestsCount" style="font-size: 28px; font-weight: 700; margin: 4px 0 0;">...</h2>');
content = content.replace('<h2 style="font-size: 28px; font-weight: 700; margin: 4px 0 0;">6</h2>', '<h2 id="onLeaveTodayCount" style="font-size: 28px; font-weight: 700; margin: 4px 0 0;">...</h2>');
content = content.replace('<h2 style="font-size: 28px; font-weight: 700; margin: 4px 0 0;">45</h2>', '<h2 id="approvedThisMonthCount" style="font-size: 28px; font-weight: 700; margin: 4px 0 0;">...</h2>');

// Clear out static table
content = content.replace(/<tbody>[\s\S]*?<\/tbody>/, '<tbody id="leaveTableBody">\n                                <tr><td colspan="6" style="text-align: center; padding: 20px;" class="text-muted">Loading leaves...</td></tr>\n                            </tbody>');

// Update apply leave form
const formReplacement = `<form id="leaveForm">
                    <div class="form-group">
                        <label class="form-label">Employee</label>
                        <select class="form-control" id="leaveEmployee" required>
                            <option value="" disabled selected>Search & Select Employee...</option>
                            <!-- dynamically populated -->
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Leave Type</label>
                        <select class="form-control" id="leaveType" required>
                            <option value="" disabled selected>Select Leave Type...</option>
                            <option value="annual">Annual Leave</option>
                            <option value="sick">Sick Leave</option>
                            <option value="unpaid">Unpaid Leave</option>
                            <option value="maternity">Maternity/Paternity</option>
                        </select>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Start Date</label>
                            <input type="date" class="form-control" id="leaveStartDate" required>
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">End Date</label>
                            <input type="date" class="form-control" id="leaveEndDate" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Reason / Notes</label>
                        <textarea class="form-control" rows="3" id="leaveReason"
                            placeholder="Please provide a reason for the leave request..." required></textarea>
                    </div>
                </form>
                <p id="leaveFeedback" style="margin-top: 10px; font-size: 13px;"></p>`;
content = content.replace(/<form id="leaveForm">[\s\S]*?<\/form>/, formReplacement);

content = content.replace( // Change onclick
    '<button class="btn btn-primary" onclick="document.getElementById(\'leaveForm\').submit()">Submit\\n                    Request</button>',
    '<button class="btn btn-primary" id="saveLeaveBtn">Submit Request</button>'
);

fs.writeFileSync(p, content);
console.log('leave.html updated');
