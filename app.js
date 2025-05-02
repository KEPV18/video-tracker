// app.js

// أضف هذه الثوابت في بداية الملف
const SPREADSHEET_ID = 'your-sheet-id';
const API_KEY = 'your-api-key';
const SHEET_NAME = 'Sheet1';

// أضف هذا الدالة الجديدة لاستيراد البيانات
async function loadSheetData() {
    try {
        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`
        );
        
        const data = await response.json();
        return data.values;
    } catch (error) {
        console.error('Error loading sheet data:', error);
        return null;
    }
}

// أضف هذه الدالة لحساب الإحصائيات
function calculateProgress(data) {
    const today = new Date().toISOString().split('T')[0];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    let todayData = null;
    const monthData = [];
    let totalVideos = 0;
    let totalHours = 0;
    let workingDays = 0;

    data.forEach(row => {
        const date = row[0];
        if (!date) return;

        // معالجة بيانات اليوم الحالي
        if (date === today) {
            todayData = {
                videos: row[10] || row[1] || 0, // العمود K ثم B
                hours: row[11] || row[2] || 0   // العمود L ثم C
            };
        }

        // معالجة بيانات الشهر الحالي
        const rowDate = new Date(date);
        if (rowDate.getMonth() === currentMonth && rowDate.getFullYear() === currentYear) {
            const videos = parseInt(row[10] || row[1] || 0);
            const hours = parseFloat(row[11] || row[2] || 0);
            
            if (videos > 0 || hours > 0) {
                monthData.push({
                    date,
                    videos,
                    hours
                });
                workingDays++;
                totalVideos += videos;
                totalHours += hours;
            }
        }
    });

    return { todayData, monthData, totalVideos, totalHours, workingDays };
}

// أضف هذه الدالة لتحديث واجهة المستخدم
function updateUIWithSheetData(progressData) {
    const { todayData, totalVideos, totalHours, workingDays } = progressData;
    
    // تحديث بيانات اليوم
    if (todayData) {
        document.getElementById('videos-count').textContent = todayData.videos;
        document.getElementById('speed').textContent = 
            (todayData.videos / (todayData.hours * 60)).toFixed(1);
    }
    
    // حساب الأهداف
    const dailyVideoTarget = 3000;
    const dailyHourTarget = 8;
    const weeklyVideoTarget = dailyVideoTarget * 6;
    const monthlyVideoTarget = dailyVideoTarget * workingDays;
    const weeklyHourTarget = dailyHourTarget * 6;
    const monthlyHourTarget = dailyHourTarget * workingDays;
    
    // تحديث شريط التقدم للفيديوهات
    updateProgressSection({
        current: todayData?.videos || 0,
        daily: dailyVideoTarget,
        weekly: weeklyVideoTarget,
        monthly: monthlyVideoTarget,
        elements: { /* العناصر هنا */ }
    });
    
    // تحديث شريط التقدم للساعات
    updateProgressSection({
        current: todayData?.hours || 0,
        daily: dailyHourTarget,
        weekly: weeklyHourTarget,
        monthly: monthlyHourTarget,
        elements: { /* العناصر هنا */ },
        formatValue: v => v.toFixed(1)
    });
}

// عدّل دالة initApp لتحميل البيانات
async function initApp() {
    // ... الكود الحالي ...
    
    // تحميل بيانات الجدول
    const sheetData = await loadSheetData();
    if (sheetData) {
        const progressData = calculateProgress(sheetData);
        localStorage.setItem('sheetData', JSON.stringify(progressData));
        updateUIWithSheetData(progressData);
    }

}
// Main application file
document.addEventListener('DOMContentLoaded', () => {
    // Initialize variables
    // Add totalHours variable at the top with other variables
    let timerInterval;
    let startTime;
    let isRunning = false;
    let totalSeconds = 0;
    let totalHours = 0;
    let videosLogged = 0;
    let vacationMode = false;
    let notificationsEnabled = false;
    let pendingSync = [];
    let lastNotificationTime = 0;

    // DOM elements
    const minutesElement = document.getElementById('minutes');
    const secondsElement = document.getElementById('seconds');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const addVideoBtn = document.getElementById('add-video');
    const videosCountElement = document.getElementById('videos-count');
    const speedElement = document.getElementById('speed');
    const dailyProgressElement = document.getElementById('daily-progress');
    const weeklyProgressElement = document.getElementById('weekly-progress');
    const monthlyProgressElement = document.getElementById('monthly-progress');
    const dailyPercentageElement = document.getElementById('daily-percentage');
    const weeklyPercentageElement = document.getElementById('weekly-percentage');
    const monthlyPercentageElement = document.getElementById('monthly-percentage');
    const dailyVideosElement = document.getElementById('daily-videos');
    const weeklyVideosElement = document.getElementById('weekly-videos');
    const monthlyVideosElement = document.getElementById('monthly-videos');
    const vacationToggle = document.getElementById('vacation-toggle');
    const vacationInfo = document.getElementById('vacation-info');
    const officialForm = document.getElementById('official-form');
    const officialVideosInput = document.getElementById('official-videos');
    const officialHoursInput = document.getElementById('official-hours');
    const comparisonResult = document.getElementById('comparison-result');
    const videosDiffElement = document.getElementById('videos-diff');
    const hoursDiffElement = document.getElementById('hours-diff');
    const speedDiffElement = document.getElementById('speed-diff');
    const exportDailyBtn = document.getElementById('export-daily');
    const exportWeeklyBtn = document.getElementById('export-weekly');
    const exportMonthlyBtn = document.getElementById('export-monthly');
    const notificationToggle = document.getElementById('notification-toggle');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const notificationContainer = document.getElementById('notification-container');
    
    // Charts
    let videosChart, speedChart;

    // Load saved data from localStorage
    function loadData() {
        const savedData = localStorage.getItem('videoTrackerData');
        if (savedData) {
            const data = JSON.parse(savedData);
            videosLogged = data.videosLogged || 0;
            totalSeconds = data.totalSeconds || 0;
            totalHours = data.totalHours || 0;
            vacationMode = data.vacationMode || false;
            vacationToggle.checked = vacationMode;
            
            updateUI();
        }
    }

    // Save data to localStorage
    function saveData() {
        const data = {
            videosLogged,
            totalSeconds,
            totalHours,
            vacationMode
        };
        localStorage.setItem('videoTrackerData', JSON.stringify(data));
    }

    // Update UI elements
    function updateUI() {
        // Update video count
        videosCountElement.textContent = videosLogged;
        
        // Update speed calculation
        if (totalSeconds > 0) {
            const minutes = totalSeconds / 60;
            const speed = videosLogged / minutes;
            speedElement.textContent = speed.toFixed(1);
        } else {
            speedElement.textContent = '0.0';
        }
        
        // Update progress bars
        updateProgressBars();
    }

    // Start the timer
    function startTimer() {
        if (!isRunning) {
            isRunning = true;
            startTime = Date.now() - totalSeconds * 1000;
            
            timerInterval = setInterval(updateTimer, 1000);
            
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            stopBtn.disabled = false;
            
            showNotification('Timer started!');
        }
    }

    // Pause the timer
    function pauseTimer() {
        if (isRunning) {
            clearInterval(timerInterval);
            isRunning = false;
            
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            stopBtn.disabled = false;
            
            showNotification('Timer paused!');
        }
    }

    // Stop the timer
    // Update the stopTimer function
    function stopTimer() {
        if (isRunning) {
            clearInterval(timerInterval);
            isRunning = false;
            
            // Reset timer to zero
            totalSeconds = 0;
            startTime = null;
            minutesElement.textContent = '00';
            secondsElement.textContent = '00';
            
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            stopBtn.disabled = true;
            
            // Sync data to backend
            syncDataToBackend();
            
            showNotification('Timer stopped and reset!');
        }
    }

    
        


    // Add a video to the counter
    function addVideo() {
        videosLogged++;
        updateUI();
        
        // Animate the button
        addVideoBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            addVideoBtn.style.transform = 'scale(1)';
        }, 100);
        
        // Sync data to backend
        syncDataToBackend();
    }

    // Update progress bars
    // Update the updateProgressBars function
    function updateProgressBars() {
        // Constants
        const DAILY_VIDEO_TARGET = 3000;
        const DAILY_HOURS_TARGET = 8;
        const WORKING_DAYS = vacationMode ? 7 : 6;
        const WEEKLY_VIDEO_TARGET = DAILY_VIDEO_TARGET * WORKING_DAYS;
        const WEEKLY_HOURS_TARGET = DAILY_HOURS_TARGET * WORKING_DAYS;
        
        // Calculate monthly targets
        const monthlyVideoTarget = calculateMonthlyTarget();
        const monthlyHoursTarget = calculateMonthlyHoursTarget();
        
        // Update video progress
        updateProgressSection({
            current: videosLogged,
            daily: DAILY_VIDEO_TARGET,
            weekly: WEEKLY_VIDEO_TARGET,
            monthly: monthlyVideoTarget,
            elements: {
                daily: {
                    progress: dailyProgressElement,
                    percentage: dailyPercentageElement,
                    count: dailyVideosElement
                },
                weekly: {
                    progress: weeklyProgressElement,
                    percentage: weeklyPercentageElement,
                    count: weeklyVideosElement
                },
                monthly: {
                    progress: monthlyProgressElement,
                    percentage: monthlyPercentageElement,
                    count: monthlyVideosElement
                }
            }
        });
        
        // Update hours progress
        updateProgressSection({
            current: totalHours,
            daily: DAILY_HOURS_TARGET,
            weekly: WEEKLY_HOURS_TARGET,
            monthly: monthlyHoursTarget,
            elements: {
                daily: {
                    progress: document.getElementById('daily-hours-progress'),
                    percentage: document.getElementById('daily-hours-percentage'),
                    count: document.getElementById('daily-hours')
                },
                weekly: {
                    progress: document.getElementById('weekly-hours-progress'),
                    percentage: document.getElementById('weekly-hours-percentage'),
                    count: document.getElementById('weekly-hours')
                },
                monthly: {
                    progress: document.getElementById('monthly-hours-progress'),
                    percentage: document.getElementById('monthly-hours-percentage'),
                    count: document.getElementById('monthly-hours')
                }
            },
            formatValue: (val) => val.toFixed(1)
        });
    }

    function updateProgressSection({ current, daily, weekly, monthly, elements, formatValue = String }) {
        // Daily progress
        const dailyPercentage = Math.min((current / daily) * 100, 100);
        elements.daily.progress.style.width = `${dailyPercentage}%`;
        elements.daily.percentage.textContent = `${Math.round(dailyPercentage)}%`;
        elements.daily.count.textContent = `${formatValue(current)}/${formatValue(daily)}`;
        
        // Weekly progress
        const weeklyPercentage = Math.min((current / weekly) * 100, 100);
        elements.weekly.progress.style.width = `${weeklyPercentage}%`;
        elements.weekly.percentage.textContent = `${Math.round(weeklyPercentage)}%`;
        elements.weekly.count.textContent = `${formatValue(current)}/${formatValue(weekly)}`;
        
        // Monthly progress
        const monthlyPercentage = Math.min((current / monthly) * 100, 100);
        elements.monthly.progress.style.width = `${monthlyPercentage}%`;
        elements.monthly.percentage.textContent = `${Math.round(monthlyPercentage)}%`;
        elements.monthly.count.textContent = `${formatValue(current)}/${formatValue(monthly)}`;
    }

    // Add new helper function for monthly hours target
    function calculateMonthlyHoursTarget() {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        let workingDays = 0;
        let currentDate = new Date(firstDayOfMonth);
        
        while (currentDate <= lastDayOfMonth) {
            const day = currentDate.getDay();
            if (vacationMode || (day !== 0 && day !== 6)) {
                workingDays++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return workingDays * 8; // 8 hours per working day
    }
    
    // Add helper functions for weekly and monthly hours
    function getWeeklyHours() {
        // This would be implemented with actual data from the backend
        // For now, we'll just use the current day's hours
        return totalHours;
    }
    
    function getMonthlyHours() {
        // This would be implemented with actual data from the backend
        // For now, we'll just use the current day's hours
        return totalHours;
    }
    
    // Update the updateTimer function
    function updateTimer() {
        totalSeconds = Math.floor((Date.now() - startTime) / 1000);
        totalHours = totalSeconds / 3600;
        
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        minutesElement.textContent = minutes.toString().padStart(2, '0');
        secondsElement.textContent = seconds.toString().padStart(2, '0');
        
        updateUI();
        
        if (notificationsEnabled && Date.now() - lastNotificationTime >= 3600000) {
            lastNotificationTime = Date.now();
            showNotification('Time to log your progress!');
        }
    }

    // Calculate monthly target based on working days
    function calculateMonthlyTarget() {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        let workingDays = 0;
        let currentDate = new Date(firstDayOfMonth);
        
        while (currentDate <= lastDayOfMonth) {
            const day = currentDate.getDay();
            // Count all days if in manual mode, otherwise exclude weekends
            if (vacationMode || (day !== 0 && day !== 6)) {
                workingDays++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return workingDays * 3000; // 3000 videos per working day
    }

    // Get videos for the current week
    function getWeeklyVideos() {
        // This would be implemented with actual data from the backend
        // For now, we'll just use the current day's videos
        return videosLogged;
    }

    // Get videos for the current month
    function getMonthlyVideos() {
        // This would be implemented with actual data from the backend
        // For now, we'll just use the current day's videos
        return videosLogged;
    }

    // Get color based on percentage
    function getColorForPercentage(percentage) {
        if (percentage >= 100) return '#28a745'; // Green
        if (percentage >= 80) return '#ffc107';  // Yellow
        return '#dc3545';                        // Red
    }

    // Toggle vacation mode
    function toggleVacationMode() {
        vacationMode = !vacationMode;
        vacationInfo.textContent = vacationMode 
            ? 'Current: Manual mode (7 working days/week)'
            : 'Current: Auto mode (6 working days/week)';
        saveData();
        updateProgressBars();
    }

    // Sync data to backend
    async function syncDataToBackend() {
        try {
            const response = await fetch('api/sync-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'your-secret-api-key' // Replace with your actual API key
                },
                body: JSON.stringify({
                    videosLogged,
                    totalSeconds,
                    vacationMode
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to sync data');
            }
            
            // Clear any pending sync for this data
            pendingSync = pendingSync.filter(item => 
                item.videosLogged !== videosLogged || item.totalSeconds !== totalSeconds
            );
            
            showNotification('Data synced successfully!');
        } catch (error) {
            console.error('Error syncing data:', error);
            
            // Add to pending sync queue
            pendingSync.push({ videosLogged, totalSeconds, vacationMode, timestamp: Date.now() });
            
            // Save to localStorage as a fallback
            localStorage.setItem(
                'pendingSync',
                JSON.stringify(pendingSync)
            );
            
            showNotification('Failed to sync data. Will retry automatically.', 'error');
            
            // Try to resend after 30 seconds
            setTimeout(attemptResend, 30000);
        }
    }

    // Attempt to resend pending data
    function attemptResend() {
        if (pendingSync.length > 0) {
            const oldestData = pendingSync[0];
            
            // Check if we've tried too many times
            const attempts = localStorage.getItem(`syncAttempts-${oldestData.timestamp}`) || 0;
            
            if (attempts < 3) {
                localStorage.setItem(
                    `syncAttempts-${oldestData.timestamp}`,
                    String(attempts + 1)
                );
                
                // Try to sync again
                syncDataToBackend();
            } else {
                // Give up after 3 attempts
                pendingSync.shift();
                localStorage.setItem('pendingSync', JSON.stringify(pendingSync));
                showNotification('Sync failed after multiple attempts. Data saved locally.', 'error');
            }
        }
    }

    // Load pending sync data from localStorage
    function loadPendingSync() {
        const savedPendingSync = localStorage.getItem('pendingSync');
        if (savedPendingSync) {
            pendingSync = JSON.parse(savedPendingSync);
        }
    }

    // Handle official data submission
    async function handleOfficialDataSubmit(event) {
        event.preventDefault();
        
        const officialVideos = parseInt(officialVideosInput.value) || 0;
        const officialHours = parseFloat(officialHoursInput.value) || 0;
        
        if (isNaN(officialVideos) || isNaN(officialHours)) {
            showNotification('Please enter valid numbers', 'error');
            return;
        }
        
        try {
            const response = await fetch('api/submit-official-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'your-secret-api-key' // Replace with your actual API key
                },
                body: JSON.stringify({
                    officialVideos,
                    officialHours,
                    videosLogged,
                    totalSeconds
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to submit official data');
            }
            
            const result = await response.json();
            
            // Calculate differences
            const videosDiff = officialVideos - videosLogged;
            const hoursDiff = officialHours - (totalSeconds / 3600);
            const speedDiff = (officialVideos / officialHours) - (videosLogged / (totalSeconds / 3600));
            
            // Update UI with comparison results
            videosDiffElement.textContent = videosDiff;
            videosDiffElement.className = 'comparison-diff ' + (videosDiff >= 0 ? 'plus' : 'minus');
            
            hoursDiffElement.textContent = hoursDiff.toFixed(2);
            hoursDiffElement.className = 'comparison-diff ' + (hoursDiff >= 0 ? 'plus' : 'minus');
            
            speedDiffElement.textContent = speedDiff.toFixed(2);
            speedDiffElement.className = 'comparison-diff ' + (speedDiff >= 0 ? 'plus' : 'minus');
            
            comparisonResult.style.display = 'block';
            
            // Reset form
            officialVideosInput.value = '';
            officialHoursInput.value = '';
            
            showNotification('Official data submitted successfully!');
        } catch (error) {
            console.error('Error submitting official data:', error);
            showNotification('Failed to submit official data', 'error');
        }
    }

    // Export reports
    async function exportReport(type) {
        try {
            const response = await fetch(`api/export-report?type=${type}`, {
                headers: {
                    'X-API-Key': 'your-secret-api-key' // Replace with your actual API key
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to export report');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            let filename;
            switch (type) {
                case 'daily':
                    filename = `daily-report-${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                case 'weekly':
                    filename = `weekly-report-${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                case 'monthly':
                    filename = `monthly-report-${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                default:
                    filename = 'video-tracker-report.csv';
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            
            showNotification(`Successfully exported ${type} report!`);
        } catch (error) {
            console.error('Error exporting report:', error);
            showNotification(`Failed to export ${type} report`, 'error');
        }
    }

    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notificationContainer.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                notificationContainer.removeChild(notification);
            }, 500);
        }, 3000);
    }


    // أضف حدث تحميل البيانات عند فتح الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    // محاولة استخدام البيانات المحفوظة أولاً
    const savedData = localStorage.getItem('sheetData');
    if (savedData) {
        updateUIWithSheetData(JSON.parse(savedData));
    }
    
    // تحديث البيانات من الجدول
    const sheetData = await loadSheetData();
    if (sheetData) {
        const progressData = calculateProgress(sheetData);
        localStorage.setItem('sheetData', JSON.stringify(progressData));
        updateUIWithSheetData(progressData);
    }

    } 

    // Initialize charts
    function initCharts() {
        // Videos chart
        const videosCtx = document.getElementById('videos-chart').getContext('2d');
        videosChart = new Chart(videosCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Videos Logged',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#4a6bff',
                    backgroundColor: 'rgba(74, 107, 255, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Speed chart
        const speedCtx = document.getElementById('speed-chart').getContext('2d');
        speedChart = new Chart(speedCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Videos per Minute',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Toggle dark mode
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
    }

    // Initialize dark mode from localStorage
    function initDarkMode() {
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        }
    }

    // Event listeners
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    stopBtn.addEventListener('click', stopTimer);
    addVideoBtn.addEventListener('click', addVideo);
    vacationToggle.addEventListener('change', toggleVacationMode);
    officialForm.addEventListener('submit', handleOfficialDataSubmit);
    exportDailyBtn.addEventListener('click', () => exportReport('daily'));
    exportWeeklyBtn.addEventListener('click', () => exportReport('weekly'));
    exportMonthlyBtn.addEventListener('click', () => exportReport('monthly'));
    notificationToggle.addEventListener('change', (e) => {
        notificationsEnabled = e.target.checked;
        if (notificationsEnabled) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    showNotification('Notifications enabled!');
                } else {
                    showNotification('Notifications blocked!', 'warning');
                }
            });
        } else {
            showNotification('Notifications disabled!');
        }
    });
    darkModeToggle.addEventListener('click', toggleDarkMode);

    // Initialize the app
    function initApp() {
        loadData();
        loadPendingSync();
        initCharts();
        initDarkMode();
        updateProgressBars();
        
        // Request notification permission on load
        if (!'Notification' in window) {
            showNotification('This browser does not support desktop notifications.', 'warning');
        } else if (Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
    }

    // Start the app
    initApp();
});


    
