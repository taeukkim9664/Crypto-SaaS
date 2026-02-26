import * as THREE from 'three';

// --- 3D Background Logic ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg') });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.setZ(30);

const textureLoader = new THREE.TextureLoader();
const moonTexture = textureLoader.load('public/moon.jpg');
const normalTexture = textureLoader.load('public/normal.jpg');
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(3, 32, 32),
  new THREE.MeshStandardMaterial({ map: moonTexture, normalMap: normalTexture })
);
moon.position.set(15, 5, -5);
scene.add(moon);

const starGeometry = new THREE.BufferGeometry();
const starVertices = [];
for (let i = 0; i < 15000; i++) {
  const x = (Math.random() - 0.5) * 2000;
  const y = (Math.random() - 0.5) * 2000;
  const z = (Math.random() - 0.5) * 2000;
  starVertices.push(x, y, z);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.02 }));
scene.add(stars);

const pointLight = new THREE.PointLight(0xffffff);
pointLight.position.set(5, 5, 5);
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(pointLight, ambientLight);

function moveCamera() {
  const t = document.body.getBoundingClientRect().top;
  moon.rotation.x += 0.001;
  moon.rotation.y += 0.002;
  camera.position.z = t * -0.01 + 30;
  camera.position.x = t * -0.0002;
  camera.rotation.y = t * -0.0002;
}
document.body.onscroll = moveCamera;

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// --- Real-time Kimchi Premium Chart Logic ---
let kimchiPremiumChart;
let chartUpdateInterval;
let currentSymbol = 'BTC'; // Default symbol
const MAX_DATA_POINTS = 30;

const symbolButtons = document.querySelectorAll('.symbol-btn');
const domesticExchangeSelect = document.getElementById('domestic-exchange');
const internationalExchangeSelect = document.getElementById('international-exchange');

function destroyChart() {
  if (chartUpdateInterval) clearInterval(chartUpdateInterval);
  if (kimchiPremiumChart) kimchiPremiumChart.destroy();
}

async function initChart() {
  destroyChart();

  const ctx = document.getElementById('kimchi-premium-chart').getContext('2d');
  kimchiPremiumChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: '국내 (KRW)', data: [], borderColor: 'rgba(255, 99, 132, 1)', backgroundColor: 'rgba(255, 99, 132, 0.2)', tension: 0.2, fill: true },
        { label: '해외 (KRW 환산)', data: [], borderColor: 'rgba(54, 162, 235, 1)', backgroundColor: 'rgba(54, 162, 235, 0.2)', tension: 0.2, fill: true },
      ],
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
            x: { type: 'time', time: { unit: 'second', displayFormats: { second: 'HH:mm:ss' } }, ticks: { color: '#8b949e' }, grid: { color: '#30363d' } },
            y: { ticks: { color: '#8b949e', callback: value => '₩' + value.toLocaleString('ko-KR') }, grid: { color: '#30363d' } },
        },
        plugins: {
            legend: { labels: { color: '#c9d1d9' } },
            title: { display: true, text: `${currentSymbol} 데이터 로딩 중...`, color: '#c9d1d9', font: { size: 16 } },
        },
        animation: { duration: 500 }
    },
  });

  startChartUpdates();
}

function startChartUpdates() {
  updateChartData();
  chartUpdateInterval = setInterval(updateChartData, 5000);
}

async function updateChartData() {
  const domestic = domesticExchangeSelect.value;
  const international = internationalExchangeSelect.value;

  try {
    const response = await fetch(`/api/kimchi-premium?domestic=${domestic}&international=${international}&symbol=${currentSymbol}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();

    const chart = kimchiPremiumChart;
    const { labels, datasets } = chart.data;
    const timestamp = new Date(data.timestamp);

    labels.push(timestamp);
    datasets[0].data.push(data.domesticPrice);
    datasets[1].data.push(data.internationalPrice * data.usdKrwRate);
    datasets[0].label = `${domestic.toUpperCase()} (KRW)`;
    datasets[1].label = `${international.toUpperCase()} (KRW 환산)`;

    if (labels.length > MAX_DATA_POINTS) {
      labels.shift();
      datasets.forEach(dataset => dataset.data.shift());
    }

    chart.options.plugins.title.text = `${data.symbol} 실시간 김치 프리미엄: ${data.premium}%`;
    chart.update();

  } catch (error) {
    console.error("Chart update failed:", error);
    kimchiPremiumChart.options.plugins.title.text = `${currentSymbol} 데이터 로딩 실패`;
    kimchiPremiumChart.update();
  }
}

// Event Listeners
symbolButtons.forEach(button => {
  button.addEventListener('click', () => {
    // Update active button
    symbolButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // Update symbol and re-initialize chart
    currentSymbol = button.dataset.symbol;
    initChart();
  });
});

document.addEventListener('DOMContentLoaded', initChart);
domesticExchangeSelect.addEventListener('change', initChart);
internationalExchangeSelect.addEventListener('change', initChart);
