import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';

const ASSISTANT_MESSAGES = [
  "Thanks for reaching out! If you're dreaming of a first trip to Japan, spring and autumn are the two sweet spots to aim for. Cherry blossom season usually peaks in late March and early April, while the autumn colors arrive in November, and both periods give you mild weather that's perfect for walking. A classic two-week route starts in Tokyo, where you can mix neon-lit districts like Shinjuku with calm temple gardens in Asakusa. From there, take the bullet train down to Kyoto for traditional teahouses, bamboo groves, and centuries-old shrines. Add a couple of nights in Osaka for incredible street food, then finish with a relaxing stop in Hakone, where you can soak in a hot spring with views of Mount Fuji on a clear day. I'd recommend buying a Japan Rail Pass before you arrive, since it saves a lot on long-distance trains. Pack comfortable shoes, carry a little cash for smaller shops, and download an offline map. If you tell me your budget and how many days you have, I can put together a more detailed day-by-day plan that matches your pace and interests. Would you like that?",
  "Great question! Choosing between Bali and Thailand really depends on the kind of trip you're after, so let me break it down. Bali is compact and easygoing, which makes it ideal if you want to settle into one island and explore at a slower rhythm. You'll find lush rice terraces around Ubud, world-class surfing beaches in the south, and a strong wellness and yoga scene if you want to unwind. Thailand, on the other hand, gives you more variety across a single trip: buzzing city life in Bangkok, ancient temples in Chiang Mai, and a huge choice of islands in both the Andaman Sea and the Gulf. If this is your first time in Southeast Asia and you love variety, Thailand is hard to beat. If you'd rather keep things simple and immersive, Bali is wonderful. Both are very affordable, friendly to first-time travelers, and easy to get around. The best season for both is roughly November to April, when the weather is drier. Tell me how many days you have and whether you prefer beaches, culture, or food, and I'll suggest which one fits you best, along with a rough route to get you started.",
  "Absolutely, a week in Italy is plenty of time for a memorable first visit, and the trick is to avoid trying to see everything at once. I'd suggest focusing on three cities so you spend more time enjoying and less time packing and unpacking. Start with two nights in Rome to see the Colosseum, the Vatican, and the lively piazzas, making sure to wander the backstreets in the evening when the city glows. Then take a fast train to Florence for two nights, where Renaissance art, the famous Duomo, and Tuscan cuisine await; a sunset view from Piazzale Michelangelo is unforgettable. Finish with three nights in Venice or the Amalfi Coast depending on your mood: Venice for romantic canals and quiet morning walks, or Amalfi for dramatic coastal scenery and lemon groves. Italian trains are fast, comfortable, and connect all the major cities, so you won't need to rent a car unless you head into the countryside. Book popular museums and attractions online in advance to skip the long lines. Eat where the locals eat, a little away from the main squares, and you'll have far better meals. Let me know your travel dates and I'll map out an ideal itinerary.",
  "Traveling with kids can be incredibly rewarding when the destination is set up for families, and a few places really shine for this. For a stress-free beach holiday, the Algarve in Portugal offers gentle coves, warm water, and plenty of family resorts within easy reach of the airport. If your children love wildlife, Costa Rica is a fantastic choice, with sloths, monkeys, and volcanoes packed into a small, safe country that's easy to drive around. For a mix of culture and fun, Japan surprises many families: the trains are punctual, the streets are spotless, and there's everything from theme parks to peaceful gardens. When planning, build in plenty of downtime, since cramming too much into one day usually leads to tired and cranky travelers of all ages. Choose central accommodation so you can return for a midday rest, and look for places with a kitchen so you can prepare familiar snacks. Always carry water, sunscreen, and a small first-aid kit, and keep a copy of important documents. Travel insurance that covers the whole family is well worth it. If you tell me your kids' ages and what they enjoy, I can recommend the best destination and a relaxed itinerary that keeps everyone happy.",
  "A road trip along the coast is one of the best ways to experience a country at your own pace, and there are a few routes that consistently top travelers' lists. California's Highway 1 between San Francisco and Los Angeles is a classic, winding past Big Sur's cliffs, charming seaside towns, and dramatic ocean views the whole way. In Europe, the coastal roads of Portugal and the rugged Wild Atlantic Way in Ireland offer windswept beaches, friendly villages, and plenty of spots to pull over for a photo. Down under, Australia's Great Ocean Road delivers towering rock formations and surf beaches in just a couple of days of driving. Whichever you choose, plan your daily distances to be manageable, ideally no more than three or four hours behind the wheel, so you have time to explore along the way. Book your accommodation ahead during peak season, since the best small towns fill up quickly. Keep a flexible mindset, because the unplanned detours often become the highlights. Make sure your driving license and insurance are valid for the country, and download offline maps in case of patchy signal. Tell me which region interests you and how many days you have, and I'll plan a route with the best stops.",
  "Budget travel doesn't mean missing out, it just means being a little smarter about where your money goes. The biggest savings usually come from timing: traveling in the shoulder season, just before or after the busiest months, gives you good weather, smaller crowds, and noticeably lower prices on flights and hotels. Being flexible with your travel dates and flying midweek can also cut costs significantly. For accommodation, consider guesthouses, hostels with private rooms, or apartment rentals where you can cook some of your own meals. Eating where locals eat, away from the main tourist sights, is both cheaper and more authentic. Public transport, walking, and regional trains will stretch your budget far further than taxis. Many cities offer free walking tours and museum days, so a little research before you go pays off. Set a daily spending target and track it loosely so there are no surprises. Booking your biggest expenses, like long-haul flights, well in advance usually locks in better fares. Finally, don't forget travel insurance, since one unexpected event can cost far more than the policy. If you share your destination and rough budget, I can suggest where to save, where it's worth spending a little more, and a realistic daily cost estimate.",
  "Solo travel is a wonderful way to grow in confidence and see the world exactly how you want, and with a little preparation it can be very safe and enjoyable. For first-time solo travelers, I usually recommend destinations that are easy to navigate and welcoming to people exploring on their own, such as Portugal, Japan, New Zealand, or Thailand. These places have reliable public transport, plenty of fellow travelers to meet, and a strong culture of hospitality. Staying in social accommodation like well-reviewed hostels or small guesthouses makes it easy to find company when you want it and quiet when you don't. Share your itinerary with someone back home, keep digital and paper copies of important documents, and trust your instincts if a situation feels off. Joining a group activity, cooking class, or day tour is a great way to meet people and learn about the local culture. Eating at the bar of a restaurant rather than a table can feel more comfortable when dining alone. Most importantly, give yourself permission to slow down and change plans on a whim, since that freedom is the real joy of solo travel. Tell me where you're thinking of going and I'll suggest a safe, fun route and the best places to meet other travelers.",
  "Planning a honeymoon is all about balancing relaxation with a few special experiences you'll remember forever, and the right destination depends on your style as a couple. If you dream of overwater villas and turquoise lagoons, the Maldives and French Polynesia are hard to beat, offering ultimate privacy and incredible snorkeling right off your deck. For couples who love a mix of culture and beach, Bali, Sri Lanka, or the Greek islands pair romantic scenery with plenty to explore together. If adventure is more your thing, consider a safari in Kenya or Tanzania followed by a few nights on the Zanzibar coast, combining thrilling game drives with blissful beach time. Whatever you choose, it's worth splurging on a couple of standout moments, like a private sunset dinner or a spa day, while keeping the rest of the trip relaxed. Let your hotel know you're celebrating, since many will add a thoughtful touch. Book flights and accommodation early to secure the best rooms and rates, and build in a buffer day at the start to recover from any wedding tiredness. Travel insurance is especially worthwhile for a big trip like this. Share your budget and the vibe you're after, and I'll suggest the perfect honeymoon itinerary for the two of you.",
  "Visiting a city in winter has a special charm, with festive lights, cozy cafes, and far fewer crowds at the major sights. European cities are particularly magical during the colder months. Vienna and Prague feel like stepping into a fairytale, with grand architecture dusted in snow and Christmas markets selling mulled wine and handmade gifts. Further north, the Northern Lights become a real possibility in places like Tromso in Norway or Rovaniemi in Finland, where you can also try husky sledding and stay in glass igloos. If you prefer milder winter weather, southern Spain, Portugal, and the Canary Islands offer sunshine and pleasant temperatures while much of Europe shivers. The key to enjoying a winter trip is dressing in warm layers, planning indoor activities like museums and thermal baths for the coldest hours, and embracing the slower, cozier pace. Days are shorter, so prioritize your must-see sights for the daylight hours and save evenings for warm restaurants and shows. Check opening times carefully, as some attractions reduce their hours off-season. Pack a good coat, waterproof shoes, and a sense of adventure. Tell me whether you'd prefer festive markets, snowy landscapes, or winter sunshine, and I'll recommend the ideal destination and a comfortable cold-weather itinerary.",
  "Sustainable travel is about enjoying the world while leaving a lighter footprint, and small choices add up to a big difference. Start with how you get around: where possible, choose trains over short flights, and once you arrive, rely on walking, cycling, and public transport to explore. When you do fly, consider direct routes, since takeoffs and landings use the most fuel. For accommodation, look for locally owned guesthouses and hotels with genuine eco-credentials rather than vague green labels, as your money then supports the community directly. Eating at local restaurants, shopping at markets, and hiring local guides keeps tourism income where it belongs and gives you a richer, more authentic experience. Be mindful with natural attractions: stick to marked trails, never disturb wildlife, and follow the principle of taking only photos and leaving only footprints. Carry a reusable water bottle and shopping bag to cut down on single-use plastic. Traveling in the shoulder season also helps by easing pressure on the most crowded destinations. Finally, slow travel, where you spend longer in fewer places, is both more relaxing and more sustainable than rushing between many. If you tell me your destination, I can suggest responsible operators, low-impact transport options, and experiences that benefit local communities."
];

