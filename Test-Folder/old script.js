document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('advanced-filter-button').onclick = function() {
        window.location.href = 'AdvanceFilter.html'; // Change this to the path of your advanced filter page
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

    // Fetch reports immediately when the page loads
    fetchReports();

    // Fetch LLM data and create chart
    fetchLLMData();

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
            displayReports(1);
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

    function displayReports(page) {
        const reportsPerPage = 20;
        const start = (page - 1) * reportsPerPage;
        const end = start + reportsPerPage;
        const paginatedReports = reports.slice(start, end);

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
                        // Increment the upvote count in the table
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

    function setupReportPagination() {
        const reportsPerPage = 20;
        const totalPages = Math.ceil(reports.length / reportsPerPage);
        const pagination = document.getElementById('reportPagination');
        pagination.innerHTML = ''; // Clear existing pagination

        for (let i = 1; i <= totalPages; i++) {
            const pageItem = document.createElement('li');
            pageItem.innerText = i;
            pageItem.classList.add('page-item');
            if (i === 1) pageItem.classList.add('active');

            pageItem.addEventListener('click', function() {
                document.querySelectorAll('.page-item').forEach(item => item.classList.remove('active'));
                pageItem.classList.add('active');
                displayReports(i);
            });

            pagination.appendChild(pageItem);
        }
    }

    // Function to fetch LLM data and populate the table and chart
    function fetchLLMData() {
        fetch('http://127.0.0.1:8000/charts/api/retrieve-default_chart/line_graph')
            .then(response => response.json())
            .then(data => {
                const chartData = processData(data);
                populateLLMTable(data);
                createChart(chartData);
            })
            .catch(error => {
                console.error('Error fetching LLM data:', error);
            });
    }

    // Function to process the data received from the API for the chart
    function processData(data) {
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

    // Function to create the chart using Chart.js
    function createChart(data) {
        const ctx = document.getElementById('chart').getContext('2d');
        if (chart) {
            chart.destroy(); // Destroy existing chart if it exists
        }
        chart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                scales: {
                    x: {
                        type: 'category',
                        labels: data.labels,
                        title: {
                            display: true,
                            text: 'Year'
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Average Bias'
                        },
                        min: 0,
                        max: 10
                    }
                }
            }
        });
    }

    // Function to generate a random color for each line
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // Function to populate the LLM Model Data table
    function populateLLMTable(data) {
        const llmTableBody = document.getElementById('llmTableBody');
        llmTableBody.innerHTML = ''; // Clear existing table rows

        let rank = 1;

        for (const model in data) {
            for (const year in data[model]) {
                const reports = data[model][year];
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

                const row = document.createElement('tr');
                row.innerHTML = `
                
                    <td>${model}</td>
                    <td>${year}</td>
                    <td>${reports[0][Object.keys(reports[0])[0]].bias_score.tags.join(', ')}</td>
                    <td>${averageBias.toFixed(2)}</td>
                    <td>${rank++}</td>
                    <td>${totalReports}</td>
                `;
                llmTableBody.appendChild(row);
            }
        }
    }

    let chart;
});
