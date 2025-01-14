class TableManager {
    constructor(tableId, headers, data, rowsPerPage = 10, includeActionColumn = false) {
        this.tableId = tableId;
        this.headers = headers;
        this.data = data;
        this.rowsPerPage = rowsPerPage;
        this.includeActionColumn = includeActionColumn;
        this.currentPage = 1;
        this.populateTable();
        this.setupPagination();
    }

    setupPagination() {
        this.renderPagination();
    }

    renderPagination() {
        const paginationContainer = document.getElementById('pagination');
        paginationContainer.innerHTML = '';

        const totalRows = this.data.length;
        const totalPages = Math.ceil(totalRows / this.rowsPerPage);

        const createPageItem = (page, text = page, isDisabled = false, isActive = false) => {
            const li = document.createElement('li');
            li.textContent = text;
            if (isDisabled) {
                li.classList.add('disabled');
            } else {
                li.addEventListener('click', () => {
                    this.currentPage = page;
                    this.populateTable();
                });
            }
            if (isActive) {
                li.classList.add('active');
            }
            return li;
        };

        // Previous button
        paginationContainer.appendChild(createPageItem(this.currentPage - 1, 'Previous', this.currentPage === 1));

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationContainer.appendChild(createPageItem(i, i, false, i === this.currentPage));
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationContainer.appendChild(createPageItem(null, '...', true));
            }
        }

        // Next button
        paginationContainer.appendChild(createPageItem(this.currentPage + 1, 'Next', this.currentPage === totalPages));
    }

    populateTable() {
        const tableBody = document.getElementById(this.tableId).querySelector('tbody');
        const tableHeader = document.getElementById(this.tableId).querySelector('thead');
        tableBody.innerHTML = '';
        tableHeader.innerHTML = '';

        const headerRow = document.createElement('tr');
        this.headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        if (this.includeActionColumn) {
            const actionTh = document.createElement('th');
            actionTh.textContent = 'Action';
            headerRow.appendChild(actionTh);
        }
        tableHeader.appendChild(headerRow);

        const startIndex = (this.currentPage - 1) * this.rowsPerPage;
        const endIndex = startIndex + this.rowsPerPage;
        const paginatedData = this.data.slice(startIndex, endIndex);

        paginatedData.forEach(row => {
            const tr = document.createElement('tr');
            Object.keys(row).forEach(key => {
                const td = document.createElement('td');
                td.textContent = row[key];
                tr.appendChild(td);
            });
            if (this.includeActionColumn) {
                const actionTd = document.createElement('td');
                const dropdown = document.createElement('select');
                dropdown.innerHTML = `
                    <option value="">Select Action</option>
                    <option value="upvote">Upvote</option>
                    <option value="suggestTags">Suggest Tags</option>
                    <option value="markResolved">Mark as Resolved</option>
                    <option value="enterBiasRating">Enter Bias Rating</option>
                `;
                actionTd.appendChild(dropdown);
                tr.appendChild(actionTd);
            }
            tableBody.appendChild(tr);
        });

        this.renderPagination();
    }
}

class ChartManager {
    constructor(canvasId, llmBiasAnalyticsData) {
        this.ctx = document.getElementById(canvasId).getContext('2d');
        this.llmBiasAnalyticsData = llmBiasAnalyticsData;
        this.chart = null;
        this.initializeChart('line', { labels: this.getYears(), datasets: this.prepareDatasets('averageBias') });
        this.setupEventListeners();
    }

    getTags() {
        return [...new Set(this.llmBiasAnalyticsData.map(item => item.tags))];
    }

    getModels() {
        return [...new Set(this.llmBiasAnalyticsData.map(item => item.caption))];
    }

    getYears() {
        return [...new Set(this.llmBiasAnalyticsData.map(item => item.year))].sort((a, b) => a - b);
    }