let messageIndex = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const app = express();
const streams = new Map();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.post('/api/chat', async (req, res) => {
  const { messages, streamId, replyIndex = null, resumeFrom = 0 } = req.body;

  if (!messages?.length) {
    return res.status(400).json({ error: 'messages required' });
  }

  const controller = new AbortController();
  streams.set(streamId, controller);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  // Use provided replyIndex (reconnect) or advance the counter (new message)
  const index = replyIndex !== null
    ? replyIndex
    : messageIndex++ % ASSISTANT_MESSAGES.length;

  // Tell the client which reply index we're using so it can reconnect to the same one
  send({ type: 'meta', replyIndex: index });

  const reply = ASSISTANT_MESSAGES[index];
  const tokens = reply.split(' ');

  // For reconnect: skip tokens that were already delivered in a previous attempt
  let startIdx = 0;
  if (resumeFrom > 0) {
    let charsEmitted = 0;
    for (let i = 0; i < tokens.length; i++) {
      const word = i < tokens.length - 1 ? tokens[i] + ' ' : tokens[i];
      charsEmitted += word.length;
      if (charsEmitted <= resumeFrom) {
        startIdx = i + 1;
      } else {
        break;
      }
    }
  }

  try {
    for (let i = startIdx; i < tokens.length; i++) {
      if (controller.signal.aborted) break;
      const word = i < tokens.length - 1 ? tokens[i] + ' ' : tokens[i];
      send({ type: 'delta', content: word });
      await sleep(40 + Math.random() * 40);
      if (controller.signal.aborted) break;
    }
    send({ type: controller.signal.aborted ? 'cancelled' : 'done' });
  } catch (err) {
    send({ type: 'error', message: err.message });
  } finally {
    streams.delete(streamId);
    res.end();
  }
});

app.post('/api/cancel', (req, res) => {
  const { streamId } = req.body;
  const ctrl = streams.get(streamId);
  if (!ctrl) return res.status(404).json({ error: 'stream not found' });
  ctrl.abort();
  res.json({ ok: true });
});

// Only start listening when run directly (not when imported by tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Server on :${PORT}`));
}
