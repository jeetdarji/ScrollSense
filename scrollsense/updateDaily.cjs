const fs = require('fs'); 
let content = fs.readFileSync('C:/Users/JEET DARJI/Desktop/ScrollSense/scrollsense-backend/src/controllers/daily.controller.js', 'utf8');

content = content.replace(/const weekData = days.map\\(d => \\(\\{[\\s\\S]*?\\}\\)\\);/, `const weekData = days.map(d => ({
    date: d.date.toISOString().split('T')[0],
    youtubeMinutes: d.youtubeMinutes || 0,
    instagramMinutes: d.instagramMinutes || 0,
    totalMinutes: (d.youtubeMinutes || 0) + (d.instagramMinutes || 0),
    dataSource: d.youtubeMinutes > 0 ? 'youtube_auto' : 'no_data'
  }));`);
  
fs.writeFileSync('C:/Users/JEET DARJI/Desktop/ScrollSense/scrollsense-backend/src/controllers/daily.controller.js', content);