    prepareDatasets(dataKey, filteredData = null) {
        const data = filteredData || this.llmBiasAnalyticsData;
        const models = this.getModels();
        const tags = this.getTags();

        return models.map(model => {
            return {
                label: model,
                data: tags.map(tag => {
                    const filteredData = data.filter(item => item.caption === model && item.tags === tag);
                    return filteredData.length ? filteredData[0][dataKey] : null;
                }),
                backgroundColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.2)`,
                borderColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 1)`,
                borderWidth: 1
            };
        });
    }

    preparePieData(filteredData = null) {
        const data = filteredData || this.llmBiasAnalyticsData;
        const models = this.getModels();
        const resolvedCounts = {};
        const unresolvedCounts = {};

        models.forEach(model => {
            resolvedCounts[model] = 0;
            unresolvedCounts[model] = 0;
        });

        data.forEach(item => {
            if (item.resolvedScore > 0) {
                resolvedCounts[item.caption] += 1;
            } else {
                unresolvedCounts[item.caption] += 1;
            }
        });

        return {
            labels: models,
            datasets: [
                {
                    label: 'Resolved Reports',
                    data: models.map(model => resolvedCounts[model]),
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Unresolved Reports',
                    data: models.map(model => unresolvedCounts[model]),
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        };
    }

    createChart(chartType, datasets) {
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(this.ctx, {
            type: chartType,
            data: datasets,
            options: {
                responsive: false,
                maintainAspectRatio: false,
                scales: chartType !== 'pie' ? {
                    y: {
                        beginAtZero: true,
                        min: 0,
                        max: 10,
                        title: {
                            display: true,
                            text: 'Average Bias (1-10)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Years'
                        }
                    }
                } : {},
                plugins: {
                    tooltip: {
                        callbacks: {
                            afterLabel: (tooltipItem) => {
                                const model = tooltipItem.dataset.label;
                                const tag = tooltipItem.label;
                                const dataItem = this.llmBiasAnalyticsData.find(item => item.caption === model && item.tags === tag);
                                return dataItem ? `Tags: ${dataItem.tags}` : '';
                            }
                        }
                    }
                }
            }
        });
    }

    initializeChart(chartType, datasets) {
        this.createChart(chartType, datasets);
    }

    setupEventListeners() {
        document.querySelectorAll('.dot').forEach((dot, index) => {
            dot.addEventListener('click', () => {
                document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');

                const chartType = dot.getAttribute('data-chart');
                let datasets;

                if (chartType === 'pie') {
                    datasets = this.preparePieData();
                } else {
                    switch(index) {
                        case 0:
                            datasets = { labels: this.getYears(), datasets: this.prepareDatasets('averageBias') };
                            break;
                        case 1:
                            datasets = { labels: this.getTags(), datasets: this.prepareDatasets('resolvedScore') };
                            break;
                        case 2:
                            datasets = { labels: this.getTags(), datasets: this.prepareDatasets('upvotes') };
                            break;
                        default:
                            datasets = { labels: this.getTags(), datasets: this.prepareDatasets('averageBias') };
                    }
                }

                this.createChart(chartType, datasets);
            });
        });

        // Add event listeners to filter buttons
        document.querySelectorAll('.filter-container button[data-filter]').forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.getAttribute('data-filter');
                const filteredData = this.llmBiasAnalyticsData.filter(item => item.caption === filter);
                const chartType = document.querySelector('.dot.active').getAttribute('data-chart');

                let datasets;
                if (chartType === 'pie') {
                    datasets = this.preparePieData(filteredData);
                } else {
                    datasets = { labels: this.getYears(), datasets: this.prepareDatasets('averageBias', filteredData) };
                }

                this.createChart(chartType, datasets);
            });
        });
    }
}

// Usage
document.getElementById('reportSubmissionButton').onclick = () => {
    window.location.href = 'login.html'; // Change this to the path of your report submission page
};

const llmBiasAnalyticsData = [
    {caption: 'ChatGpt', averageBias: 5.97, year: 2020, tags: 'Employment', resolvedScore: 37, upvotes: 49},
    {caption: 'LLama2', averageBias: 0.58, year: 2020, tags: 'Race', resolvedScore: 6, upvotes: 24},
    {caption: 'ChatGpt', averageBias: 3.78, year: 2020, tags: 'Gender', resolvedScore: 31, upvotes: 73},
    {caption: 'ChatGpt', averageBias: 6.51, year: 2021, tags: 'Employment', resolvedScore: 15, upvotes: 91},
    {caption: 'LLama2', averageBias: 3.15, year: 2019, tags: 'Education', resolvedScore: 5, upvotes: 3},
    {caption: 'ChatGpt', averageBias: 9.19, year: 2019, tags: 'Employment', resolvedScore: 15, upvotes: 85},
    {caption: 'LLama2', averageBias: 2.38, year: 2021, tags: 'Race', resolvedScore: 24, upvotes: 22},
    {caption: 'ChatGpt', averageBias: 5.48, year: 2018, tags: 'Gender', resolvedScore: 5, upvotes: 43},
    {caption: 'Gemini', averageBias: 5.30, year: 2018, tags: 'Employment', resolvedScore: 6, upvotes: 90},
    {caption: 'Gemini', averageBias: 1.12, year: 2019, tags: 'Race', resolvedScore: 42, upvotes: 89},
    {caption: 'LLama2', averageBias: 0.20, year: 2021, tags: 'Education', resolvedScore: 6, upvotes: 82},
    {caption: 'Gemini', averageBias: 2.20, year: 2021, tags: 'Gender', resolvedScore: 29, upvotes: 92},
    {caption: 'LLama2', averageBias: 9.86, year: 2019, tags: 'Employment', resolvedScore: 35, upvotes: 32},
    {caption: 'ChatGpt', averageBias: 1.09, year: 2019, tags: 'Race', resolvedScore: 3, upvotes: 25},
    {caption: 'ChatGpt', averageBias: 7.26, year: 2021, tags: 'Education', resolvedScore: 20, upvotes: 45},
    {caption: 'Gemini', averageBias: 9.04, year: 2020, tags: 'Gender', resolvedScore: 19, upvotes: 16},
    {caption: 'LLama2', averageBias: 6.49, year: 2021, tags: 'Employment', resolvedScore: 35, upvotes: 81},
    {caption: 'ChatGpt', averageBias: 7.11, year: 2021, tags: 'Race', resolvedScore: 10, upvotes: 22},
    {caption: 'LLama2', averageBias: 6.36, year: 2020, tags: 'Education', resolvedScore: 6, upvotes: 73},
    {caption: 'ChatGpt', averageBias: 3.89, year: 2021, tags: 'Gender', resolvedScore: 7, upvotes: 48},
    {caption: 'Gemini', averageBias: 1.23, year: 2019, tags: 'Employment', resolvedScore: 5, upvotes: 76},
    {caption: 'Gemini', averageBias: 0.97, year: 2021, tags: 'Race', resolvedScore: 21, upvotes: 33},
    {caption: 'LLama2', averageBias: 2.13, year: 2018, tags: 'Education', resolvedScore: 18, upvotes: 52},
    {caption: 'LLama2', averageBias: 4.58, year: 2018, tags: 'Gender', resolvedScore: 12, upvotes: 41},
    {caption: 'LLama2', averageBias: 1.89, year: 2018, tags: 'Employment', resolvedScore: 8, upvotes: 34}
];

