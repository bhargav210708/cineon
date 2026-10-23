import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, Clapperboard, Flame, MapPin, Play, Search, Sparkles, Tv, X } from 'lucide-react';
import { tmdb, TmdbError, tmdbImage } from '../../lib/tmdb';
import { MovieCard } from '../../components/MovieCard';
import { useAppStore } from '../../store';
import type { TmdbMovie } from '../../types/tmdb';
import { movieTitle, movieYear } from '../../types/tmdb';

type Tab = 'trending' | 'theatres' | 'upcoming' | 'best';
type DiscoverState = { tab: Tab; page: number; search: string; language: string; year: string; genre: string; minimumRating: string; sortBy: string };
function readDiscoverState(): Partial<DiscoverState> { try { return JSON.parse(sessionStorage.getItem('cinetribe.discover-state') || '{}') as Partial<DiscoverState>; } catch { return {}; } }
const tabLabels: { id: Tab; label: string }[] = [{ id: 'trending', label: 'Trending' }, { id: 'theatres', label: 'In theatres · India' }, { id: 'upcoming', label: 'Coming soon' }, { id: 'best', label: 'All-time best' }];
const moods = [
  { label: 'Comforted', copy: 'A warm, familiar story.', className: 'mood-heart', symbol: '♡' },
  { label: 'Mind-blown', copy: 'Ideas that bend reality.', className: 'mood-neon', symbol: '⌘' },
  { label: 'Terrified', copy: 'Edge-of-seat tension.', className: 'mood-doom', symbol: '◉' },
  { label: 'Inspired', copy: 'Stories that move you.', className: 'mood-desert', symbol: '✳' },
  { label: 'Adventurous', copy: 'Beyond the ordinary.', className: 'mood-wonder', symbol: '✦' },
  { label: 'Romantic', copy: 'A little heart and chemistry.', className: 'mood-heart', symbol: '♡' },
  { label: 'Laughing', copy: 'Lighten the evening.', className: 'mood-heart', symbol: '☺' },
  { label: 'Mysterious', copy: 'Follow the unanswered question.', className: 'mood-neon', symbol: '⌕' },
  { label: 'Adrenaline', copy: 'Fast, bold and kinetic.', className: 'mood-doom', symbol: '↗' },
  { label: 'Epic scale', copy: 'Worlds worth getting lost in.', className: 'mood-desert', symbol: '✳' },
  { label: 'Unsettling', copy: 'Tension under the surface.', className: 'mood-doom', symbol: '◉' },
  { label: 'Bittersweet', copy: 'Love, loss and longing.', className: 'mood-heart', symbol: '♡' },
  { label: 'Thoughtful', copy: 'Real lives and new perspectives.', className: 'mood-desert', symbol: '◌' },
  { label: 'Mythic', copy: 'Magic, legends and wonder.', className: 'mood-wonder', symbol: '✧' },
  { label: 'Crime mind', copy: 'Schemes, clues and consequences.', className: 'mood-neon', symbol: '⌕' },
  { label: 'History', copy: 'Stories shaped by time.', className: 'mood-desert', symbol: '◌' },
];
export default function Discover() {
  const [tab, setTab] = useState<Tab>(() => readDiscoverState().tab || 'trending');
  const [page, setPage] = useState(() => Math.max(1, readDiscoverState().page || 1));
  const [search, setSearch] = useState(() => readDiscoverState().search || '');
  const [debounced, setDebounced] = useState('');
  const [language, setLanguage] = useState(() => readDiscoverState().language || '');
  const [year, setYear] = useState(() => readDiscoverState().year || '');
  const [genre, setGenre] = useState(() => readDiscoverState().genre || '');
  const [minimumRating, setMinimumRating] = useState(() => readDiscoverState().minimumRating || '');
  const [sortBy, setSortBy] = useState(() => readDiscoverState().sortBy || 'popularity.desc');
  const restoredScroll = useRef(false);
  useEffect(() => { try { sessionStorage.setItem('cinetribe.discover-state', JSON.stringify({tab,page,search,language,year,genre,minimumRating,sortBy} satisfies DiscoverState)); } catch { /* session storage is optional */ } }, [tab,page,search,language,year,genre,minimumRating,sortBy]);
  const [slide, setSlide] = useState(0);
  const changeSlide = (next: number) => { if (!heroMovies.length) return; setSlide((next + heroMovies.length) % heroMovies.length); };
  const [autoSlide, setAutoSlide] = useState(true);
  const [ambientPoster, setAmbientPoster] = useState('');
  useEffect(() => { const onAmbient = (event: Event) => setAmbientPoster((event as CustomEvent<string>).detail || ''); window.addEventListener('cinetribe:ambient-poster', onAmbient); return () => window.removeEventListener('cinetribe:ambient-poster', onAmbient); }, []);
  const lowPower = useAppStore(state => state.lowPower);
  const setLowPower = useAppStore(state => state.setLowPower);
  const watchlist = useAppStore(state => state.watchlist);
  const watchlistCount = watchlist.length;
  const [dismissedHints, setDismissedHints] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('cinetribe.dismissed-hints') || '[]') as string[]; } catch { return []; } });
  const ticketDraftCount = useMemo(() => { try { return (JSON.parse(localStorage.getItem('cinetribe.ticket-drafts.v1') || '[]') as unknown[]).length; } catch { return 0; } }, []);
  const featureHint = watchlistCount===0 ? {id:'save-first-film',title:'Start your personal cinema archive',copy:'Save a film to keep it close, then build a custom ticket for it.',action:'Explore films',to:'/'} : ticketDraftCount===0 ? {id:'make-first-ticket',title:'Turn a saved film into a keepsake',copy:'Your Ticket Atelier lets you drag the poster to frame the exact artwork you want.',action:'Create a ticket',to:`/studio/${watchlist[0].id}`} : {id:'explore-mood-worlds',title:'Follow a feeling instead of a genre',copy:'Mood Engine has more than a dozen moods, regional language filters and additional pages.',action:'Explore moods',to:'/cinema-lab'};
  const dismissHint = () => { const next=[...new Set([...dismissedHints,featureHint.id])];setDismissedHints(next);try{localStorage.setItem('cinetribe.dismissed-hints',JSON.stringify(next))}catch{/* optional */} };
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(search.trim()), 300); return () => window.clearTimeout(timer); }, [search]);
  const nowShowingQuery = useQuery({ queryKey: ['now-showing-india'], queryFn: () => tmdb.nowPlayingIndia(1), staleTime: 15 * 60 * 1000, retry: 1 });
  const query = useQuery({ queryKey: ['discover', tab, debounced, language, year, genre, minimumRating, sortBy, page], queryFn: async () => {
    if (debounced) return tmdb.search(debounced, page);
    if (language || year || genre || minimumRating || sortBy !== 'popularity.desc') return tmdb.discover({ with_original_language: language || undefined, primary_release_year: year ? Number(year) : undefined, with_genres: genre ? Number(genre) : undefined, 'vote_average.gte': minimumRating ? Number(minimumRating) : undefined, sort_by: sortBy, page });
    if (tab === 'theatres') return tmdb.nowPlayingIndia(page);
    if (tab === 'upcoming') return tmdb.upcomingIndia(page);
    if (tab === 'best') return tmdb.topRated(page);
    return tmdb.trending(page);
  }, staleTime: 10 * 60 * 1000, retry: 1 });
  const movies = (query.data?.results ?? []) as TmdbMovie[];
  useEffect(() => { if (restoredScroll.current || !query.isSuccess) return; const saved = sessionStorage.getItem('cinetribe.discover-scroll'); if (saved !== null) { restoredScroll.current = true; sessionStorage.removeItem('cinetribe.discover-scroll'); window.requestAnimationFrame(() => window.scrollTo({ top: Number(saved) || 0, behavior: 'auto' })); } }, [query.isSuccess]);
  const totalPages = Math.min(query.data?.total_pages ?? 1, 500);
  const heroMovies = useMemo(() => { const nowShowing = (nowShowingQuery.data?.results ?? []) as TmdbMovie[]; const source = nowShowing.length ? nowShowing : movies; const filtered = source.filter(movie => movie.backdrop_path && movie.poster_path); return (filtered.length ? filtered : movies.filter(movie => movie.backdrop_path && movie.poster_path)).slice(0, 5); }, [nowShowingQuery.data, movies]);
  const hero = heroMovies[slide % Math.max(1, heroMovies.length)] ?? movies[0];
  useEffect(() => { setSlide(0); setPage(1); }, [tab, debounced, language, year, genre, minimumRating, sortBy]);
  useEffect(() => {
    if (lowPower || !autoSlide || heroMovies.length < 2) return;
    const timer = window.setInterval(() => setSlide(current => (current + 1) % heroMovies.length), 6500);
    return () => window.clearInterval(timer);
  }, [heroMovies.length, lowPower, autoSlide]);
  const title = hero ? movieTitle(hero) : 'Your next great story';
  return <div className="page discover-page"><div className={`ambient-poster-field ${ambientPoster ? 'is-active' : ''}`} aria-hidden="true" style={{ backgroundImage: ambientPoster ? `url("${ambientPoster}")` : undefined }} />
    <div className="topline"><span className="eyebrow"><span className="live-dot"/> THE CINEMA COMPANION</span><button className={`low-power-toggle ${lowPower ? 'active' : ''}`} onClick={() => setLowPower(!lowPower)} title="Reduce visual effects">{lowPower ? 'Low-power on' : 'Motion: on'}</button></div>

    <section className="home-splash" aria-label="Featured movie slideshow">
      <div className="home-splash-backdrop" key={hero?.id ?? 'fallback'} style={{ backgroundImage: hero?.backdrop_path ? `url(${tmdbImage(hero.backdrop_path, 'original')})` : undefined }} />
      <div className="home-splash-grain" />
      <div className="home-splash-copy">
        <span className="home-kicker"><Sparkles size={14}/> THE FEATURE PRESENTATION <i/> {hero ? `C / ${String((slide % 5) + 1).padStart(2, '0')}` : 'YOUR DAILY SCREENING'}</span>
        <p className="home-overline">A new frame. A new feeling.</p>
        <h1>{hero ? title : 'Your next great story'}<span>.</span></h1>
        <p className="home-description">{hero?.overview || 'Discover the films you will remember, collect your cinema moments, and find where to watch next.'}</p>
        <div className="home-hero-actions">{hero && <Link className="primary-button" to={`/movie/${hero.id}`}><Play size={16} fill="currentColor"/> Enter the film <ArrowUpRight size={16}/></Link>}<Link className="secondary-button" to="/cinema-lab"><Sparkles size={16}/> Find by mood</Link></div>
        <div className="home-slide-controls" aria-label="Featured movie slides"><button type="button" className="slide-arrow" onClick={() => changeSlide(slide - 1)} disabled={heroMovies.length < 2} aria-label="Previous featured movie"><ArrowLeft size={14}/></button>{heroMovies.map((movie, index) => <button type="button" key={movie.id} aria-label={`Show ${movieTitle(movie)}`} aria-pressed={slide === index} className={slide === index ? 'active' : ''} onClick={() => changeSlide(index)} />)}<button type="button" className="slide-arrow" onClick={() => changeSlide(slide + 1)} disabled={heroMovies.length < 2} aria-label="Next featured movie"><ArrowRight size={14}/></button><span>{heroMovies.length ? `${String((slide % heroMovies.length) + 1).padStart(2, '0')} / ${String(heroMovies.length).padStart(2, '0')}` : 'LIVE FROM TMDB'}</span><button type="button" className="slide-autoplay" onClick={() => setAutoSlide(v => !v)} aria-pressed={autoSlide} title={autoSlide ? 'Pause automatic slides' : 'Resume automatic slides'}>{autoSlide ? 'Ⅱ' : '▶'}</button></div>
      </div>
      <div className="home-splash-poster">{hero?.poster_path ? <img src={tmdbImage(hero.poster_path, 'w500')} alt={`${title} poster`} /> : <div className="home-poster-placeholder"><Clapperboard size={42}/></div>}<div className="home-poster-caption"><span>NOW IN YOUR ORBIT</span><strong>{title}</strong><small>{(hero ? movieYear(hero) : '') || 'DISCOVER SOMETHING NEW'} · ★ {hero?.vote_average?.toFixed(1) ?? '—'}</small></div></div>
      <a className="scroll-cue" href="#CINÉON-discover"><span>SCROLL TO EXPLORE</span><ArrowDown size={14}/></a>
    </section>

    <section className="quick-info-grid" aria-label="Cinéon shortcuts">
      <Link className="quick-info-card quick-info-watch" to="/watchlist"><span className="quick-icon"><Bookmark size={18}/></span><span className="quick-label">YOUR COLLECTION</span><strong>{watchlistCount} saved {watchlistCount === 1 ? 'film' : 'films'}</strong><small>Pick up where your curiosity left off.</small><ArrowUpRight className="quick-arrow" size={17}/></Link>
      <Link className="quick-info-card quick-info-cinema" to="/cinemas-nearby"><span className="quick-icon"><MapPin size={18}/></span><span className="quick-label">THE BIG SCREEN</span><strong>Find a cinema nearby</strong><small>Explore venues and screen formats.</small><ArrowUpRight className="quick-arrow" size={17}/></Link>
      <Link className="quick-info-card quick-info-ott" to="/cinema-lab"><span className="quick-icon"><Tv size={18}/></span><span className="quick-label">TONIGHT'S PLAN</span><strong>Find your next mood</strong><small>Discover a film for the feeling you want.</small><ArrowUpRight className="quick-arrow" size={17}/></Link>
    </section>

    {!dismissedHints.includes(featureHint.id) && <aside className="feature-nudge glass-panel"><span className="feature-nudge-mark"><Sparkles size={16}/></span><div><span className="eyebrow">A LITTLE Cinéon SECRET</span><strong>{featureHint.title}</strong><p>{featureHint.copy}</p></div><Link className="text-link" to={featureHint.to}>{featureHint.action} <ArrowUpRight size={14}/></Link><button className="feature-nudge-dismiss" onClick={dismissHint} aria-label="Dismiss this tip">×</button></aside>}

    <section className="mood-worlds" aria-label="Explore cinematic moods"><div className="section-heading"><div><span className="eyebrow">CHOOSE YOUR ATMOSPHERE</span><h2>Tonight should feel <span>like something.</span></h2></div><Link className="text-link" to="/cinema-lab">Open Mood Engine <ArrowRight size={15}/></Link></div><div className="mood-world-grid">{moods.map(mood => <Link to="/cinema-lab" state={{ mood: mood.label }} className={`mood-world-card ${mood.className}`} key={mood.label}><span className="mood-world-symbol" aria-hidden="true">{mood.symbol}</span><span className="mood-world-label">YOUR NEXT MOOD</span><strong>{mood.label}</strong><small>{mood.copy}</small><span className="mood-world-cta">Explore mood <ArrowUpRight size={14}/></span></Link>)}</div></section>

    <section className="catalog-section" id="CINÉON-discover"><div className="section-heading"><div><span className="eyebrow">THE MARQUEE</span><h2>What’s playing <span>in your world.</span></h2></div><span className="result-count">{query.isSuccess ? `${movies.length} TITLES` : 'LIVE FROM TMDB'}</span></div>
      <div className="catalog-tools"><div className="tabs" role="tablist" aria-label="Movie categories">{tabLabels.map(item => <button role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} key={item.id} onClick={() => { setTab(item.id); setSearch(''); setPage(1); }}>{item.label}</button>)}</div><div className="search-wrap"><Search size={17}/><input value={search} onChange={e => {setSearch(e.target.value);setPage(1)}} placeholder="Search any movie…" aria-label="Search movies"/>{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={15}/></button>}</div></div>
      <div className="filter-row"><span>REFINE YOUR SEARCH</span><select value={language} onChange={e => {setLanguage(e.target.value);setPage(1)}} aria-label="Filter by language"><option value="">All languages</option><option value="ta">Tamil</option><option value="hi">Hindi</option><option value="te">Telugu</option><option value="ml">Malayalam</option><option value="en">English</option><option value="kn">Kannada</option></select><select value={year} onChange={e => {setYear(e.target.value);setPage(1)}} aria-label="Filter by release year"><option value="">Any year</option>{Array.from({ length: new Date().getFullYear() - 1969 }, (_, i) => new Date().getFullYear() - i).map(value => <option key={value} value={value}>{value}</option>)}</select><select value={genre} onChange={e=>{setGenre(e.target.value);setPage(1)}} aria-label="Filter by genre"><option value="">All genres</option><option value="28">Action</option><option value="12">Adventure</option><option value="16">Animation</option><option value="35">Comedy</option><option value="80">Crime</option><option value="99">Documentary</option><option value="18">Drama</option><option value="14">Fantasy</option><option value="27">Horror</option><option value="9648">Mystery</option><option value="10749">Romance</option><option value="878">Science fiction</option><option value="53">Thriller</option></select><select value={minimumRating} onChange={e=>{setMinimumRating(e.target.value);setPage(1)}} aria-label="Minimum TMDB rating"><option value="">Any rating</option><option value="5">5+ rating</option><option value="6">6+ rating</option><option value="7">7+ rating</option><option value="8">8+ rating</option></select><select value={sortBy} onChange={e=>{setSortBy(e.target.value);setPage(1)}} aria-label="Sort catalogue"><option value="popularity.desc">Popular</option><option value="vote_average.desc">Highest rated</option><option value="primary_release_date.desc">Newest</option><option value="revenue.desc">Box office</option></select>{(language || year || genre || minimumRating || sortBy!=='popularity.desc') && <button className="clear-filters" onClick={() => { setLanguage(''); setYear(''); setGenre(''); setMinimumRating(''); setSortBy('popularity.desc'); setPage(1); }}>Clear filters</button>}</div>
      {query.isLoading && <div className="movie-grid">{Array.from({ length: 10 }, (_, i) => <div className="movie-skeleton" key={i}><div/><span/><i/></div>)}</div>}
      {query.isError && <div className="error-panel"><div className="error-icon">!</div><h3>We couldn’t reach the projector.</h3><p>{query.error instanceof TmdbError ? query.error.message : query.error instanceof Error ? query.error.message : 'Something went wrong while loading movies.'}</p><button className="primary-button" onClick={() => query.refetch()}>Try again</button></div>}
      {query.isSuccess && movies.length > 0 && <><div className="movie-grid">{movies.map(movie => <MovieCard key={movie.id} movie={movie}/>)}</div><div className="catalog-pagination"><span>PAGE <strong>{page}</strong> OF {Math.max(1,totalPages)}</span><div><button disabled={page<=1||query.isFetching} onClick={()=>{setPage(p=>Math.max(1,p-1));document.getElementById('CINÉON-discover')?.scrollIntoView({behavior:'smooth',block:'start'})}}>← Previous</button><button disabled={page>=totalPages||query.isFetching} onClick={()=>{setPage(p=>Math.min(totalPages,p+1));document.getElementById('CINÉON-discover')?.scrollIntoView({behavior:'smooth',block:'start'})}}>Next page →</button></div></div></>}
      {query.isSuccess && movies.length === 0 && <div className="empty-state"><Search size={24}/><h3>No films in this frame.</h3><p>Try a different title, language or year.</p></div>}
      <div className="tmdb-attribution">This product uses the TMDB API but is not endorsed or certified by TMDB. Movie data and images are provided by TMDB.</div>
    </section>
    <section className="home-endnote"><div><Flame size={18}/><span>KEEP THE LIGHT ON</span></div><p>Your next favourite film might be one scroll away.</p><Link to="/cinema-lab">Explore the Living Cinema <ArrowRight size={15}/></Link></section>
  </div>;
}
