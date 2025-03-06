// index.js - A live cricket scoring API using CricAPI
const express = require('express');
const axios = require('axios'); // Library to fetch live data
const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// Function to fetch live scores from CricAPI
async function fetchLiveScore(apiKey) {
  try {
    const response = await axios.get('https://api.cricapi.com/v1/currentMatches', {
      params: {
        apikey: apiKey,
        offset: 0 // Start from the first match
      }
    });
    if (response.data.status !== "success") {
      throw new Error("API request failed");
    }
    // Return the first live match data (simplified for demo)
    const liveMatch = response.data.data.find(match => match.status === "live");
    return liveMatch || { error: "No live matches found" };
  } catch (error) {
    console.error('Error fetching live score:', error.message);
    return { error: 'Unable to fetch live score' };
  }
}

// GET /score - Get the live match score
app.get('/score', async (req, res) => {
  const apiKey = process.env.CRICAPI_KEY; // Get API key from environment variable
  if (!apiKey) {
    return res.status(500).json({ error: "API key not set" });
  }
  const liveScore = await fetchLiveScore(apiKey);
  if (liveScore.error) {
    return res.status(500).json(liveScore);
  }
  res.json({
    message: "Live Match Score",
    match: {
      teams: [liveScore.teamInfo[0].name, liveScore.teamInfo[1].name],
      score: {
        [liveScore.teamInfo[0].name]: liveScore.score[0].inningScore || 0,
        [liveScore.teamInfo[1].name]: liveScore.score[1].inningScore || 0
      },
      overs: liveScore.score[0].overs || 0,
      wickets: {
        [liveScore.teamInfo[0].name]: liveScore.score[0].wickets || 0,
        [liveScore.teamInfo[1].name]: liveScore.score[1].wickets || 0
      }
    }
  });
});

// POST /update-score - Manual update (for testing, kept as backup)
let match = {
  teams: ["India", "Australia"],
  score: { "India": 0, "Australia": 0 },
  overs: 0,
  wickets: { "India": 0, "Australia": 0 }
};
app.post('/update-score', (req, res) => {
  const { team, runs, wickets, overs } = req.body;
  if (!match.teams.includes(team)) {
    return res.status(400).json({ error: "Invalid team!" });
  }
  if (runs !== undefined) match.score[team] += runs;
  if (wickets !== undefined) match.wickets[team] += wickets;
  if (overs !== undefined) match.overs += overs;
  res.json({
    message: "Score updated manually!",
    match: match
  });
});

// Start the server on port 3000
app.listen(3000, () => {
  console.log('Cricket Scoring App running on http://localhost:3000');
});
