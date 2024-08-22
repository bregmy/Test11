document.addEventListener('DOMContentLoaded', function() {
    const reportsPerPage = 10; // Show 10 entries per page
    let currentLLMPage = 1;
    let currentReportPage = 1;

    document.getElementById('reportSubmissionButton').onclick = function() {
        const token = localStorage.getItem('authToken');
        if (token) {
            window.location.href = 'report.html'; // Redirect to the report submission page
        } else {
            window.location.href = 'login.html'; // Redirect to the login page
        }
    };

    const token = localStorage.getItem('authToken');
    let chart;  // Declare chart variable globally to manage chart instances

    // Fetch reports immediately when the page loads
    fetchReports();

    // Fetch LLM data and create the initial line chart
    fetchLLMData();

    // Add event listeners to the dots for switching between charts
    setupEventListeners();

    function submitFormData() {
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

        try {
            // Send the request
            fetch('http://127.0.0.1:8000/charts/api/retrieve-chat-data/', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                // Log the JSON response to the console
                console.log('API Response:', data);
            })
            .catch(error => {
                console.error('Error:', error);
            });
        } catch (error) {
            console.error('Error:', error);
        }
    }
    
    document.getElementById('showResultButton').addEventListener('click', submitFormData);

    function removeLLMData(llmName) {
        const llmData = JSON.parse(localStorage.getItem('llmData'));
        delete llmData[llmName];

        const chartData = processLineChartData(llmData);
        createChart('line', chartData);

        populateLLMTable(llmData, currentLLMPage);
    }

    function restoreLLMData(llmName) {
        const originalLLMData = JSON.parse(localStorage.getItem('originalLLMData'));
        const llmData = JSON.parse(localStorage.getItem('llmData'));

        llmData[llmName] = originalLLMData[llmName];

        const chartData = processLineChartData(llmData);
        createChart('line', chartData);

        populateLLMTable(llmData, currentLLMPage);
    }

    function storeOriginalData() {
        if (!localStorage.getItem('originalLLMData')) {
            const llmData = JSON.parse(localStorage.getItem('llmData'));
            localStorage.setItem('originalLLMData', JSON.stringify(llmData));
        }
    }

    function setupEventListeners() {
        document.querySelectorAll('.dot').forEach((dot) => {
            dot.addEventListener('click', () => {
                document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');

                const chartType = dot.getAttribute('data-chart');
                if (chartType === 'line') {
                    fetchLLMData(); // Fetch and display the line chart
                } else if (chartType === 'bar') {
                    fetchBarChartData(); // Fetch and display the bar chart
                } else if (chartType === 'pie') {
                    fetchPieChartData(); // Fetch and display the pie chart
                }
            });
        });
    }

    storeOriginalData(); // Store the original LLM data


    function fetchReports() {
        const cachedReports = localStorage.getItem('reportsData');
        if (cachedReports) {
            displayReports(JSON.parse(cachedReports), 1);
        } else {
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
                localStorage.setItem('reportsData', JSON.stringify(data)); // Cache the data
                displayReports(data, 1);
            })
            .catch(error => {
                console.error('Error fetching reports:', error);
                if (error.message === 'Unauthorized: Authentication credentials were not provided.') {
                    alert('Please log in to view the reports.');
                    window.location.href = 'login.html';
                }
            });
        }
    }

    function truncateText(text, maxLength) {
        if (text.length > maxLength) {
            return text.substring(0, maxLength) + '...';
        }
        return text;
    }

    function displayReports(data, page) {
        const start = (page - 1) * reportsPerPage;
        const end = start + reportsPerPage;
        const paginatedReports = data.slice(start, end);

        const newTableBody = document.getElementById('newTableBody');
        newTableBody.innerHTML = ''; // Clear existing table rows

        paginatedReports.forEach(report => {
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

        updatePagination('reportTablePagination', Math.ceil(data.length / reportsPerPage), page);

        $('.action-dropdown').change(function() {
            const action = $(this).val();
            const reportId = $(this).data('report-id');
            const userId = 2; // Assuming user_id is 2, replace with dynamic user_id if needed
            const upvoteCell = $(this).closest('tr').find('.upvotes');
            const token = localStorage.getItem('authToken'); // Fetch the token from local storage

            if (action === 'Upvote') {
                $.ajax({
                    url: 'http://127.0.0.1:8000/reports/api/upvote-report/',
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({
                        user_id: userId,
                        report_id: reportId,
                        upvote: true
                    }),
                    success: function(response) {
                        let upvotes = parseInt(upvoteCell.text());
                        upvoteCell.text(upvotes + 1);
                        alert('Upvote successful!');
                    },
                    error: function() {
                        alert('Error upvoting the report.');
                    }
                });
            }
        });
    }

    function fetchLLMData() {
        const cachedLLMData = localStorage.getItem('llmData');
        if (cachedLLMData) {
            const data = JSON.parse(cachedLLMData);
            const chartData = processLineChartData(data);
            populateLLMTable(data, 1);
            createChart('line', chartData);  // Create line chart
        } else {
            fetch('http://127.0.0.1:8000/charts/api/retrieve-default_chart/line_graph')
                .then(response => response.json())
                .then(data => {
                    localStorage.setItem('llmData', JSON.stringify(data)); // Cache the data
                    const chartData = processLineChartData(data);
                    populateLLMTable(data, 1);
                    createChart('line', chartData);  // Create line chart
                })
                .catch(error => {
                    console.error('Error fetching LLM data:', error);
                });
        }
    }

    function populateLLMTable(data, page) {
        const start = (page - 1) * reportsPerPage;
        const end = start + reportsPerPage;

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

        allData.sort((a, b) => b.averageBias - a.averageBias);

        const paginatedData = allData.slice(start, end);

        const llmTableBody = document.getElementById('llmTableBody');
        llmTableBody.innerHTML = ''; 

        let rank = start + 1;

        paginatedData.forEach(data => {
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

    function updatePagination(containerId, totalPages, currentPage) {
        const container = document.getElementById(containerId);
        container.innerHTML = ''; 

        const paginationHTML = `
            <nav>
                <ul class="pagination justify-content-center">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>
                    </li>
                    ${generatePagination(totalPages, currentPage)}
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>
                    </li>
                </ul>
            </nav>
        `;

        container.innerHTML = paginationHTML;

        container.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const newPage = parseInt(this.getAttribute('data-page'));
                if (this.dataset.page === 'ellipsis') {
                    expandPagination(containerId, totalPages, currentPage);
                } else if (containerId === 'llmTablePagination') {
                    currentLLMPage = newPage;
                    populateLLMTable(JSON.parse(localStorage.getItem('llmData')), currentLLMPage);
                } else if (containerId === 'reportTablePagination') {
                    currentReportPage = newPage;
                    displayReports(JSON.parse(localStorage.getItem('reportsData')), currentReportPage);
                }
            });
        });
    }

    function generatePagination(totalPages, currentPage) {
        let paginationItems = '';

        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) {
                paginationItems += `
                    <li class="page-item ${currentPage === i ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            }
        } else {
            paginationItems += `
                <li class="page-item ${currentPage === 1 ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="1">1</a>
                </li>
            `;

            if (currentPage > 3) {
                paginationItems += `<li class="page-item"><a class="page-link" href="#" data-page="ellipsis">...</a></li>`;
            }

            const startPage = Math.max(2, currentPage - 1);
            const endPage = Math.min(totalPages - 1, currentPage + 1);

            for (let i = startPage; i <= endPage; i++) {
                paginationItems += `
                    <li class="page-item ${currentPage === i ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            }

            if (currentPage < totalPages - 2) {
                paginationItems += `<li class="page-item"><a class="page-link" href="#" data-page="ellipsis">...</a></li>`;
            }

            paginationItems += `
                <li class="page-item ${currentPage === totalPages ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
                </li>
            `;
        }

        return paginationItems;
    }

    function expandPagination(containerId, totalPages, currentPage) {
        const container = document.getElementById(containerId);

        let expandedItems = '';

        const startPage = Math.max(1, currentPage - 5);
        const endPage = Math.min(totalPages, currentPage + 4);

        for (let i = startPage; i <= endPage; i++) {
            expandedItems += `
                <li class="page-item ${currentPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        container.innerHTML = `
            <nav>
                <ul class="pagination justify-content-center">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>
                    </li>
                    ${expandedItems}
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>
                    </li>
                </ul>
            </nav>
        `;

        container.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const newPage = parseInt(this.getAttribute('data-page'));
                if (containerId === 'llmTablePagination') {
                    currentLLMPage = newPage;
                    populateLLMTable(JSON.parse(localStorage.getItem('llmData')), currentLLMPage);
                } else if (containerId === 'reportTablePagination') {
                    currentReportPage = newPage;
                    displayReports(JSON.parse(localStorage.getItem('reportsData')), currentReportPage);
                }
            });
        });
    }

    function fetchBarChartData() {
        const cachedBarChartData = localStorage.getItem('barChartData');
        if (cachedBarChartData) {
            const data = JSON.parse(cachedBarChartData);
            const chartData = processBarChartData(data);
            createChart('bar', chartData);  // Create bar chart
        } else {
            fetch('http://127.0.0.1:8000/charts/api/retrieve-default_chart/bar_chart')
                .then(response => response.json())
                .then(data => {
                    localStorage.setItem('barChartData', JSON.stringify(data)); 
                    const chartData = processBarChartData(data);
                    createChart('bar', chartData); 
                })
                .catch(error => {
                    console.error('Error fetching bar chart data:', error);
                });
        }
    }

    function fetchPieChartData() {
        const cachedPieChartData = localStorage.getItem('pieChartData');
        if (cachedPieChartData) {
            const data = JSON.parse(cachedPieChartData);
            const chartData = processPieChartData(data);
            createChart('pie', chartData);  
        } else {
            fetch('http://127.0.0.1:8000/charts/api/retrieve-default_chart/pie_chart')
                .then(response => response.json())
                .then(data => {
                    localStorage.setItem('pieChartData', JSON.stringify(data)); 
                    const chartData = processPieChartData(data);
                    createChart('pie', chartData); 
                })
                .catch(error => {
                    console.error('Error fetching pie chart data:', error);
                });
        }
    }

    function processLineChartData(data) {
        const chartLabels = []; 
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

    function processBarChartData(data) {
        const chartLabels = []; 
        const datasets = [];
    
        for (const year in data) {
            chartLabels.push(year); 
            const yearData = {};
    
            for (const model in data[year]) {
                for (const tag in data[year][model]) {
                    const reports = data[year][model][tag];
    
                    if (!yearData[tag]) {
                        yearData[tag] = {
                            totalBias: 0,
                            count: 0
                        };
                    }
    
                    reports.forEach(report => {
                        yearData[tag].totalBias += report.bias_score.bias_score;
                        yearData[tag].count++;
                    });
                }
            }
    
            for (const tag in yearData) {
                const averageBias = yearData[tag].totalBias / yearData[tag].count;
    
                let dataset = datasets.find(ds => ds.label === tag);
                if (!dataset) {
                    dataset = {
                        label: tag,
                        data: Array(chartLabels.length).fill(0), 
                        backgroundColor: getRandomColor(),
                    };
                    datasets.push(dataset);
                }
    
                const yearIndex = chartLabels.indexOf(year);
                dataset.data[yearIndex] = averageBias;
            }
        }
    
        return {
            labels: chartLabels,
            datasets: datasets,
        };
    }

    function processPieChartData(data) {
        const chartLabels = Object.keys(data); 
        const chartData = chartLabels.map(label => data[label].bias_score); 

        return {
            labels: chartLabels,
            datasets: [{
                label: 'Bias Score',
                data: chartData,
                backgroundColor: chartLabels.map(() => getRandomColor()), 
            }]
        };
    }

    function createChart(type, data) {
        const ctx = document.getElementById('chart').getContext('2d');
        if (chart) {
            chart.destroy(); 
        }
        chart = new Chart(ctx, {
            type: type,
            data: data,
            options: {
                scales: {
                    x: {
                        grid: {
                            display: false 
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
                            display: false 
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

    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    fetchLLMs();

    async function fetchLLMs() {
        try {
            const response = await fetch('http://127.0.0.1:8000/reports/api/get-llms/');
            const llms = await response.json();
            
            const llmSelect = document.getElementById('llmSelect');
            
            llms.forEach(llm => {
                const option = document.createElement('option');
                option.value = llm.id; 
                option.textContent = `${llm.name}`;
                llmSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error fetching LLMs:', error);
        }
    }
});
