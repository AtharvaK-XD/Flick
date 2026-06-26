const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: "Hello" }] }]
  })
}).then(async r => {
  console.log('Status:', r.status);
  console.log('Status Text:', r.statusText);
  try {
    const json = await r.json();
    console.log('JSON:', JSON.stringify(json, null, 2));
  } catch (e) {
    const text = await r.text();
    console.log('Text:', text);
  }
}).catch(err => {
  console.error('Error:', err);
});
