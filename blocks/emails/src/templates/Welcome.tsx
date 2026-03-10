import { Html, Head, Mail, Text, Button } from '@react-email/components';

interface WelcomeProps {
  name: string;
  url: string;
}

export default function Welcome({ name, url }: WelcomeProps) {
  return (
    <Html>
      <Head />
      <Mail className="bg-white">
        <Text className="text-lg font-semibold">Welcome to SaaS Factory, {name}!</Text>
        <Button href={url} className="bg-black text-white px-6 py-2 rounded">
          Get Started
        </Button>
      </Mail>
    </Html>
  );
}
