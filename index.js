// index.js - Fetch live scores and save to a static file
const axios = require('axios');
const fs = require('fs');

// Function to fetch live scores from CricAPI
async function fetchLiveScore(apiKey) {
  try {
    const response = await axios.get('https://api.cricapi.com/v1/currentMatches', {
      params: {
        apikey: apiKey,
        offset: 0
      }
    });
    if (response.data.status !== "success") {
      throw new Error("API request failed");
    }
    const liveMatch = response.data.data.find(match => match.status === "live");
    return liveMatch || { error: "No live matches found" };
  } catch (error) {
    console.error('Error fetching live score:', error.message);
    return { error: 'Unable to fetch live score' };
  }
}

// Function to save scores to a file
async function saveLiveScore() {
  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) {
    console.error("API key not set");
    return;
  }
  const liveScore = await fetchLiveScore(apiKey);
  let scoreData;
  if (liveScore.error) {
    scoreData = { error: liveScore.error };
  } else {
    scoreData = {
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
    };
  }
  // Save to public/score.json
  fs.writeFileSync('public/score.json', JSON.stringify(scoreData, null, 2));
  console.log('Live score saved:', scoreData);
}

// Run the function if called directly
if (require.main === module) {
  saveLiveScore();
}

module.exports = { fetchLiveScore }; // Export for testing
