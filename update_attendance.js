const fs = require('fs');
const p = 'c:/Users/manso/Documents/hr-management/client/attendance.html';
let content = fs.readFileSync(p, 'utf8');

// Give the table body an ID and clear hardcoded data
content = content.replace(/<tbody>[\s\S]*?<\/tbody>/, '<tbody id="attendanceTableBody">\n                                <tr><td colspan="6" style="text-align: center; padding: 20px;" class="text-muted">Loading attendance...</td></tr>\n                            </tbody>');

// Update the modal form to ensure nice IDs
const modalReplacement = `<form id="attendanceForm">
                    <div class="form-group">
                        <label class="form-label">Employee</label>
                        <select class="form-control" id="attEmployee" required>
                            <option value="" disabled selected>Search & Select Employee...</option>
                            <!-- dynamically populated -->
                        </select>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Date</label>
                            <input type="date" class="form-control" id="attDate" required>
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Status</label>
                            <select class="form-control" id="attStatus" required>
                                <option value="present">Present</option>
                                <option value="absent">Absent</option>
                                <option value="late">Late</option>
                                <option value="half-day">Half Day</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Check In Time</label>
                            <input type="time" class="form-control" id="attCheckIn">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Check Out Time</label>
                            <input type="time" class="form-control" id="attCheckOut">
                        </div>
                    </div>

                    <div class="form-group" style="margin: 0;">
                        <label class="form-label">Notes/Reason</label>
                        <textarea class="form-control" id="attNotes" rows="2" placeholder="Optional details..."></textarea>
                    </div>
                </form>
                <p id="attFeedback" style="margin-top: 10px; font-size: 13px;"></p>`;

content = content.replace(/<form id="attendanceForm">[\s\S]*?<\/form>/, modalReplacement);

// Hook submit button up
content = content.replace( // Change onclick
    '<button class="btn btn-primary" onclick="document.getElementById(\'attendanceForm\').submit()">Save\\n                    Record</button>',
    '<button class="btn btn-primary" id="saveAttendanceBtn">Save Record</button>'
);

fs.writeFileSync(p, content);
console.log('attendance.html updated');
