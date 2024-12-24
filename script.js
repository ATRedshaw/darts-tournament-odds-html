// DOM Elements
const playerSelect = document.getElementById('playerSelect');
const stageSelect = document.getElementById('stageSelect');
const oddsChart = document.getElementById('oddsChart');
const latestOdds = document.getElementById('latestOdds');
const oddsChange = document.getElementById('oddsChange');
const loadingIndicator = document.getElementById('loading');

let chart = null;
let tournamentData = null;

// Load tournament data
async function loadTournamentData() {
    try {
        loadingIndicator.classList.add('active');
        const response = await fetch('Data/World-Championship-(Pre-Christmas)-2025.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        tournamentData = await response.json();
        initializeDashboard();
    } catch (error) {
        console.error('Error loading tournament data:', error);
        document.querySelector('.chart-container').innerHTML = 
            `<div class="error-message">Error loading tournament data. Please check the console for details.</div>`;
    } finally {
        loadingIndicator.classList.remove('active');
    }
}

// Initialize the dashboard
function initializeDashboard() {
    if (!tournamentData) return;

    // Clear existing options
    playerSelect.innerHTML = '<option value="">Select Player</option>';
    stageSelect.innerHTML = '<option value="">Select Stage</option>';
    
    // Populate player select
    const players = Object.keys(tournamentData);
    players.sort().forEach(player => {
        const option = document.createElement('option');
        option.value = player;
        option.textContent = player;
        playerSelect.appendChild(option);
    });

    // Get stages from the first player's most recent date
    const firstPlayer = players[0];
    const playerDates = Object.keys(tournamentData[firstPlayer]).sort();
    const latestDate = playerDates[playerDates.length - 1];
    const stages = Object.keys(tournamentData[firstPlayer][latestDate]);
    
    // Sort stages in tournament order
    const stageOrder = [
        "Last 128",
        "Last 64",
        "Last 32",
        "Last 16",
        "Quarter Finals",
        "Semi Finals",
        "Final"
    ];
    
    stages.sort((a, b) => stageOrder.indexOf(a) - stageOrder.indexOf(b))
          .forEach(stage => {
              const option = document.createElement('option');
              option.value = stage;
              option.textContent = stage;
              stageSelect.appendChild(option);
          });

    // Set default selections
    if (players.length > 0) {
        playerSelect.value = players[0];
    }
    if (stages.length > 0) {
        stageSelect.value = stages[0];
    }

    // Initial update
    updateChart();
}

// Update the chart based on selected player and stage
function updateChart() {
    const selectedPlayer = playerSelect.value;
    const selectedStage = stageSelect.value;
    
    if (!selectedPlayer || !selectedStage || !tournamentData?.[selectedPlayer]) {
        return;
    }

    const playerData = tournamentData[selectedPlayer];
    const dates = Object.keys(playerData).sort();
    const odds = dates.map(date => playerData[date][selectedStage]);

    // Format dates for display
    const formattedDates = dates.map(date => {
        const [year, month, day] = date.split('-');
        return `${day}/${month}`;
    });

    // Update chart
    if (chart) {
        chart.destroy();
    }

    chart = new Chart(oddsChart, {
        type: 'line',
        data: {
            labels: formattedDates,
            datasets: [{
                label: `${selectedStage} Odds`,
                data: odds,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `Probability: ${context.raw.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Probability (%)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });

    // Update stats panel
    updateStats(selectedPlayer, selectedStage, dates, odds);
}

// Update the stats panel with latest odds and 24h change
function updateStats(player, stage, dates, odds) {
    const latestOddsValue = odds[odds.length - 1];
    const previousOddsValue = odds[odds.length - 2] || latestOddsValue;
    const oddsChangeValue = latestOddsValue - previousOddsValue;

    latestOdds.innerHTML = `<strong>${latestOddsValue.toFixed(1)}%</strong>`;
    
    const changeText = oddsChangeValue.toFixed(1);
    const changeSymbol = oddsChangeValue > 0 ? '▲' : oddsChangeValue < 0 ? '▼' : '►';
    const changeClass = oddsChangeValue > 0 ? 'positive' : oddsChangeValue < 0 ? 'negative' : 'neutral';
    oddsChange.innerHTML = `<span class="${changeClass}">${changeSymbol} ${changeText}%</span>`;
}

// Event listeners
playerSelect.addEventListener('change', updateChart);
stageSelect.addEventListener('change', updateChart);

// Start loading data when the page loads
document.addEventListener('DOMContentLoaded', loadTournamentData);
