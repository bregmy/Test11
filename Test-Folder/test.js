const axios = require('axios');

// Define the API endpoint
const url = "http://127.0.0.1:8000/charts/api/retrieve-chat-data/";

// Define the JSON payload
const payload = {
  x_axis_filter: { year: "", month: "", day: "" },
  top_model: 0,
  plot_type: "line_graph"
};

// Set the headers
const headers = {
  "Content-Type": "application/json"
};

// Function to extract and compute average bias scores
const extractAndComputeAvgBiasScores = (data) => {
  const result = {};

  for (const [llm, years] of Object.entries(data)) {
    result[llm] = {};

    for (const [year, biases] of Object.entries(years)) {
      const yearNum = parseInt(year.split('-')[1]);
      const biasScores = [];

      for (const details of Object.values(biases)) {
        const biasScore = details.bias_score.bias_score;
        biasScores.push(biasScore);
      }

      // Compute the average bias score for the year
      if (biasScores.length > 0) {
        const avgBiasScore = biasScores.reduce((a, b) => a + b, 0) / biasScores.length;
        result[llm][yearNum] = avgBiasScore;
      }
    }
  }

  return result;
};

// Make the API request
axios.get(url, { headers, params: payload })
  .then(response => {
    if (response.status === 200) {
      const data = response.data;
      const extractedData = extractAndComputeAvgBiasScores(data);
      console.log(JSON.stringify(extractedData, null, 2));
    } else {
      console.log(`Failed to retrieve data: ${response.status}`);
    }
  })
  .catch(error => {
    console.error(`Error: ${error.message}`);
  });
