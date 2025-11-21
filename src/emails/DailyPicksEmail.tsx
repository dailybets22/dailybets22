// src/emails/DailyPicksEmail.tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Tailwind,
  Row,
  Column,
} from '@react-email/components';

interface Pick {
  game: string;
  pick: string;
  odds: string;
  probability?: string;
  category: string;
}

interface DailyPicksEmailProps {
  name: string;
  picks: Pick[];
}

export default function DailyPicksEmail({ name, picks }: DailyPicksEmailProps) {
  const safe = picks.filter(p => p.category === 'safe');
  const medium = picks.filter(p => p.category === 'medium');
  const high = picks.filter(p => p.category === 'high-risk');
  const parlay = picks.find(p => p.category === 'parlay');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Tailwind>
      <Html>
        <Head />
        <Preview>Your Daily Bets Are Ready – {today}</Preview>
        <Body className="bg-gray-100 font-sans">
          <Container className="bg-white max-w-2xl mx-auto my-8 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <Section className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
              <Img
                src="https://dailybets22.vercel.app/bets-logo.png"
                alt="Daily Bets"
                width="90"
                height="90"
                className="mx-auto my-6 rounded-full ring-4 ring-white/30"
              />
              <Heading className="text-center text-3xl font-black mb-2">
                Hey {name} — Your Picks Are Live
              </Heading>
              <Text className="text-center text-xl opacity-95">{today}</Text>
            </Section>

            <Section className="px-8 py-10">
              <Text className="text-lg text-gray-700 mb-8 leading-relaxed">
                Here are today’s highest-edge plays. Stick to the units. Long-term wins.
              </Text>

              {/* Safe Bets */}
              {safe.length > 0 && (
                <Section className="mb-10">
                  <Heading className="text-2xl font-bold text-emerald-600 mb-4 flex items-center gap-2">
                    Safe Bets (65%+)
                  </Heading>
                  {safe.map((p, i) => (
                    <Row key={i} className="bg-emerald-50 rounded-lg p-4 mb-3 border border-emerald-200">
                      <Column className="text-sm font-medium text-gray-600">{p.game}</Column>
                      <Column className="text-right font-bold text-emerald-700">{p.pick} @ {p.odds}</Column>
                    </Row>
                  ))}
                </Section>
              )}

              {/* Medium Risk */}
              {medium.length > 0 && (
                <Section className="mb-10">
                  <Heading className="text-2xl font-bold text-yellow-600 mb-4 flex items-center gap-2">
                    Medium Risk (55–62%)
                  </Heading>
                  {medium.map((p, i) => (
                    <Row key={i} className="bg-yellow-50 rounded-lg p-4 mb-3 border border-yellow-200">
                      <Column className="text-sm font-medium text-gray-600">{p.game}</Column>
                      <Column className="text-right font-bold text-yellow-700">{p.pick} @ {p.odds}</Column>
                    </Row>
                  ))}
                </Section>
              )}

              {/* High Risk */}
              {high.length > 0 && (
                <Section className="mb-10">
                  <Heading className="text-2xl font-bold text-red-600 mb-4 flex items-center gap-2">
                    High Reward
                  </Heading>
                  {high.map((p, i) => (
                    <Row key={i} className="bg-red-50 rounded-lg p-4 mb-3 border border-red-200">
                      <Column className="text-sm font-medium text-gray-600">{p.game}</Column>
                      <Column className="text-right font-bold text-red-700">{p.pick} @ {p.odds}</Column>
                    </Row>
                  ))}
                </Section>
              )}

              {/* Parlay */}
              {parlay && (
                <Section className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white text-center">
                  <Heading className="text-2xl font-black mb-2">Today’s Parlay</Heading>
                  <Text className="text-3xl font-bold mb-3">{parlay.odds}x Payout</Text>
                  <Text className="text-lg opacity-95">{parlay.pick}</Text>
                </Section>
              )}
            </Section>

            <Hr className="border-gray-200" />

            <Section className="px-8 py-6 text-center text-sm text-gray-500">
              <Text>© 2025 Daily Bets • Made for winners</Text>
              <Text className="mt-2">
                You’re receiving this because you’re part of the sharpest betting list on earth.
              </Text>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}