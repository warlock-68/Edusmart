import { Link } from 'react-router-dom';

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch (err) {
    return null;
  }
}

// Buttons shown in the hero depend on who is logged in
function heroButtons(role) {
  if (role === 'student') {
    return [
      { to: '/ask', label: 'Ask a Question', primary: true },
      { to: '/quiz', label: 'Take a Quiz' },
      { to: '/tutors', label: 'Find a Tutor' },
    ];
  }
  if (role === 'tutor') {
    return [
      { to: '/dashboard', label: 'Open Dashboard', primary: true },
      { to: '/upload', label: 'Upload Material' },
      { to: '/bookings', label: 'My Bookings' },
    ];
  }
  if (role === 'admin') {
    return [
      { to: '/admin/applications', label: 'Review Applications', primary: true },
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/upload', label: 'Upload Material' },
    ];
  }
  return [
    { to: '/register', label: 'Create a Student Account', primary: true },
    { to: '/login', label: 'Log In' },
    { to: '/become-tutor', label: 'Become a Tutor' },
  ];
}

function MoleculeGraphic() {
  const line = { stroke: 'var(--color-ink)', strokeOpacity: 0.35, strokeWidth: 3 };
  return (
    <svg viewBox="0 0 400 340" className="w-full h-auto" role="img" aria-label="Molecule diagram">
      <polygon
        points="200,70 278,115 278,205 200,250 122,205 122,115"
        fill="none"
        stroke="var(--color-ink)"
        strokeOpacity="0.35"
        strokeWidth="3"
      />
      <line x1="200" y1="70" x2="200" y2="22" {...line} />
      <line x1="278" y1="205" x2="338" y2="240" {...line} />
      <line x1="122" y1="205" x2="62" y2="240" {...line} />

      <circle cx="200" cy="70" r="20" fill="var(--color-bunsen)" />
      <circle cx="278" cy="115" r="20" fill="var(--color-copper)" />
      <circle cx="278" cy="205" r="20" fill="var(--color-bunsen)" />
      <circle cx="200" cy="250" r="20" fill="var(--color-copper)" />
      <circle cx="122" cy="205" r="20" fill="var(--color-bunsen)" />
      <circle cx="122" cy="115" r="20" fill="var(--color-copper)" />

      <circle cx="200" cy="22" r="14" fill="var(--color-cinnabar)" />
      <circle cx="338" cy="240" r="14" fill="var(--color-amber)" />
      <circle cx="62" cy="240" r="14" fill="var(--color-amber)" />

      <g fill="#fff" fontFamily="IBM Plex Sans, sans-serif" fontSize="14" fontWeight="600" textAnchor="middle">
        <text x="200" y="75">C</text>
        <text x="278" y="120">C</text>
        <text x="278" y="210">C</text>
        <text x="200" y="255">C</text>
        <text x="122" y="210">C</text>
        <text x="122" y="120">C</text>
        <text x="200" y="27" fontSize="12">O</text>
        <text x="338" y="245" fontSize="12">H</text>
        <text x="62" y="245" fontSize="12">H</text>
      </g>

      <circle cx="40" cy="60" r="6" fill="var(--color-amber)" fillOpacity="0.6" />
      <circle cx="350" cy="90" r="8" fill="var(--color-bunsen)" fillOpacity="0.35" />
      <circle cx="330" cy="300" r="5" fill="var(--color-copper)" fillOpacity="0.6" />
      <circle cx="90" cy="305" r="7" fill="var(--color-cinnabar)" fillOpacity="0.35" />
    </svg>
  );
}

