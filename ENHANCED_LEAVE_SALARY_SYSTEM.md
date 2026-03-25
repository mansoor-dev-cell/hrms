# Enhanced Leave Management & Salary System Implementation

## Overview
This document outlines the comprehensive leave management and salary system implemented for the HRMS application. The system includes advanced features such as automatic monthly leave allocation, carry-forward mechanisms, LOP (Loss of Pay) calculations, and detailed salary slip generation.

## Implemented Features

### 1. Monthly Leave Allocation System
**Implementation**: Automatic allocation of 1 sick leave + 1 annual leave per month for all active employees.

**Key Features**:
- **Automatic Allocation**: System allocates monthly leaves at the start of each month
- **Employee-Specific**: Each user gets their designated allocation based on their `monthlyLeaveAllocation` settings
- **Status-Based**: Only 'Active' employees receive allocations
- **Admin Control**: Manual trigger available via Admin panel for immediate allocation

**Technical Details**:
- Enhanced `User` model with `monthlyLeaveAllocation` and `currentMonthLeaves` fields
- New API endpoint: `POST /api/leaves/allocate-monthly` (Admin only)
- Function: `allocateMonthlyLeaves()` in server.js

### 2. Carry Forward Mechanism
**Implementation**: Unused leaves are automatically carried forward to the next month within the same calendar year.

**Rules**:
- ✅ **Month-to-Month**: Unused leaves carry forward from one month to the next
- ❌ **Year-End Reset**: No carry forward from December to January (new year)
- 📊 **Tracking**: System tracks original allocation vs carried forward leaves

**Technical Details**:
- `currentMonthLeaves.carryForwardSick` and `currentMonthLeaves.carryForwardAnnual` fields
- Logic prevents December-to-January carry forward
- Automatic calculation during monthly allocation process

### 3. Year-End Leave Exhaustion
**Implementation**: All leaves (including carried forward ones) expire at the end of the calendar year.

**Features**:
- **Complete Reset**: January 1st starts fresh with base monthly allocation only
- **No Year-Over-Year Carry**: Ensures fair annual leave distribution
- **Automatic Processing**: System handles reset during January allocation

### 4. Advanced LOP (Loss of Pay) System
**Implementation**: Sophisticated LOP calculation with admin-configurable deduction percentages.

**Core Features**:
- **Automatic Calculation**: LOP triggered when leave usage exceeds available quota
- **Configurable Deduction**: Admin can set deduction percentage (0-100%) per employee
- **Pro-Rated Calculation**: Based on actual days in the month
- **Real-Time Updates**: LOP calculated whenever leave status changes

**LOP Calculation Logic**:
```
Daily Salary = Monthly Salary ÷ Days in Month
LOP Amount = (Days Over Limit) × Daily Salary × (Deduction % ÷ 100)
```

**Technical Implementation**:
- `calculateLOP()` function processes monthly leave usage
- Fields: `lopDetails.currentMonth`, `lopDetails.yearToDate`, `lopDetails.deductionAmount`
- API: `GET /api/leaves/summary` provides LOP calculations

### 5. Enhanced Calendar with LOP Marking
**Implementation**: Visual calendar interface showing leave status and LOP information.

**Features**:
- **Leave Visualization**: Different colors for approved, pending, and rejected leaves
- **LOP Indicators**: Special marking for days that result in LOP deduction
- **Salary Details**: Hover tooltips showing daily salary deduction amounts
- **Month Navigation**: Easy browsing of different months/years

**Visual Indicators**:
- 🟢 **Green**: Approved leaves within quota
- 🟡 **Yellow**: Pending leave requests
- 🔴 **Red**: Rejected leaves
- 🟠 **Orange with LOP badge**: Days resulting in LOP deduction

**Technical Implementation**:
- API: `GET /api/calendar` provides calendar data with LOP information
- Enhanced CSS classes: `.cal-lop-day`, `.lop-amount-tooltip`
- JavaScript: Calendar rendering with LOP visualization

### 6. Comprehensive Salary Management
**Implementation**: Multi-level salary editing and management system.

**Admin Capabilities**:
- **Bulk Operations**: Update salary for departments, sub-departments, or individuals
- **Component Management**: Edit basic salary, allowances, deductions separately
- **LOP Configuration**: Set custom LOP deduction percentages per employee
- **Real-Time Updates**: Changes reflect immediately in salary calculations

**Employee Access**:
- **View-Only**: Employees can view their salary details but cannot edit
- **Transparency**: Complete breakdown of salary components and deductions
- **Historical Data**: Access salary slips for previous months

**Technical Implementation**:
- API: `POST /api/salary/update` for admin salary modifications
- Enhanced `salaryComponents` in User model
- Separation of basic salary, allowances, deductions, and LOP deductions

### 7. Detailed Employee Dashboard & Salary Slip
**Implementation**: Comprehensive dashboard and salary slip generation system.

**Employee Dashboard Features**:
- **Leave Balance**: Real-time display of remaining leaves
- **LOP Tracking**: Current month and year-to-date LOP information
- **Quick Access**: Direct links to detailed salary information
- **Calendar Integration**: Interactive calendar with leave planning

**Salary Slip Features**:
- **Detailed Breakdown**: Complete earnings and deductions breakdown
- **Leave Summary**: Month-specific leave usage and remaining balance
- **LOP Details**: Exact calculation and amount breakdown
- **Professional Format**: Print-ready salary slip generation
- **Historical Access**: View salary slips for any month/year

