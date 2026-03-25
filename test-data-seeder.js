#!/usr/bin/env node

const API_BASE = 'http://localhost:5001';

async function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔹';
    console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function apiCall(endpoint, data = null) {
    const options = {
        method: data ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' }
    };
    if (data) options.body = JSON.stringify(data);

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    return response;
}

async function createTestUsers() {
    await log('Creating test users...', 'info');

    const users = [
        {
            email: 'admin@sophia-academy.com',
            password: 'admin123',
            name: 'Admin User',
            department: 'Sophia Academy',
            subDepartment: 'Administration',
            role: 'admin'
        },
        {
            email: 'john.doe@sophia-academy.com',
            password: 'john123',
            name: 'John Doe',
            department: 'Sophia Academy',
            subDepartment: 'Teaching Staff',
            role: 'employee'
        },
        {
            email: 'jane.smith@sophia-academy.com',
            password: 'jane123',
            name: 'Jane Smith',
            department: 'Sophia Academy',
            subDepartment: 'Non-Teaching Staff',
            role: 'employee'
        }
    ];

    for (const user of users) {
        try {
            const response = await apiCall('/api/auth/register', user);
            if (response.ok) {
                await log(`Created user: ${user.name} (${user.email})`, 'success');
            } else {
                const error = await response.text();
                await log(`Failed to create ${user.name}: ${error}`, 'error');
            }
        } catch (error) {
            await log(`Error creating ${user.name}: ${error.message}`, 'error');
        }
    }
}

async function addTestAttendance() {
    await log('Adding test attendance data...', 'info');

    try {
        const loginRes = await apiCall('/api/auth/login', {
            email: 'admin@sophia-academy.com',
            password: 'admin123'
        });

        if (!loginRes.ok) {
            await log('Failed to login as admin. Create test users first.', 'error');
            return;
        }

        const { token } = await loginRes.json();

        // Add attendance records for the past week
        const attendanceData = [];
        const today = new Date();

        for (let i = 7; i >= 1; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            if (date.getDay() !== 0) { // Skip Sundays
                attendanceData.push({
                    employeeEmail: 'john.doe@sophia-academy.com',
                    date: date.toISOString().split('T')[0],
                    status: i % 4 === 0 ? 'half-day' : 'present'
                });

                attendanceData.push({
                    employeeEmail: 'jane.smith@sophia-academy.com',
                    date: date.toISOString().split('T')[0],
                    status: i % 5 === 0 ? 'absent' : 'present'
                });
            }
        }

        // Post attendance records
        for (const record of attendanceData) {
            const response = await fetch(`${API_BASE}/api/attendance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(record)
            });

            if (response.ok) {
                await log(`Added attendance for ${record.employeeEmail} on ${record.date}`, 'success');
            } else {
                await log(`Failed to add attendance for ${record.employeeEmail}`, 'error');
            }
        }

    } catch (error) {
        await log(`Error adding attendance: ${error.message}`, 'error');
    }
}

async function seedSampleData() {
    try {
        await log('🚀 Starting full data seeding process...', 'info');

        // Test server connection
        const testResponse = await fetch(API_BASE);
        if (!testResponse.ok) {
            await log('Backend server is not accessible. Make sure it\'s running.', 'error');
            return;
        }
        await log('Backend server is running and accessible', 'success');

        await createTestUsers();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        await addTestAttendance();

        await log('✨ Sample data seeding complete! You can now test the dashboard.', 'success');
        console.log('\n📋 Sample Credentials:');
        console.log('👤 Admin: admin@sophia-academy.com / admin123');
        console.log('👤 Employee: john.doe@sophia-academy.com / john123');
        console.log('👤 Employee: jane.smith@sophia-academy.com / jane123');
        console.log('\n🌐 Login at: file:///Users/Aymaan/Downloads/hrms-main/client/login/login.html');

    } catch (error) {
        await log(`Fatal error during seeding: ${error.message}`, 'error');
    }
}

// Run the seeder
seedSampleData();
