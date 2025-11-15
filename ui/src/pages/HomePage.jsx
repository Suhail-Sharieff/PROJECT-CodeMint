import Hero from '../components/Hero';
import Features from '../components/Features';
import Contact from '../components/Contact';

function HomePage() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <Contact />
    </div>
  );
}

export default HomePage;