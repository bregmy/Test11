document.addEventListener('DOMContentLoaded', function() {
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

    // Fetch LLM data and create chart
    fetchLLMData();

    // Add event listeners to the dots for switching between charts
    document.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', function() {
            document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
            this.classList.add('active');

            const chartType = this.getAttribute('data-chart');
            if (chartType === 'line') {
                fetchLLMData(); // Fetch and display the line chart
            } else if (chartType === 'bar') {
                fetchBarChartData(); // Fetch and display the bar chart
            }
        });
    });

    fetchOldData();

    // Event listener for "Show Result" button
    document.getElementById('showResultButton').onclick = function() {
        submitFormData();
    };

    function fetchOldData() {
        fetch('http://127.0.0.1:8000/charts/api/retrieve-default_chart/line_graph') // Adjust the URL to fetch old data
            .then(response => response.json())
            .then(data => {
                populateLLMTable(data);
            })
            .catch(error => {
                console.error('Error fetching old data:', error);
            });
    }
    
    
    

    function submitFormData() {
        console.log("Show Result button clicked");
        // Get the values from the input fields
        const year = document.getElementById('yearInput').value;
        const month = document.getElementById('monthInput').value || ''; // If not provided, send an empty string
        const day = document.getElementById('dayInput').value || ''; // If not provided, send an empty string
        const llm = document.getElementById('llmSelect').value;
    
        // Make sure year and LLM are provided
        if (!year || !llm) {
            alert('Please provide at least the year and LLM.');
            return;
        }
    
        // Create the form data object
        const formData = new FormData();
        formData.append('top_models', 0); // This can be adjusted based on your requirement
        formData.append('plot_type', 'line_graph'); // Assuming you want a line graph
        formData.append('year', year);
        formData.append('month', month);
        formData.append('day', day);
        formData.append('selected_models', llm); // Send the LLM numeric value
    
        // Send the request
        fetch('http://127.0.0.1:8000/charts/api/retrieve-chat-data/', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('Response received:', response.status);
    
            // Check if response is okay
            if (!response.ok) {
                return response.text().then(text => {
                    // Log the text response for debugging
                    console.error('Error response text:', text);
                    throw new Error('Network response was not ok');
                });
            }
            return response.json();
        })
        .then(data => {
            // Log the JSON response to the console
            console.log('API Response:', data);
            populateLLMTable(data);
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

    // Function to fetch LLM data and populate the table and chart
    function fetchLLMData() {
        fetch('http://127.0.0.1:8000/charts/api/retrieve-default_chart/line_graph')
            .then(response => response.json())
            .then(data => {
                const chartData = processLineChartData(data);
                populateLLMTable(data);
                createChart('line', chartData);  // Create line chart
            })
            .catch(error => {
                console.error('Error fetching LLM data:', error);
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
    function populateLLMTable(data) {
        let allData = [];
        Object.entries(data).forEach(([model, years]) => {
            Object.entries(years).forEach(([year, reports]) => {
                let totalReports = reports.length;
                let totalBias = 0;

                reports.forEach(report => {
                    for (const version in report) {
                        if (report.hasOwnProperty(version)) {
                            const details = report[version];
                            totalBias += details.bias_score.bias_score;
                        }
                    }
                });

                let averageBias = totalBias / totalReports;

                allData.push({
                    model,
                    year,
                    tags: reports[0][Object.keys(reports[0])[0]].bias_score.tags.join(', '),
                    averageBias,
                    totalReports
                });
            });
        });

        // Sort the data by average bias in descending order
        allData.sort((a, b) => b.averageBias - a.averageBias);

        const llmTableBody = document.getElementById('llmTableBody');
        llmTableBody.innerHTML = ''; // Clear existing table rows

        let rank = 1;

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
});
