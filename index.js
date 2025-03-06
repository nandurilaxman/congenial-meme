// index.js - Fetch live scores or last match summary and save to a static file
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
    return liveMatch || null;
  } catch (error) {
    console.error('Error fetching live score:', error.message);
    return null;
  }
}

// Function to fetch the last international match summary
async function fetchLastMatchSummary(apiKey) {
  try {
    const response = await axios.get('https://api.cricapi.com/v1/matches', {
      params: {
        apikey: apiKey,
        offset: 0,
        limit: 50
      }
    });
    if (response.data.status !== "success") {
      throw new Error("API request failed");
    }
    // Log the raw response to debug
    console.log('Raw matches response:', JSON.stringify(response.data.data, null, 2));
    // Filter for completed matches (broaden criteria)
    const completedMatches = response.data.data.filter(match => 
      match.status === "completed" && 
      (match.matchType === "t20" || match.matchType === "odi" || match.matchType === "test" || 
       match.matchType === "T20I" || match.matchType === "ODI" || match.matchType === "Test")
    );
    // Sort by date (most recent first) and take the latest
    const lastMatch = completedMatches.sort((a, b) => new Date(b.dateTimeGMT) - new Date(a.dateTimeGMT))[0];
    if (!lastMatch) {
      return { error: "No recent matches found" };
    }
    // Format the match summary
    return {
      message: "Last Match Summary",
      match: {
        teams: [lastMatch.teamInfo[0].name, lastMatch.teamInfo[1].name],
        score: {
          [lastMatch.teamInfo[0].name]: lastMatch.score[0]?.inningScore || 0,
          [lastMatch.teamInfo[1].name]: lastMatch.score[1]?.inningScore || 0
        },
        overs: lastMatch.score[0]?.overs || 0,
        wickets: {
          [lastMatch.teamInfo[0].name]: lastMatch.score[0]?.wickets || 0,
          [lastMatch.teamInfo[1].name]: lastMatch.score[1]?.wickets || 0
        },
        matchType: lastMatch.matchType.toUpperCase(),
        result: lastMatch.status
      }
    };
  } catch (error) {
    console.error('Error fetching last match summary:', error.message);
    return { error: 'Unable to fetch last match summary' };
  }
}

// Function to save scores or match summary to a file
async function saveLiveScore() {
  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) {
    console.error("API key not set");
    return;
  }
  let scoreData = await fetchLiveScore(apiKey);
  if (scoreData) {
    scoreData = {
      message: "Live Match Score",
      match: {
        teams: [scoreData.teamInfo[0].name, scoreData.teamInfo[1].name],
        score: {
          [scoreData.teamInfo[0].name]: scoreData.score[0].inningScore || 0,
          [scoreData.teamInfo[1].name]: scoreData.score[1].inningScore || 0
        },
        overs: scoreData.score[0].overs || 0,
        wickets: {
          [scoreData.teamInfo[0].name]: scoreData.score[0].wickets || 0,
          [scoreData.teamInfo[1].name]: scoreData.score[1].wickets || 0
        }
      }
    };
  } else {
    scoreData = await fetchLastMatchSummary(apiKey);
  }
  fs.writeFileSync('public/score.json', JSON.stringify(scoreData, null, 2));
  console.log('Data saved:', scoreData);
}

if (require.main === module) {
  saveLiveScore();
}

module.exports = { fetchLiveScore, fetchLastMatchSummary };
