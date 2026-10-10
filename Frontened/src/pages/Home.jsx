import { Link } from 'react-router-dom';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=85';

export default function Home() {
  return (
    <main style={styles.page}>
      <section style={styles.hero} aria-labelledby="hero-title">
        <img
          src={HERO_IMAGE}
          alt="Woman enjoying a day of shopping"
          style={styles.heroImage}
          fetchPriority="high"
        />
        <div style={styles.overlay} />
        <div style={styles.heroContent}>
          <p style={styles.eyebrow}>DISCOVER YOUR NEXT FAVORITE</p>
          <h1 id="hero-title" style={styles.title}>Shopping Made Easy</h1>
          <p style={styles.description}>
            Thoughtful finds, fresh styles, and everyday essentials — all in one place.
            Your next great find is just a click away.
          </p>
          <Link to="/products" style={styles.cta}>Explore the collection <span aria-hidden="true">→</span></Link>
        </div>
        <div style={styles.imageCredit}>A little inspiration for every day</div>
      </section>
    </main>
  );
}

const styles = {
  page: { width: 'min(1320px, calc(100% - 36px))', margin: '24px auto 56px', fontFamily: 'Arial, sans-serif' },
  hero: { position: 'relative', display: 'flex', alignItems: 'center', minHeight: 'min(680px, calc(100vh - 120px))', overflow: 'hidden', borderRadius: '22px', background: '#6b4b47' },
  heroImage: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 42%' },
  overlay: { position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(34, 21, 22, 0.76) 0%, rgba(34, 21, 22, 0.48) 47%, rgba(34, 21, 22, 0.06) 100%)' },
  heroContent: { position: 'relative', zIndex: 1, width: 'min(620px, 100%)', padding: 'clamp(30px, 8vw, 100px)', color: '#fff' },
  eyebrow: { margin: '0 0 18px', color: '#ffe2c5', fontSize: '12px', fontWeight: 700, letterSpacing: '3px' },
  title: { margin: 0, fontFamily: 'Georgia, serif', fontSize: 'clamp(48px, 8vw, 86px)', lineHeight: 0.99, letterSpacing: '-2px' },
  description: { maxWidth: '490px', margin: '24px 0 30px', color: 'rgba(255,255,255,0.91)', fontSize: '17px', lineHeight: 1.75 },
  cta: { display: 'inline-flex', alignItems: 'center', gap: '15px', padding: '15px 22px', borderRadius: '8px', background: '#f0b99f', color: '#351f22', fontWeight: 700, textDecoration: 'none' },
  imageCredit: { position: 'absolute', right: '22px', bottom: '18px', zIndex: 1, color: 'rgba(255,255,255,0.85)', fontSize: '12px', letterSpacing: '0.3px' },
};
