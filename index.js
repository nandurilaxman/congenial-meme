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
    console.log('Raw matches response for completed:', JSON.stringify(response.data.data, null, 2));
    const completedMatches = response.data.data.filter(match => 
      match.status === "completed" && 
      (match.matchType === "t20" || match.matchType === "odi" || match.matchType === "test" || 
       match.matchType === "T20I" || match.matchType === "ODI" || match.matchType === "Test")
    );
    console.log('Filtered completed matches:', JSON.stringify(completedMatches, nul
