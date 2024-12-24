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
        
        // Process tournaments and extract years
        const tournamentsByYear = files
            .filter(file => file.name.endsWith('.json'))
            .map(file => {
                const name = file.name.replace('.json', '').replace(/-/g, ' ');
                // Extract year from the end of the tournament name
                const yearMatch = name.match(/\d{4}$/);
                const year = yearMatch ? yearMatch[0] : 'Unknown';
                return {
                    name: name,
                    filename: file.name,
                    year: year
                };
            })
            .reduce((acc, tournament) => {
                if (!acc[tournament.year]) {
                    acc[tournament.year] = [];
                }
                acc[tournament.year].push(tournament);
                return acc;
            }, {});

        // Sort tournaments within each year alphabetically
        Object.values(tournamentsByYear).forEach(tournaments => {
            tournaments.sort((a, b) => a.name.localeCompare(b.name));
        });

        // Get sorted years in reverse chronological order
        const years = Object.keys(tournamentsByYear).sort().reverse();

        // Populate tournament select with grouped options
        tournamentSelect.innerHTML = '<option value="">Select Tournament</option>';
        years.forEach(year => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = year;
            
            tournamentsByYear[year].forEach(tournament => {
                const option = document.createElement('option');
                option.value = tournament.filename;
                option.textContent = tournament.name;
                optgroup.appendChild(option);
            });
            
            tournamentSelect.appendChild(optgroup);
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
        // Reset UI when no tournament is selected
        playerSelect.innerHTML = '<option value="">Select Player</option>';
        stageSelect.innerHTML = '<option value="">Select Stage</option>';
        document.querySelector('.chart-container').classList.remove('has-data');
        if (chart) {
            chart.destroy();
            chart = null;
        }
        highestOdds.innerHTML = '';
        lowestOdds.innerHTML = '';
        showWelcomeMessage();
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
    
    // Get the first player from the data (before sorting)
    const firstPlayerInData = Object.keys(tournamentData)[0];
    
    // Populate player select with alphabetically sorted names
    const players = Object.keys(tournamentData);
    players.sort().forEach(player => {
        const option = document.createElement('option');
        option.value = player;
        option.textContent = player;
        playerSelect.appendChild(option);
    });

    // Get stages from the first player's most recent date
    const playerDates = Object.keys(tournamentData[firstPlayerInData]).sort();
    const latestDate = playerDates[playerDates.length - 1];
    const stages = Object.keys(tournamentData[firstPlayerInData][latestDate]);
    
    // Add stages in the order they appear in the data
    stages.forEach(stage => {
        const option = document.createElement('option');
        option.value = stage;
        option.textContent = stage;
        stageSelect.appendChild(option);
    });

    // Auto-select first player from data and all stages
    playerSelect.value = firstPlayerInData;
    stageSelect.value = 'all';
    updateChart();
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

// Add this function to determine player's tournament status
function getTournamentProgress(playerData, stages) {
    // Get the latest date's data
    const dates = Object.keys(playerData).sort();
    const latestData = playerData[dates[dates.length - 1]];
    
    // Check if player has won (all probabilities are 100)
    const allHundred = Object.values(latestData).every(prob => prob === 100);
    if (allHundred) {
        return { status: 'winner', message: 'Tournament Winner' };
    }

    // Check if player is eliminated (has a zero probability)
    // Find the earliest stage with 0 probability
    for (const stage of stages) {
        const stageProb = latestData[stage];
        if (stageProb === 0) {
            return { status: 'eliminated', message: `Eliminated in ${stage}` };
        }
    }

    // If neither won nor eliminated, player is still in progress
    return { status: 'active', message: 'Tournament In Progress' };
}

// Define stage colors - use a color generator based on stage name
function getStageColor(stage, allStages) {
    // Get consistent index for this stage
    const index = allStages.indexOf(stage);
    const total = allStages.length;
    const hue = (index * 360 / total) % 360;
    return {
        border: `hsl(${hue}, 70%, 50%)`,
        fill: `hsla(${hue}, 70%, 50%, 0.1)`
    };
}

// Update the chart based on selected player and stage
function updateChart() {
    const selectedPlayer = playerSelect.value;
    const selectedStage = stageSelect.value;
    
    if (!selectedPlayer || !tournamentData?.[selectedPlayer]) {
        document.querySelector('.chart-container').classList.remove('has-data');
        // Clear stats cards when no player is selected
        highestOdds.innerHTML = '';
        lowestOdds.innerHTML = '';
        if (chart) {
            chart.destroy();
            chart = null;
            showWelcomeMessage();
        }
        return;
    }

    document.querySelector('.chart-container').classList.add('has-data');
    const playerData = tournamentData[selectedPlayer];
    const dates = Object.keys(playerData).sort();

    // Get stages in order
    const stages = Object.keys(playerData[dates[0]]);

    // Get tournament progress
    const progress = getTournamentProgress(playerData, stages);

    // Format dates for display
    const formattedDates = dates.map(date => {
        const [year, month, day] = date.split('-');
        return `${day}/${month}`;
    });

    // Update chart
    if (chart) {
        chart.destroy();
    }

    let datasets;
    if (selectedStage === 'all') {
        // Create datasets for all stages
        datasets = stages.map(stage => {
            const colors = getStageColor(stage, stages);
            return {
                label: stage,
                data: dates.map(date => playerData[date][stage]),
                borderColor: colors.border,
                backgroundColor: colors.fill,
                tension: 0,
                fill: true
            };
        });
    } else {
        // Create dataset for single stage - use same color as in all stages view
        const colors = getStageColor(selectedStage, stages);
        datasets = [{
            label: selectedStage,
            data: dates.map(date => playerData[date][selectedStage]),
            borderColor: colors.border,
            backgroundColor: colors.fill,
            tension: 0,
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
                    beginAtZero: selectedStage === 'all',
                    max: selectedStage === 'all' ? 100 : undefined,
                    title: {
                        display: true,
                        text: 'Round Win Probability (%)'
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
        // Show tournament progress card
        highestOdds.innerHTML = `
            <div class="stats-card ${progress.status}">
                <div class="stats-label">Tournament Status</div>
                <div class="stats-value">${progress.message}</div>
            </div>
        `;
        lowestOdds.innerHTML = ''; // Clear lowest odds
    } else {
        updateStats(selectedPlayer, selectedStage, dates, datasets[0].data);
    }
}

// Update the stats panel with highest and lowest pre-match odds
function updateStats(player, stage, dates, odds) {
    // Find the index where the match was played (where probability jumps to 100 or drops to 0)
    let matchPlayedIndex = odds.findIndex((odd, index) => {
        if (index === 0) return false;
        return (odd === 100 && odds[index - 1] < 100) || (odd === 0 && odds[index - 1] > 0);
    });

    // If no match result found, use all odds
    if (matchPlayedIndex === -1) {
        matchPlayedIndex = odds.length;
    }

    // Only use odds up to when the match was played
    const preMatchOdds = odds.slice(0, matchPlayedIndex).map((odd, index) => ({
        odd: odd,
        date: dates[index]
    }));

    if (preMatchOdds.length === 0) {
        highestOdds.innerHTML = '<div class="stats-card"><em>No pre-match odds data available</em></div>';
        lowestOdds.innerHTML = '<div class="stats-card"><em>No pre-match odds data available</em></div>';
        return;
    }

    // Find highest and lowest odds with their dates
    const highest = preMatchOdds.reduce((max, current) => 
        current.odd > max.odd ? current : max
    );

    const lowest = preMatchOdds.reduce((min, current) => 
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
