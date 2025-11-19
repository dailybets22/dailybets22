// === 2. PROCESS SUBSCRIBERS (2025 Beehiiv API FIX) ===
const subscribers = await fetchAllBeehiivSubscribers();
console.log(`Found ${subscribers.length} subscribers`);

let updated = 0;
for (const sub of subscribers) {
  // 2025 Beehiiv: custom fields can be in different places
  let selectedSportsValue = '';

  // Method 1: New nested structure
  if (sub.custom_fields?.fields) {
    const field = sub.custom_fields.fields.find(f => 
      f.name.toLowerCase() === 'selected_sports' || 
      f.key === 'selected_sports'
    );
    selectedSportsValue = field?.value || '';
  }

  // Method 2: Flat object (most common now)
  if (!selectedSportsValue && sub.custom_fields) {
    selectedSportsValue = sub.custom_fields.selected_sports || 
                          sub.custom_fields.Selected_Sports || 
                          sub.custom_fields['selected_sports'] || 
                          '';
  }

  const userSports = selectedSportsValue
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  debugInfo.processedSubscribers.push({
    email: sub.email,
    rawField: selectedSportsValue,
    parsedSports: userSports,
    hasPicks: userSports.length > 0
  });

  if (userSports.length === 0) {
    console.log(`Skipping ${sub.email} — no sports found`);
    continue;
  }

  console.log(`Processing ${sub.email} → sports: ${userSports.join(', ')}`);

  const userPicks = globalPicks
    .filter(p => userSports.includes(p.sport.toLowerCase()))
    .sort((a, b) => parseFloat(b.probability) - parseFloat(a.probability));

  if (userPicks.length < 3) {
    console.log(`Not enough picks for ${sub.email}`);
    continue;
  }

  const final10 = [
    ...userPicks.filter(p => p.category === 'safe').slice(0, 5),
    ...userPicks.filter(p => p.category === 'medium').slice(0, 2),
    ...userPicks.filter(p => p.category === 'high-risk').slice(0, 2),
    createParlay(userPicks.slice(0, 10))
  ];

  const html = renderEmailHtml(final10, sub.name || 'Friend');

  try {
    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${sub.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${BEEHIIV_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          custom_fields: {
            today_picks_html: html
          }
        })
      }
    );

    if (response.ok) {
      updated++;
      console.log(`Updated ${sub.email}`);
    } else {
      console.log(`Beehiiv error ${sub.email}:`, await response.text());
    }
  } catch (e) {
    console.log(`Error updating ${sub.email}:`, e.message);
  }
}