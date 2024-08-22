document.addEventListener('DOMContentLoaded', function() {
    // Event listener for "Show Result" button
    document.getElementById('showResultButton').onclick = function() {
        submitFormData();
    };
    
    document.getElementById('reportSubmissionButton').onclick = function() {
        const token = localStorage.getItem('authToken');
        if (token) {
            window.location.href = 'report.html'; // Redirect to the report submission page
        } else {
            window.location.href = 'login.html'; // Redirect to the login page
        }
    };

    const token = localStorage.getItem('authToken');
    let reports = [];
    let chart;  // Declare chart variable globally to manage chart instances

    // Fetch reports immediately when the page loads
    fetchReports();

    // Fetch default LLM data and populate the table and chart on page load
    fetchDefaultLLMData();

    // Add event listeners to the dots for switching between charts
    document.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', function() {
            document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
            this.classList.add('active');

            const chartType = this.getAttribute('data-chart');
            if (chartType === 'line') {
                fetchDefaultLLMData(); // Fetch and display the line chart with default data
            } else if (chartType === 'bar') {
                fetchBarChartData(); // Fetch and display the bar chart
            }
        });
    });

    function submitFormData() {
        console.log("Show Result button clicked");
    
        const year = document.getElementById('yearInput').value;
        const month = document.getElementById('monthInput').value || '';
        const day = document.getElementById('dayInput').value || '';
        const llmSelect = document.getElementById('llmSelect');
        
        // Retrieve selected LLMs as a comma-separated string
        const selectedLLMs = Array.from(llmSelect.selectedOptions)
            .map(option => option.value)
            .filter(value => value) // Filter out any empty values
            .join(',');
    
        if (!year || !selectedLLMs) {
            alert('Please provide at least the year and select one or more LLMs.');
            return;
        }
    
        const formData = new FormData();
        formData.append('top_models', 0);
        formData.append('plot_type', 'line_graph');
        formData.append('year', year);
        formData.append('month', month);
        formData.append('day', day);
        formData.append('selected_models', selectedLLMs);
    
        fetch('http://127.0.0.1:8000/charts/api/retrieve-chat-data/', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('Response received:', response.status);
    
            if (!response.ok) {
                return response.text().then(text => {
                    console.error('Error response text:', text);
                    throw new Error('Network response was not ok');
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('API Response:', data);
    
            // Update the table with the full data from POST API
            const allData = populateLLMTable(data, true);  // Pass true to indicate POST API data
    
            // Use the full data to update the chart
            const chartData = prepareChartData(allData);
            createChart('line', chartData);  // Pass true to indicate POST API data
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
    
    function fetchReports() {
        fetch('http://127.0.0.1:8000/reports/api/get-reports/', {
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (response.status === 401) {
                throw new Error('Unauthorized: Authentication credentials were not provided.');
            }
            return response.json();
        })
        .then(data => {
            reports = data;
            displayReports(); // Display all reports
        })
        .catch(error => {
            console.error('Error fetching reports:', error);
            if (error.message === 'Unauthorized: Authentication credentials were not provided.') {
                alert('Please log in to view the reports.');
                window.location.href = 'login.html';
            }
        });
    }

    function truncateText(text, maxLength) {
        if (text.length > maxLength) {
            return text.substring(0, maxLength) + '...';
        }
        return text;
    }

    function displayReports() {
        const newTableBody = document.getElementById('newTableBody');
        newTableBody.innerHTML = ''; // Clear existing table rows

        reports.forEach(report => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${report.id}</td>
                <td>
                    <div class="user-id-container">
                        ${report.user}
                        <div class="hover-buttons">
                            ${token ? `
                                <button onclick="editReport(${report.id})" class="btn btn-sm btn-outline-primary">Edit</button>
                                <button onclick="deleteReport(${report.id})" class="btn btn-sm btn-outline-danger">Delete</button>
                            ` : `
                                <button onclick="redirectToLogin()" class="btn btn-sm btn-outline-secondary">Login</button>
                            `}
                        </div>
                    </div>
                </td>
                <td>${report.caption}</td>
                <td>${report.bias_score}</td>
                <td>${report.ai_model}</td>
                <td>${report.tags ? report.tags.join(', ') : ''}</td>
                <td>${truncateText(report.report_summary, 20)}</td>
                <td>${report.date_added}</td>
                <td class="upvotes">${report.upvotes}</td>
                <td>${report.downvotes}</td>
                <td>${report.get_resolved_score}</td>
                <td>
                    <select class="action-dropdown form-control" data-report-id="${report.id}">
                        <option value="Select Action">Select Action</option>
                        <option value="Upvote">Upvote</option>
                        <option value="Downvote">Downvote</option>
                        <option value="Suggest Tags">Suggest Tags</option>
                        <option value="Mark as Resolved">Mark as Resolved</option>
                        <option value="Enter Bias Rating">Enter Bias Rating</option>
                    </select>
                </td>
            `;

            newTableBody.appendChild(row);
        });
    }

    // Function to fetch default LLM data and populate the table and chart on page load
    function fetchDefaultLLMData() {
        fetch('http://127.0.0.1:8000/charts/api/retrieve-default_chart/line_graph')
            .then(response => response.json())
            .then(data => {
                const chartData = processLineChartData(data);
                populateLLMTable(data); // Populate table with default data on page load
                createChart('line', chartData);  // Create line chart
            })
            .catch(error => {
                console.error('Error fetching default LLM data:', error);
            });
    }

    // Function to fetch bar chart data and create a bar chart
    function fetchBarChartData() {
        fetch('http://127.0.0.1:8000/charts/api/retrieve-default_chart/bar_chart')
            .then(response => response.json())
            .then(data => {
                const chartData = processBarChartData(data);
                createChart('bar', chartData);  // Create bar chart
            })
            .catch(error => {
                console.error('Error fetching bar chart data:', error);
            });
    }

    // Function to process the data received from the API for the line chart
    function processLineChartData(data) {
        const chartLabels = []; // Years
        const datasets = [];

        for (const model in data) {
            const modelData = {
                label: model,
                data: [],
                borderColor: getRandomColor(),
                fill: false,
                tension: 0.1,
            };

            for (const year in data[model]) {
                if (!chartLabels.includes(year)) {
                    chartLabels.push(year);
                }
                const reports = data[model][year];
                let totalBias = 0;
                reports.forEach(report => {
                    for (const version in report) {
                        if (report.hasOwnProperty(version)) {
                            const details = report[version];
                            totalBias += details.bias_score.bias_score;
                        }
                    }
                });
                modelData.data.push(totalBias / reports.length);
            }
            datasets.push(modelData);
        }

        return { labels: chartLabels, datasets: datasets };
    }

    // Function to process the data received from the API for the bar chart
    function processBarChartData(data) {
        const chartLabels = []; // Years
        const datasets = [];
    
        for (const model in data) {
            for (const year in data[model]) {
                if (!chartLabels.includes(year)) {
                    chartLabels.push(year); // Add year to the labels if not already present
                }
    
                const reports = data[model][year];
                console.log(reports);
    
                const tagData = {};
    
                // Check if 'reports' is an object with arrays as values
                if (typeof reports === 'object' && !Array.isArray(reports)) {
                    for (const key in reports) {
                        if (Array.isArray(reports[key])) {
                            reports[key].forEach(report => {
                                report.bias_score.tags.forEach(tag => {
                                    if (!tagData[tag]) {
                                        tagData[tag] = {
                                            totalBias: 0,
                                            count: 0
                                        };
                                    }
                                    tagData[tag].totalBias += report.bias_score.bias_score;
                                    tagData[tag].count++;
                                });
                            });
                        } else {
                            console.error(`Expected an array but got ${typeof reports[key]} for key ${key}`);
                        }
                    }
                } else if (Array.isArray(reports)) {
                    reports.forEach(report => {
                        report.bias_score.tags.forEach(tag => {
                            if (!tagData[tag]) {
                                tagData[tag] = {
                                    totalBias: 0,
                                    count: 0
                                };
                            }
                            tagData[tag].totalBias += report.bias_score.bias_score;
                            tagData[tag].count++;
                        });
                    });
                } else {
                    console.error(`Expected an array for reports but got ${typeof reports}`);
                }
    
                for (const tag in tagData) {
                    let dataset = datasets.find(ds => ds.label === tag);
                    if (!dataset) {
                        dataset = {
                            label: tag,
                            data: Array(chartLabels.length).fill(0), // Initialize data array for all years
                            backgroundColor: getRandomColor(),
                        };
                        datasets.push(dataset);
                    }
    
                    const averageBias = tagData[tag].totalBias / tagData[tag].count;
                    const yearIndex = chartLabels.indexOf(year);
                    dataset.data[yearIndex] = averageBias;
                }
            }
        }
    
        return { labels: chartLabels, datasets: datasets };
    }

    // Function to create the chart using Chart.js
    function createChart(type, data) {
        const ctx = document.getElementById('chart').getContext('2d');
        if (chart) {
            chart.destroy(); // Destroy existing chart if it exists
        }
        chart = new Chart(ctx, {
            type: type,
            data: data,
            options: {
                scales: {
                    x: {
                        grid: {
                            display: false // Remove vertical grid lines
                        },
                        title: {
                            display: true,
                            text: type === 'line' ? 'Year' : 'Category/Tag',
                            font: {
                                size: 14,
                                family: 'Arial, sans-serif',
                                weight: 'bold',
                                color: '#333'
                            },
                            color: '#333'
                        },
                        ticks: {
                            font: {
                                size: 12,
                                family: 'Arial, sans-serif'
                            },
                            color: '#555'
                        }
                    },
                    y: {
                        grid: {
                            display: false // Remove horizontal grid lines
                        },
                        title: {
                            display: true,
                            text: 'Average Bias',
                            font: {
                                size: 14,
                                family: 'Arial, sans-serif',
                                weight: 'bold',
                                color: '#333'
                            },
                            color: '#333'
                        },
                        ticks: {
                            font: {
                                size: 12,
                                family: 'Arial, sans-serif'
                            },
                            color: '#555'
                        },
                        min: 0,
                        max: 10
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                size: 12,
                                family: 'Arial, sans-serif'
                            },
                            color: '#333',
                            padding: 20
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        titleFont: {
                            size: 14,
                            family: 'Arial, sans-serif',
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 12,
                            family: 'Arial, sans-serif'
                        },
                        footerFont: {
                            size: 10,
                            family: 'Arial, sans-serif',
                            style: 'italic'
                        },
                        padding: 10,
                        cornerRadius: 4
                    }
                },
                layout: {
                    padding: {
                        top: 20,
                        left: 20,
                        right: 20,
                        bottom: 20
                    }
                },
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    // Function to generate a random color for each line or bar
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // Function to populate the LLM Model Data table without pagination
    // Function to populate the LLM Model Data table without pagination
// Function to populate the LLM Model Data table without pagination
function populateLLMTable(data, fromPostApi = false) {
    console.log('Populating table with new data:', data);

    // Clear the existing rows in the table body
    const llmTableBody = document.getElementById('llmTableBody');
    llmTableBody.innerHTML = ''; // This will clear all previous rows, but keep the headers intact

    let allData = [];

    if (fromPostApi) {
        // Logic for handling data that came from the POST API
        Object.entries(data).forEach(([model, years]) => {
            Object.entries(years).forEach(([year, months]) => {
                Object.entries(months).forEach(([month, reports]) => {
                    const tagSet = new Set();
                    let totalReports = 0;
                    let totalBias = 0;

                    Object.entries(reports).forEach(([biasScore, details]) => {
                        totalBias += parseFloat(biasScore);
                        totalReports += 1;

                        // Add tags to the set (to ensure uniqueness)
                        details.bias_score.tags.forEach(tag => tagSet.add(tag));
                    });

                    let averageBias = totalReports ? totalBias / totalReports : 0;
                    const tags = Array.from(tagSet).join(', ');

                    allData.push({
                        model,
                        year,
                     
                        tags,
                        averageBias,
                        totalReports
                    });
                });
            });
        });

        // Sort data by average bias
        allData.sort((a, b) => b.averageBias - a.averageBias);

        let rank = 1;

        // Populate the table with sorted data
        allData.forEach(data => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.model}</td>
                <td>${data.year}</td>
                <td>${data.tags}</td>
                <td>${data.averageBias.toFixed(2)}</td>
                <td>${rank++}</td>
                <td>${data.totalReports}</td>
            `;
            llmTableBody.appendChild(row);
        });

    } else {
        // Logic for handling default data
        Object.entries(data).forEach(([model, years]) => {
            Object.entries(years).forEach(([year, months]) => {
                const tagSet = new Set();
                let totalReports = 0;
                let totalBias = 0;

                Object.entries(months).forEach(([month, reports]) => {
                    Object.entries(reports).forEach(([version, details]) => {
                        totalBias += details.bias_score.bias_score;
                        totalReports += 1; // Increment the count of reports

                        // Add tags to the set (to ensure uniqueness)
                        details.bias_score.tags.forEach(tag => tagSet.add(tag));
                    });
                });

                let averageBias = totalReports ? totalBias / totalReports : 0;
                const tags = Array.from(tagSet).join(', ');

                allData.push({
                    model,
                    year,
        // Add month here
                    tags,
                    averageBias,
                    totalReports
                });
            });
        });

        // Sort data by average bias
        allData.sort((a, b) => b.averageBias - a.averageBias);

        let rank = 1;

        // Populate the table with sorted data
        allData.forEach(data => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.model}</td>
                <td>${data.year}</td>
                <td>${data.tags}</td>
                <td>${data.averageBias.toFixed(2)}</td>
                <td>${rank++}</td>
                <td>${data.totalReports}</td>
            `;
            llmTableBody.appendChild(row);
        });
    }

    return allData; // Return the processed data for use in chart updating
}


    
    // Function to prepare the chart data from the allData array
    function prepareChartData(allData) {
        const chartLabels = [];
        const datasets = {};

        allData.forEach(data => {
            if (!chartLabels.includes(data.year)) {
                chartLabels.push(data.year);
            }

            if (!datasets[data.model]) {
                datasets[data.model] = {
                    label: data.model,
                    data: [],
                    borderColor: getRandomColor(),
                    fill: false,
                    tension: 0.1
                };
            }

            datasets[data.model].data.push(data.averageBias);
        });

        return {
            labels: chartLabels,
            datasets: Object.values(datasets)
        };
    }
});
