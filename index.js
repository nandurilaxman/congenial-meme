// index.js - Fetch live scores, last match summary, or upcoming matches and save to a static file
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

// Function to fetch the last completed match summary
async function fetchLastMatchSummary(apiKey) {
  try {
    const response = await axios.get('https://api.cricapi.com/v1/matches', {
      params: {
        apikey: apiKey,
        offset: 0,
        limit: 200
      }
    });
    if (response.data.status !== "success") {
      throw new Error("API request failed");
    }
    const completedMatches = response.data.data.filter(match => 
      match.status === "completed" && 
      (match.matchType === "t20" || match.matchType === "odi" || match.matchType === "test" || 
       match.matchType === "T20I" || match.matchType === "ODI" || match.matchType === "Test")
    );
    const lastMatch = completedMatches.sort((a, b) => new Date(b.dateTimeGMT) - new Date(a.dateTimeGMT))[0];
    if (!lastMatch) {
      return null;
    }
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
    return null;
  }
}

// Function to fetch upcoming matches, including Champions Trophy final
async function fetchUpcomingMatches(apiKey) {
  try {
    const response = await axios.get('https://api.cricapi.com/v1/matches', {
      params: {
        apikey: apiKey,
        offset: 0,
        limit: 100 // Increased to catch more upcoming matches
      }
    });
    if (response.data.status !== "success") {
      throw new Error("API request failed");
    }
    console.log('Raw upcoming matches response:', JSON.stringify(response.data.data, null, 2));
    const upcomingMatches = response.data.data.filter(match => 
      (match.status === "notstarted" || match.status === "scheduled") &&
      (match.dateTimeGMT || match.date) // Ensure we have a date
    );
    console.log('Filtered upcoming matches:', JSON.stringify(upcomingMatches, null, 2));

    // Manually add Champions Trophy final if not in API data
    const championTrophyFinal = {
      id: "custom-final-2025",
      name: "India vs New Zealand, Final",
      matchType: "odi",
      status: "notstarted",
      venue: "Dubai International Cricket Stadium, Dubai",
      dateTimeGMT: "2025-03-09T13:00:00Z", // 1:00 PM local time in Dubai (UTC+4)
      teams: ["India", "New Zealand"]
    };
    // Check if the final isn’t already in the list by ID or date
    if (!upcomingMatches.some(m => m.dateTimeGMT === championTrophyFinal.dateTimeGMT)) {
      upcomingMatches.unshift(championTrophyFinal); // Add at the start
    }

    if (upcomingMatches.length === 0) {
      return { error: "No upcoming matches found" };
    }
    return {
      message: "Upcoming Matches Schedule",
      upcomingMatches: upcomingMatches.map(match => ({
        teams: match.teams || ["Tbc", "Tbc"], // Default to Tbc if teams missing
        matchType: (match.matchType || "T20").toUpperCase(),
        dateTime: match.dateTimeGMT || match.date,
        venue: match.venue || "Venue TBD"
      }))
    };
  } catch (error) {
    console.error('Error fetching upcoming matches:', error.message);
    return { error: 'Unable to fetch upcoming matches' };
  }
}

// Function to save scores, match summary, or upcoming matches to a file
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
    if (!scoreData) {
      scoreData = await fetchUpcomingMatches(apiKey);
    }
  }
  fs.writeFileSync('public/score.json', JSON.stringify(scoreData, null, 2));
  console.log('Data saved:', scoreData);
}

if (require.main === module) {
  saveLiveScore();
}

module.exports = { fetchLiveScore, fetchLastMatchSummary, fetchUpcomingMatches };
