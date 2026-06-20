const http = require('http');

http.get('http://localhost:5050/api/events', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const events = JSON.parse(data).events;
    if (events.length > 0) {
      const id = events[0].id;
      console.log('Fetching event ID:', id);
      http.get(`http://localhost:5050/api/events/${id}`, (res2) => {
        let data2 = '';
        res2.on('data', (chunk) => { data2 += chunk; });
        res2.on('end', () => {
          console.log('Result:', data2);
        });
      });
    } else {
      console.log('No events found');
    }
  });
}).on('error', (err) => {
  console.error('Error connecting to API:', err.message);
});
