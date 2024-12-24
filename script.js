// DOM Elements
const tournamentSelect = document.getElementById('tournamentSelect');
const playerSelect = document.getElementById('playerSelect');
const stageSelect = document.getElementById('stageSelect');
const oddsChart = document.getElementById('oddsChart');
const highestOdds = document.getElementById('highestOdds');
const lowestOdds = document.getElementById('lowestOdds');
const loadingIndicator = document.getElementById('loading');

let chart = null;
let tournamentData = null;

// GitHub repository information
const GITHUB_REPO = 'ATRedshaw/darts-tournament-odds-html';
const GITHUB_BRANCH = 'main';

// Load available tournaments
async function loadTournaments() {
    try {
        loadingIndicator.classList.add('active');
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/Data?ref=${GITHUB_BRANCH}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const files = await response.json();
        const tournaments = files
            .filter(file => file.name.endsWith('.json'))
            .map(file => ({
                name: file.name.replace('.json', '').replace(/-/g, ' '),
                filename: file.name
            }));

        // Populate tournament select
        tournamentSelect.innerHTML = '<option value="">Select Tournament</option>';
        tournaments.forEach(tournament => {
            const option = document.createElement('option');
            option.value = tournament.filename;
            option.textContent = tournament.name;
            tournamentSelect.appendChild(option);
        });

        // Show welcome message
        showWelcomeMessage();
    } catch (error) {
        console.error('Error loading tournaments:', error);
        document.querySelector('.chart-container').innerHTML = 
            `<div class="error-message">Error loading tournaments. Please check the console for details.</div>`;
    } finally {
        loadingIndicator.classList.remove('active');
    }
}

// Update loadTournamentData function
async function loadTournamentData(filename) {
    if (!filename) {
        document.querySelector('.chart-container').classList.remove('has-data');
        return;
    }

    try {
        loadingIndicator.classList.add('active');
        // Clear previous data
        playerSelect.innerHTML = '<option value="">Select Player</option>';
        stageSelect.innerHTML = '<option value="">Select Stage</option>';
        if (chart) {
            chart.destroy();
            chart = null;
        }
        highestOdds.innerHTML = '';
        lowestOdds.innerHTML = '';

        const response = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/Data/${filename}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        tournamentData = await response.json();
        
        // Remove Select2 related code
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
    stageSelect.innerHTML = '<option value="all">All Stages</option>';
    
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
    
    // Add stages in the order they appear in the data
    stages.forEach(stage => {
        const option = document.createElement('option');
        option.value = stage;
        option.textContent = stage;
        stageSelect.appendChild(option);
    });

    // Auto-select first player and all stages
    if (players.length > 0) {
        playerSelect.value = players[0];
        stageSelect.value = 'all';
        updateChart();
    }
}

// Show welcome message when no data is loaded
function showWelcomeMessage() {
    if (chart) {
        chart.destroy();
        chart = null;
    }
    
    chart = new Chart(oddsChart, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            layout: {
                padding: 20
            },
            scales: {
                y: {
                    display: false,
                    grid: {
                        display: false
                    }
                },
                x: {
                    display: false,
                    grid: {
                        display: false
                    }
                }
            },
            plugins: [{
                id: 'welcomeMessage',
                beforeDraw: (chart) => {
                    const ctx = chart.ctx;
                    const width = chart.width;
                    const height = chart.height;

                    // Clear the canvas
                    ctx.save();
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);

                    // Draw the message
                    const message = '📈';
                    const subMessage = 'Select a tournament to begin';
                    
                    // Draw emoji
                    ctx.font = '32px Inter';
                    ctx.fillStyle = '#64748b';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(message, width / 2, height / 2 - 20);
                    
                    // Draw text
                    ctx.font = '14px Inter';
                    ctx.fillText(subMessage, width / 2, height / 2 + 20);
                    
                    ctx.restore();
                }
            }]
        }
    });
}