**Technical Implementation**:
- API: `GET /api/salary/slip` generates detailed salary information
- Enhanced dashboard with leave summary integration
- Printable salary slip HTML generation
- JavaScript: `generateSalarySlip()` and `generateSalarySlipHTML()`

## Additional Enhancements Beyond Requirements

### 8. Enhanced User Experience
- **Real-Time Notifications**: System-wide notification system for success/error messages
- **Responsive Design**: Mobile-friendly interface for all salary and leave features
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Loading States**: Visual feedback during API operations

### 9. Advanced Admin Features
- **Batch Operations**: Process multiple employees simultaneously
- **Audit Trail**: Track all salary and leave modifications
- **Department-Level Controls**: Manage salary structures by organizational hierarchy
- **Custom LOP Rules**: Flexible LOP calculation based on employee categories

### 10. Security & Validation
- **Role-Based Access**: Strict separation between employee and admin capabilities
- **Input Validation**: Comprehensive validation for all salary and leave operations
- **Data Integrity**: Prevent inconsistent leave allocations and salary calculations
- **API Security**: Proper authentication and authorization for all endpoints

## New API Endpoints

### Leave Management
- `POST /api/leaves/allocate-monthly` - Trigger monthly leave allocation (Admin)
- `GET /api/leaves/summary` - Get user's leave summary with LOP calculation
- `GET /api/calendar` - Get calendar data with LOP marking

### Salary Management
- `GET /api/salary/slip` - Generate detailed salary slip
- `POST /api/salary/update` - Update salary components (Admin)

## New Database Fields

### User Model Enhancements
```javascript
monthlyLeaveAllocation: {
    sickLeave: { type: Number, default: 1 },
    annualLeave: { type: Number, default: 1 }
},
currentMonthLeaves: {
    year: { type: Number },
    month: { type: Number },
    sickLeave: { type: Number },
    annualLeave: { type: Number },
    carryForwardSick: { type: Number },
    carryForwardAnnual: { type: Number }
},
lopDetails: {
    currentMonth: { type: Number, default: 0 },
    yearToDate: { type: Number, default: 0 },
    deductionAmount: { type: Number, default: 0 }
},
salaryComponents: {
    basicSalary: { type: Number },
    allowances: { type: Number },
    deductions: { type: Number },
    lopDeduction: { type: Number },
    netSalary: { type: Number }
}
```

### Leave Model Enhancements
```javascript
type: { enum: ["annual", "sick", "unpaid", "maternity", "lop"] },
isLopDeduction: { type: Boolean, default: false },
lopDays: { type: Number, default: 0 },
lopAmount: { type: Number, default: 0 },
month: { type: Number },
year: { type: Number },
isCarryForward: { type: Boolean, default: false },
originalMonth: { type: Number },
autoCreated: { type: Boolean, default: false }
```

## New UI Components

### Salary Page (`salary.html`)
- Complete salary slip interface
- Month/year selector
- Employee selector (Admin)
- Detailed salary breakdown
- Admin controls for salary updates
- Monthly leave allocation trigger

### Enhanced Dashboard
- Leave balance display with carry forward information
- LOP tracking and alerts
- Quick access to salary details
- Enhanced calendar with LOP indicators

## File Structure

```
client/
├── salary.html          # New comprehensive salary page
├── dashboard.html       # Enhanced with leave summary
├── script.js           # Extended with salary functions
└── style.css           # New styles for salary features

server/
├── models/
│   ├── user.js         # Enhanced with salary/leave fields
│   └── leave.js        # Enhanced with LOP tracking
└── server.js           # New salary and leave APIs
```

## Installation & Setup

### 1. Database Migration
The enhanced User and Leave models will automatically handle new fields with default values. No manual migration required.

### 2. Initial Leave Allocation
For existing users, run the monthly allocation API to set up initial leave balances:
```bash
POST /api/leaves/allocate-monthly
```

### 3. Admin Configuration
1. Set LOP deduction percentages for employees via Admin panel
2. Configure basic salary and allowances
3. Test monthly allocation process

## Usage Instructions

### For Employees
1. **View Leave Balance**: Dashboard shows current month allocation and usage
2. **Check LOP Status**: Dashboard displays any LOP days and deductions
3. **Access Salary Details**: Click salary link or navigate to Salary page
4. **Generate Salary Slip**: Use "Generate Slip" button for printable version

### For Administrators
1. **Allocate Monthly Leaves**: Use Admin panel to trigger monthly allocation
2. **Manage Salary Components**: Update basic salary, allowances, deductions
3. **Configure LOP Rates**: Set custom LOP deduction percentages
4. **Monitor Employee Finances**: View detailed salary breakdowns for all employees
5. **Generate Reports**: Export salary slips and leave summaries

## Future Enhancement Opportunities

### 1. Automated Scheduling
- Cron job integration for automatic monthly leave allocation
- Scheduled salary slip generation and email distribution

### 2. Advanced Reporting
- Department-wise leave and salary analytics
- Historical trend analysis
- Export capabilities (PDF, Excel)

### 3. Integration Features
- Payroll system integration
- HR management system connectivity
- Email notifications for leave approvals and salary updates

### 4. Mobile Application
- Dedicated mobile app for leave requests and salary viewing
- Push notifications for important updates
- Offline capability for basic features

This enhanced system provides a comprehensive solution for leave and salary management, ensuring transparency, automation, and administrative control while maintaining a user-friendly interface for all stakeholders.