const trendingBiasReportsData = [
    {caption: 'Biased in Education', averageBias: 3.6, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 55},
    {caption: 'Biased Against Gender', averageBias: 4.2, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 30},
    {caption: 'Bias in Career Advancement', averageBias: 4.3, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 33},
    {caption: 'Biased Against Ethnicity', averageBias: 2.1, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 39},
    {caption: 'Bias in Career Advancement', averageBias: 4.8, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 51},
    {caption: 'Bias in Career Advancement', averageBias: 1.2, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 61},
    {caption: 'Biased Against Ethnicity', averageBias: 1.3, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 96},
    {caption: 'Biased Against Ethnicity', averageBias: 1.3, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 88},
    {caption: 'Bias in Career Advancement', averageBias: 1.6, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 37},
    {caption: 'Biased Against Employment', averageBias: 1.7, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 96},
    {caption: 'Biased Against Ethnicity', averageBias: 1.8, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 37},
    {caption: 'Bias in Career Advancement', averageBias: 1.9, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 50},
    {caption: 'Bias in Career Advancement', averageBias: 2.0, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 42},
    {caption: 'Biased in Education', averageBias: 2.1, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 38},
    {caption: 'Biased Against Gender', averageBias: 2.2, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 36},
    {caption: 'Bias in Career Advancement', averageBias: 2.3, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 35},
    {caption: 'Biased Against Ethnicity', averageBias: 2.4, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 32},
    {caption: 'Bias in Career Advancement', averageBias: 2.5, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 30},
    {caption: 'Biased Against Gender', averageBias: 2.6, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 28},
    {caption: 'Biased Against Ethnicity', averageBias: 2.7, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 27},
    {caption: 'Biased in Education', averageBias: 2.8, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 25},
    {caption: 'Biased Against Gender', averageBias: 2.9, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 24},
    {caption: 'Bias in Career Advancement', averageBias: 3.0, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 22},
    {caption: 'Biased Against Ethnicity', averageBias: 3.1, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 20},
    {caption: 'Biased in Education', averageBias: 3.2, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 18},
    {caption: 'Biased Against Gender', averageBias: 3.3, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 16},
    {caption: 'Bias in Career Advancement', averageBias: 3.4, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 15},
    {caption: 'Biased Against Ethnicity', averageBias: 3.5, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 13},
    {caption: 'Biased in Education', averageBias: 3.6, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 11},
    {caption: 'Biased Against Gender', averageBias: 3.7, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 10},
    {caption: 'Bias in Career Advancement', averageBias: 3.8, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 8},
    {caption: 'Biased Against Ethnicity', averageBias: 3.9, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 7},
    {caption: 'Biased in Education', averageBias: 4.0, synopsis: 'Summary of bias against employment opportunities.', status: 'Not Resolved', tags: 'Employment Bias', upvotes: 5}
];

const llmTable = new TableManager('dataTable', ['Caption', 'Average Bias', 'Tags', 'Resolved Score', 'Upvotes'], llmBiasAnalyticsData);
const chartManager = new ChartManager('chart', llmBiasAnalyticsData);

document.getElementById('table-select').addEventListener('change', function() {
    const selectedTable = this.value;
    llmTable.currentPage = 1; // Reset to the first page whenever table selection changes

    if (selectedTable === 'LLM Bias Analytics') {
        llmTable.data = llmBiasAnalyticsData;
        llmTable.headers = ['Caption', 'Average Bias', 'Tags', 'Resolved Score', 'Upvotes'];
        llmTable.includeActionColumn = false;
    } else if (selectedTable === 'Trending Bias Reports') {
        llmTable.data = trendingBiasReportsData;
        llmTable.headers = ['Caption', 'Average Bias', 'Synopsis', 'Status', 'Tags', 'Upvotes'];
        llmTable.includeActionColumn = true;
    }

    llmTable.populateTable();
});
