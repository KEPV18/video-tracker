const API_TOKEN = 'YOUR_GITHUB_TOKEN'; // استبدل بالقيمة الحقيقية
const GIST_ID = 'YOUR_GIST_ID'; // استبدل بالقيمة الحقيقية
const GIST_FILENAME = 'video_data.json';

let videos = 0;
let startTime = null;
let timerInterval;
let isDark = false;

// العناصر DOM
const videoCount = document.getElementById('video-count');
const timeSpent = document.getElementById('time-spent');
const speed = document.getElementById('speed');
const addVideoBtn = document.getElementById('add-video');
const themeToggle = document.getElementById('theme-toggle');

// تهيئة الرسوم البيانية
const ctx = document.getElementById('progress-chart').getContext('2d');
const progressChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['اليوم', 'الأسبوع', 'الشهر'],
        datasets: [{
            label: 'الفيديوهات المنجزة',
            data: [0, 0, 0],
            backgroundColor: [
                'rgba(52, 152, 219, 0.7)',
                'rgba(46, 204, 113, 0.7)',
                'rgba(155, 89, 182, 0.7)'
            ]
        }]
    }
});

// تحميل البيانات الأولية
loadInitialData();

// الأحداث
addVideoBtn.addEventListener('click', addVideo);
themeToggle.addEventListener('click', toggleTheme);

async function loadInitialData() {
    try {
        const response = await axios.get(`https://api.github.com/gists/${GIST_ID}`);
        const data = JSON.parse(response.data.files[GIST_FILENAME].content);
        
        videos = data.videos || 0;
        startTime = data.startTime ? new Date(data.startTime) : null;
        
        updateUI();
        if (startTime) startTimer();
    } catch (error) {
        console.log('جارٍ التحميل من الذاكرة المحلية...');
        const localData = localStorage.getItem('videoData');
        if (localData) {
            const data = JSON.parse(localData);
            videos = data.videos;
            startTime = data.startTime ? new Date(data.startTime) : null;
            updateUI();
        }
    }
}

async function saveData() {
    const data = {
        videos,
        startTime: startTime?.toISOString(),
        updatedAt: new Date().toISOString()
    };

    // الحفظ في GitHub Gist
    try {
        await axios.patch(`https://api.github.com/gists/${GIST_ID}`, {
            files: {
                [GIST_FILENAME]: {
                    content: JSON.stringify(data)
                }
            }
        }, {
            headers: {
                Authorization: `token ${API_TOKEN}`
            }
        });
    } catch (error) {
        // Fallback إلى localStorage
        localStorage.setItem('videoData', JSON.stringify(data));
    }
}

function addVideo() {
    videos++;
    if (!startTime) startTimer();
    updateUI();
    saveData();
}

function startTimer() {
    startTime = new Date();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const now = new Date();
    const diff = now - startTime;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    timeSpent.textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    updateSpeed();
}

function updateSpeed() {
    const minutes = (new Date() - startTime) / 60000;
    const currentSpeed = (videos / minutes).toFixed(1);
    speed.textContent = `${currentSpeed} فيديو/دقيقة`;
}

function updateUI() {
    videoCount.textContent = videos;
    updateChart();
}

function updateChart() {
    progressChart.data.datasets[0].data = [videos, videos * 6, videos * 24];
    progressChart.update();
}

function toggleTheme() {
    isDark = !isDark;
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
