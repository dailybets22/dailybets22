import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

interface WelcomeEmailProps {
  name?: string;
}

export default function WelcomeEmail({ name = 'there' }: WelcomeEmailProps) {
  return (
    <Tailwind
      config={{
        theme: {
          extend: {
            colors: {
              primary: '#10b981', // Emerald for bets theme
            },
          },
        },
      }}
    >
      <Html>
        <Head />
        <Preview>Welcome to Daily Bets — Your Winning Edge Awaits</Preview>
        <Body className="bg-white text-black font-sans">
          {/* Hero Header - Like Netlify's bold intro */}
          <Container className="max-w-4xl mx-auto px-6 py-12">
            <Section className="text-center">
              <Img
                src="/bets-logo.png" // Your logo
                width="120"
                height="120"
                alt="Daily Bets"
                className="mx-auto rounded-full shadow-lg"
              />
              <Heading className="text-5xl font-black text-gray-900 mt-6 mb-2">
                Welcome, {name}!
              </Heading>
              <Text className="text-2xl text-gray-600 mb-8">
                You're now locked in for daily picks that actually win.
              </Text>
            </Section>

            {/* Gradient Accent Section - Like Netlify's highlight */}
            <Section className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-8 text-white text-center mb-12 shadow-2xl">
              <Heading className="text-3xl font-bold mb-2">Your Edge Starts Today</Heading>
              <Text className="text-xl opacity-90">Join 5,000+ sharps crushing the books with data-driven bets.</Text>
            </Section>

            {/* Stacked Feature Sections - Like Netlify's card grid */}
            <Section className="mb-8">
              <Row className="mb-6">
                <Column className="p-4">
                  <Section className="bg-gray-50 rounded-2xl p-6 text-center border border-emerald-200">
                    <Text className="text-4xl mb-3">🛡️</Text>
                    <Heading className="text-xl font-semibold text-gray-900 mb-2">Safe Bets</Heading>
                    <Text className="text-gray-600">High-probability plays (65%+ win rate) – steady green every day.</Text>
                  </Section>
                </Column>
                <Column className="p-4">
                  <Section className="bg-gray-50 rounded-2xl p-6 text-center border border-yellow-200">
                    <Text className="text-4xl mb-3">⚡</Text>
                    <Heading className="text-xl font-semibold text-gray-900 mb-2">Medium Risk</Heading>
                    <Text className="text-gray-600">Value edges we love (55–62%) – smart swings for max ROI.</Text>
                  </Section>
                </Column>
              </Row>
              <Row>
                <Column className="p-4">
                  <Section className="bg-gray-50 rounded-2xl p-6 text-center border border-red-200">
                    <Text className="text-4xl mb-3">🚀</Text>
                    <Heading className="text-xl font-semibold text-gray-900 mb-2">High Risk Bets</Heading>
                    <Text className="text-gray-600">Moonshots that pay huge – occasional fire, massive upside.</Text>
                  </Section>
                </Column>
                <Column className="p-4">
                  <Section className="bg-gray-50 rounded-2xl p-6 text-center border border-blue-200">
                    <Text className="text-4xl mb-3">📊</Text>
                    <Heading className="text-xl font-semibold text-gray-900 mb-2">Daily Parlay</Heading>
                    <Text className="text-gray-600">One perfectly sized combo to cap the night – pure value.</Text>
                  </Section>
                </Column>
              </Row>
            </Section>

            {/* Stats & Motivation Body - Like Netlify's trust builders */}
            <Section className="text-center mb-12">
              <Heading className="text-4xl font-black text-emerald-600 mb-4">+28.4 Units YTD</Heading>
              <Text className="text-xl text-gray-600 mb-6">58.7% win rate across 1,400+ picks in 2025</Text>
              <Text className="text-lg leading-relaxed text-gray-700 max-w-2xl mx-auto">
                Some days we'll lose – that's the game. But stick to the process, bet the units, and long-term math wins every time. 
                We've printed green for 18 months straight. Now it's your turn to cash in.
              </Text>
            </Section>

            {/* CTA Footer - Like Netlify's action button */}
            <Section className="text-center">
              <Text className="text-lg font-semibold text-gray-900 mb-6">
                First picks drop tomorrow at 12 PM UTC. Get ready to win.
              </Text>
            </Section>

            <Hr className="border-gray-200 my-12" />

            {/* Subtle Footer - Like Netlify's light close */}
            <Section className="text-center text-sm text-gray-500">
              <Text>© 2025 Daily Bets. All rights reserved.</Text>
              <Text className="mt-2">
                Made with ❤️ for bettors who bet smart. Unsubscribe anytime.
              </Text>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}