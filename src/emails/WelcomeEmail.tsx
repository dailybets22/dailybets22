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
} from '@react-email/components';

interface WelcomeEmailProps {
  name?: string;
}

export default function WelcomeEmail({ name = 'there' }: WelcomeEmailProps) {
  return (
    <Tailwind>
      <Html>
        <Head />
        <Preview>Welcome to Daily Bets — your edge starts now.</Preview>
        <Body className="bg-slate-900 text-slate-100 font-sans">
          <Container className="max-w-2xl mx-auto px-6 py-10">
            {/* Logo / Header */}
            <Section className="text-center mb-10">
              <Img
                src="https://dailybets22.vercel.app/logo.png"
                alt="Daily Bets"
                width="80"
                height="80"
                className="mx-auto rounded-full"
              />
              <Heading className="text-4xl font-bold text-emerald-400 mt-6">
                Welcome, {name}!
              </Heading>
            </Section>

            <Text className="text-xl leading-8 text-slate-300">
              You just joined the sharpest sports betting newsletter on the planet.
            </Text>

            <Section className="my-10 bg-slate-800 rounded-2xl p-8 border border-emerald-500/20">
              <Heading className="text-2xl font-bold text-emerald-400 mb-6">
                What You Get Every Single Day
              </Heading>
              <Text className="text-lg leading-7">
                • <strong className="text-emerald-400">Safe Bets</strong> — High-probability plays (65%+ win rate)  
                • <strong className="text-yellow-400">Medium Risk</strong> — Value edges we love (55–62%)  
                • <strong className="text-red-400">High Risk / High Reward</strong> — Moonshots that pay big  
                • One perfectly sized parlay to close the night
              </Text>
            </Section>

            <Section className="my-10 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-center">
              <Heading className="text-3xl font-black mb-4">+28.4 units profit in 2025 so far</Heading>
              <Text className="text-xl opacity-90">
                58.7% win rate across 1,400+ tracked picks
              </Text>
            </Section>

            <Text className="text-lg leading-8 text-slate-300">
              Some days we’ll lose — that’s sports.  
              But stick to the process, follow the units, and the math wins long term.  
              We’ve done it for 18 months straight. Now it’s your turn.
            </Text>

            <Text className="text-xl font-semibold text-emerald-400 mt-10">
              First picks drop tomorrow at 12 PM UTC.  
              See you in the green.
            </Text>

            <Hr className="border-slate-700 my-10" />

            <Text className="text-sm text-slate-500 text-center">
              © 2025 Daily Bets • Unsubscribe anytime with one click
            </Text>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}