// If a picture file is missing, the gradient underneath still shows
const heroBackground = {
  backgroundImage:
    "linear-gradient(105deg, rgba(10,24,36,0.90) 0%, rgba(10,24,36,0.70) 55%, rgba(10,24,36,0.45) 100%), url('/images/hero.jpg'), linear-gradient(135deg, #0d2233, #1B6FA8)",
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

const bannerBackground = {
  backgroundImage:
    "linear-gradient(100deg, rgba(10,24,36,0.85) 0%, rgba(10,24,36,0.55) 100%), url('/images/cta.jpg'), linear-gradient(135deg, #145A87, #3F8F5F)",
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

const stats = [
  { value: '13', label: 'Syllabus topics covered' },
  { value: 'Forms 1-4', label: 'Kenyan high school Chemistry' },
  { value: '1-to-1', label: 'Sessions with approved tutors' },
  { value: 'Anytime', label: 'Study on phone or laptop' },
];

const reasons = [
  {
    title: 'Built on the Kenyan syllabus',
    text: 'Every question you ask is matched to a real Chemistry topic and Form level, so what you read is what you are taught.',
  },
  {
    title: 'Clear explanations, instantly',
    text: 'Get an explanation, a worked example and a practice question in seconds, whenever you get stuck.',
  },
  {
    title: 'Quizzes with a full review',
    text: 'Test yourself on any topic and see every answer marked in colour, so you learn from each mistake.',
  },
  {
    title: 'Weak areas found for you',
    text: 'Topics where your quiz average stays low are flagged, with catch-up notes and a video link to help you recover.',
  },
  {
    title: 'Tutors who are checked',
    text: 'Tutors apply with a certificate and CV, and an administrator approves them before they can upload notes or take sessions.',
  },
  {
    title: 'Learning that never closes',
    text: 'School closures, strikes and holidays do not stop your revision. EduSmart works on any phone or computer.',
  },
];

const steps = [
  { title: 'Create your account', text: 'Register as a student in about a minute. No payment is needed in this prototype.' },
  { title: 'Ask and read', text: 'Ask any Chemistry question and download PDF notes uploaded by tutors.' },
  { title: 'Quiz and track', text: 'Take topic quizzes and watch your scores on the My Progress page.' },
  { title: 'Recover and book', text: 'Use catch-up notes for weak topics, or book a one-to-one session with a tutor.' },
];

const faqs = [
  {
    q: 'What is EduSmart?',
    a: 'EduSmart is a Chemistry study platform for Kenyan high school students. It explains topics, sets quizzes, finds your weak areas and connects you with approved tutors. It was built as a final year project.',
  },
  {
    q: 'Does it replace my teacher?',
    a: 'No. EduSmart is a study companion for after school, holidays and days when you cannot attend class. It supports your teacher, it does not replace them.',
  },
  {
    q: 'Which topics are covered?',
    a: 'Currently 13 Chemistry topics across Forms 1 to 4. More topics can be added to the curriculum list as the platform grows.',
  },
  {
    q: 'Can I trust the answers?',
    a: 'Answers are generated by an AI model guided by the Kenyan Chemistry syllabus. They are a strong starting point, but if something looks wrong, check with your teacher or book a tutor.',
  },
  {
    q: 'How do I become a tutor?',
    a: 'Open the Become a Tutor page and send your details with your qualification certificate (or transcript) and your CV. An administrator reviews your documents and emails you the result. If approved, you can log in as a tutor.',
  },
  {
    q: 'I applied but I cannot see the email.',
    a: 'Check your Spam or Junk folder. Messages from a new sender sometimes land there.',
  },
];

function Home() {
  const user = getStoredUser();
  const role = user?.role || null;
  const buttons = heroButtons(role);

  return (
    <div>
      {/* Hero */}
      <section style={heroBackground} className="text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-sm font-medium tracking-widest uppercase text-white/70 mb-4">
              Chemistry for Kenyan high school students
            </p>
            <h1 className="text-4xl md:text-6xl leading-tight mb-5 text-white">
              {user ? `Welcome back, ${user.name.split(' ')[0]}.` : 'Learn Chemistry at your own pace.'}
            </h1>
            <p className="text-lg text-white/80 mb-8 max-w-xl">
              Ask questions, practise with quizzes, spot your weak topics and book approved tutors,
              all built around the Kenyan Chemistry syllabus.
            </p>
            <div className="flex flex-wrap gap-3">
              {buttons.map((b) => (
                <Link
                  key={b.to}
                  to={b.to}
                  className={`inline-block no-underline px-6 py-3 rounded-full font-medium transition-colors ${
                    b.primary
                      ? 'bg-white text-[var(--color-ink)] hover:bg-white/90'
                      : 'border border-white/60 text-white hover:bg-white/10'
                  }`}
                >
                  {b.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden md:block bg-white/95 rounded-lg p-6 shadow-xl">
            <MoleculeGraphic />
          </div>
        </div>

        {/* Stats strip */}
        <div className="border-t border-white/15">
          <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-2xl md:text-3xl font-semibold">{s.value}</div>
                <div className="text-sm text-white/70 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why EduSmart */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <p className="text-sm font-medium tracking-widest uppercase text-[var(--color-ink)]/50 mb-2">
          Why EduSmart
        </p>
        <h2 className="text-3xl md:text-4xl mb-3">Built for students who want to understand.</h2>
        <div className="w-full max-w-md border-b border-[var(--color-ink)]/40 mb-10" />

        <div className="grid md:grid-cols-3 bg-white border border-[var(--color-line)] rounded-xl overflow-hidden">
          {reasons.map((r, i) => (
            <div
              key={r.title}
              className="p-7 border-b border-r border-[var(--color-line)] last:border-b-0"
            >
              <div className="w-9 h-9 rounded-md bg-[var(--color-ink)] text-white flex items-center justify-center font-semibold mb-5">
                {i + 1}
              </div>
              <h3 className="text-lg mb-2">{r.title}</h3>
              <p className="text-[var(--color-ink)]/70">{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[var(--color-ink)] text-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <p className="text-sm font-medium tracking-widest uppercase text-white/50 mb-2">How it works</p>
          <h2 className="text-3xl md:text-4xl mb-3 text-white">Start your revision.</h2>
          <div className="w-full max-w-xs border-b border-white/60 mb-10" />

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={s.title}>
                <div className="text-white/50 font-medium mb-3">Step {i + 1}</div>
                <div className="border-t border-white/20 pt-4">
                  <h3 className="text-lg mb-2 text-white">{s.title}</h3>
                  <p className="text-white/70">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Banner, only for visitors who are not logged in */}
      {!role && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div style={bannerBackground} className="rounded-2xl text-white px-8 md:px-14 py-14 md:py-20">
            <h2 className="text-3xl md:text-4xl mb-4 text-white max-w-xl">Create your account in minutes.</h2>
            <p className="text-white/85 text-lg mb-8 max-w-xl">
              No long forms. Register, ask your first question and take your first quiz today.
            </p>
            <Link
              to="/register"
              className="inline-block no-underline bg-white text-[var(--color-ink)] px-6 py-3 rounded-full font-medium hover:bg-white/90"
            >
              Create a student account
            </Link>
          </div>
        </section>
      )}

      {/* Tutor call to action, only for visitors who are not logged in */}
      {!role && (
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="panel flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-xl mb-1">Are you a qualified Chemistry teacher or tutor?</h3>
              <p className="text-[var(--color-ink)]/70">
                Apply with your certificate and CV. Once an administrator approves you, you can
                upload notes and take student sessions.
              </p>
            </div>
            <Link to="/become-tutor" className="btn-primary inline-block no-underline shrink-0">
              Apply to become a tutor
            </Link>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-8 py-10 mb-16 rounded-lg bg-white/85">
        <h2 className="text-3xl mb-8">Frequently asked.</h2>
        <div>
          {faqs.map((f) => (
            <details key={f.q} className="group border-b border-[var(--color-line)] py-5">
              <summary className="flex items-center justify-between cursor-pointer list-none text-lg">
                <span>{f.q}</span>
                <span className="text-2xl leading-none group-open:hidden">+</span>
                <span className="text-2xl leading-none hidden group-open:inline">&minus;</span>
              </summary>
              <p className="mt-3 text-[var(--color-ink)]/70">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[var(--color-line)]">
        <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="font-serif text-xl font-semibold mb-3">EduSmart</div>
            <p className="text-[var(--color-ink)]/60">
              An intelligent learning and tutoring platform for Chemistry. Syllabus-aligned help,
              whenever you need it.
            </p>
          </div>

          <div>
            <div className="text-sm font-medium tracking-widest uppercase text-[var(--color-ink)]/50 mb-3">Platform</div>
            <ul className="space-y-2 list-none p-0 m-0">
              <li><Link to="/" className="text-[var(--color-ink)] no-underline hover:text-[var(--color-bunsen)]">Home</Link></li>
              <li><Link to="/register" className="text-[var(--color-ink)] no-underline hover:text-[var(--color-bunsen)]">Create account</Link></li>
              <li><Link to="/login" className="text-[var(--color-ink)] no-underline hover:text-[var(--color-bunsen)]">Log in</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-medium tracking-widest uppercase text-[var(--color-ink)]/50 mb-3">For tutors</div>
            <ul className="space-y-2 list-none p-0 m-0">
              <li><Link to="/become-tutor" className="text-[var(--color-ink)] no-underline hover:text-[var(--color-bunsen)]">Become a tutor</Link></li>
              <li><Link to="/forgot-password" className="text-[var(--color-ink)] no-underline hover:text-[var(--color-bunsen)]">Forgot password</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-medium tracking-widest uppercase text-[var(--color-ink)]/50 mb-3">About</div>
            <p className="text-[var(--color-ink)]/60">
              A final year project at Dedan Kimathi University of Technology.
            </p>
          </div>
        </div>
        <div className="border-t border-[var(--color-line)] text-center text-sm text-[var(--color-ink)]/50 py-5">
          EduSmart. Chemistry help for Kenyan high school students.
        </div>
      </footer>
    </div>
  );
}

export default Home;