// Update the chart based on selected player and stage
function updateChart() {
    const selectedPlayer = playerSelect.value;
    const selectedStage = stageSelect.value;
    
    if (!selectedPlayer || !tournamentData?.[selectedPlayer]) {
        document.querySelector('.chart-container').classList.remove('has-data');
        return;
    }

    document.querySelector('.chart-container').classList.add('has-data');
    const playerData = tournamentData[selectedPlayer];
    const dates = Object.keys(playerData).sort();

    // Format dates for display
    const formattedDates = dates.map(date => {
        const [year, month, day] = date.split('-');
        return `${day}/${month}`;
    });

    // Update chart
    if (chart) {
        chart.destroy();
    }

    // Define stage colors - use a color generator based on index
    const getStageColor = (index, total) => {
        const hue = (index * 360 / total) % 360;
        return {
            border: `hsl(${hue}, 70%, 50%)`,
            fill: `hsla(${hue}, 70%, 50%, 0.1)`  // Using hsla for proper transparency
        };
    };

    let datasets;
    if (selectedStage === 'all') {
        // Create datasets for all stages
        const stages = Object.keys(playerData[dates[0]]);
        
        datasets = stages.map((stage, index) => {
            const colors = getStageColor(index, stages.length);
            return {
                label: stage,
                data: dates.map(date => playerData[date][stage]),
                borderColor: colors.border,
                backgroundColor: colors.fill,
                tension: 0.4,
                fill: true
            };
        });
    } else {
        // Create dataset for single stage
        const colors = getStageColor(0, 1);
        datasets = [{
            label: selectedStage,
            data: dates.map(date => playerData[date][selectedStage]),
            borderColor: colors.border,
            backgroundColor: colors.fill,
            tension: 0.4,
            fill: true
        }];
    }

    chart = new Chart(oddsChart, {
        type: 'line',
        data: {
            labels: formattedDates,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: selectedStage === 'all',
                    position: 'top',
                    align: 'center',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
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
    if (selectedStage === 'all') {
        // Hide stats panel for all stages view
        highestOdds.innerHTML = '';
        lowestOdds.innerHTML = '';
    } else {
        updateStats(selectedPlayer, selectedStage, dates, datasets[0].data);
    }
}

// Update the stats panel with highest and lowest pre-match odds
function updateStats(player, stage, dates, odds) {
    // Filter out odds equal to 100 or 0
    const validOddsWithDates = odds.map((odd, index) => ({
        odd: odd,
        date: dates[index]
    })).filter(item => item.odd !== 100 && item.odd !== 0);

    if (validOddsWithDates.length === 0) {
        highestOdds.innerHTML = '<div class="stats-card"><em>No valid odds data available</em></div>';
        lowestOdds.innerHTML = '<div class="stats-card"><em>No valid odds data available</em></div>';
        return;
    }

    // Find highest and lowest odds with their dates
    const highest = validOddsWithDates.reduce((max, current) => 
        current.odd > max.odd ? current : max
    );

    const lowest = validOddsWithDates.reduce((min, current) => 
        current.odd < min.odd ? current : min
    );

    // Format dates for display (DD/MM format)
    const formatDate = (dateStr) => {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}`;
    };

    // Update the HTML elements with formatted odds and dates
    highestOdds.innerHTML = `
        <div class="stats-card">
            <div class="stats-label">Highest Pre-Match Probability</div>
            <div class="stats-value">${highest.odd.toFixed(1)}%</div>
            <div class="stats-date">Recorded on ${formatDate(highest.date)}</div>
        </div>
    `;
    
    lowestOdds.innerHTML = `
        <div class="stats-card">
            <div class="stats-label">Lowest Pre-Match Probability</div>
            <div class="stats-value">${lowest.odd.toFixed(1)}%</div>
            <div class="stats-date">Recorded on ${formatDate(lowest.date)}</div>
        </div>
    `;
}

// Update event listeners
tournamentSelect.addEventListener('change', (e) => loadTournamentData(e.target.value));
playerSelect.addEventListener('change', updateChart);
stageSelect.addEventListener('change', updateChart);

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', loadTournaments);
