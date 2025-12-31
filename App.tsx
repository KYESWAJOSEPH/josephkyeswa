
import React, { useState, useEffect } from 'react';
import { View, DictionaryEntry, QuizQuestion, Phrase, TestResult } from './types';
import { dictionaryService } from './services/geminiService';
import { CATEGORIES, LUGANDA_ALPHABET, LUGANDA_NUMBERS } from './constants';
import AudioPlayer from './components/AudioPlayer';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLang, setSearchLang] = useState<'luganda' | 'english'>('luganda');
  const [searchResult, setSearchResult] = useState<DictionaryEntry | null>(null);
  const [searching, setSearching] = useState(false);
  const [wotd, setWotd] = useState<DictionaryEntry | null>(null);
  const [favorites, setFavorites] = useState<DictionaryEntry[]>([]);
  
  // Quiz/Test States
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [activeTestType, setActiveTestType] = useState('General Knowledge');

  // Phrasebook States
  const [activePhraseCategory, setActivePhraseCategory] = useState<string | null>(null);
  const [categoryPhrases, setCategoryPhrases] = useState<Phrase[]>([]);
  const [loadingPhrases, setLoadingPhrases] = useState(false);

  useEffect(() => {
    const fetchWotd = async () => {
      const word = await dictionaryService.getWordOfTheDay();
      setWotd(word);
    };
    fetchWotd();

    const storedFavs = localStorage.getItem('lexicon_favorites');
    if (storedFavs) setFavorites(JSON.parse(storedFavs));

    const storedHistory = localStorage.getItem('lexicon_test_history');
    if (storedHistory) setTestHistory(JSON.parse(storedHistory));
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setCurrentView('search');
    const result = await dictionaryService.searchWord(searchQuery, searchLang);
    setSearchResult(result);
    setSearching(false);
  };

  const handleCategorySelect = async (category: string) => {
    setActivePhraseCategory(category);
    setLoadingPhrases(true);
    const phrases = await dictionaryService.getPhrasesByCategory(category);
    setCategoryPhrases(phrases);
    setLoadingPhrases(false);
  };

  const toggleFavorite = (entry: DictionaryEntry) => {
    let newFavs;
    if (favorites.some(f => f.word === entry.word)) {
      newFavs = favorites.filter(f => f.word !== entry.word);
    } else {
      newFavs = [...favorites, entry];
    }
    setFavorites(newFavs);
    localStorage.setItem('lexicon_favorites', JSON.stringify(newFavs));
  };

  const startQuiz = async (type: string = 'General Knowledge') => {
    setSearching(true);
    setActiveTestType(type);
    const newQuizzes = await dictionaryService.generateQuiz(5, type);
    setQuizzes(newQuizzes);
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setShowExplanation(false);
    setQuizFinished(false);
    setCurrentView('quiz');
    setSearching(false);
  };

  const handleAnswer = (option: string) => {
    if (showExplanation) return;
    if (option === quizzes[currentQuizIndex].correctAnswer) {
      setQuizScore(s => s + 1);
    }
    setShowExplanation(true);
  };

  const nextQuiz = () => {
    if (currentQuizIndex < quizzes.length - 1) {
      setCurrentQuizIndex(i => i + 1);
      setShowExplanation(false);
    } else {
      const result: TestResult = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        score: quizScore,
        total: quizzes.length,
        type: activeTestType
      };
      const newHistory = [result, ...testHistory].slice(0, 10);
      setTestHistory(newHistory);
      localStorage.setItem('lexicon_test_history', JSON.stringify(newHistory));
      setQuizFinished(true);
    }
  };

  const NavItem = ({ view, icon, label }: { view: View, icon: React.ReactNode, label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        if (view !== 'search') setSearchResult(null);
        if (view === 'phrasebook') setActivePhraseCategory(null);
      }}
      className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentView === view ? 'text-amber-600 bg-amber-50' : 'text-stone-500 hover:text-stone-800'}`}
    >
      {icon}
      <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter sm:tracking-wider">{label}</span>
    </button>
  );

  const calculateAverageScore = () => {
    if (testHistory.length === 0) return 0;
    const total = testHistory.reduce((acc, curr) => acc + (curr.score / curr.total), 0);
    return Math.round((total / testHistory.length) * 100);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 african-pattern pointer-events-none"></div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-stone-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('home')}>
          <div className="bg-amber-600 text-white p-1.5 rounded-lg shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path></svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-stone-800">Luganda Lexicon</h1>
        </div>
      </header>

      {/* Search Bar */}
      {currentView !== 'quiz' && (
        <div className="px-4 py-4 bg-white border-b border-stone-200 z-20">
          <form onSubmit={handleSearch} className="flex flex-col gap-2">
            <div className="relative group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search in ${searchLang === 'luganda' ? 'Luganda' : 'English'}...`}
                className="w-full bg-stone-100 border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-amber-500 transition-all text-stone-800"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-amber-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 px-1">
               <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
                 <button
                  type="button"
                  onClick={() => setSearchLang('luganda')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${searchLang === 'luganda' ? 'bg-white shadow-sm text-amber-600' : 'text-stone-500'}`}
                 >
                   Luganda
                 </button>
                 <button
                  type="button"
                  onClick={() => setSearchLang('english')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${searchLang === 'english' ? 'bg-white shadow-sm text-amber-600' : 'text-stone-500'}`}
                 >
                   English
                 </button>
               </div>
               <button
                type="submit"
                disabled={searching}
                className="bg-amber-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-amber-700 active:scale-95 transition-all disabled:opacity-50"
               >
                {searching ? 'Finding...' : 'Translate'}
               </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-4 z-10">
        {currentView === 'home' && (
          <div className="space-y-6">
            {/* Word of the Day */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 relative overflow-hidden group">
               <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full group-hover:scale-110 transition-transform"></div>
               <div className="flex justify-between items-start mb-4 relative">
                  <div>
                    <span className="text-amber-600 text-[10px] font-bold uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-full">Word of the Day</span>
                    <h2 className="text-3xl font-black text-stone-800 mt-2">{wotd ? wotd.word : 'Loading...'}</h2>
                  </div>
                  {wotd && <AudioPlayer text={wotd.word} />}
               </div>
               {wotd ? (
                 <>
                   <p className="text-stone-600 mb-4 line-clamp-3">
                     <span className="italic text-stone-400 text-sm mr-2">{wotd.partOfSpeech}</span>
                     {wotd.definition}
                   </p>
                   <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                        <span className="text-xs font-bold text-stone-500 uppercase">Translation</span>
                      </div>
                      <p className="text-lg font-bold text-stone-800">{wotd.translation}</p>
                   </div>
                   <button
                    onClick={() => {
                      setSearchQuery(wotd.word);
                      handleSearch();
                    }}
                    className="mt-6 w-full py-3 bg-stone-900 text-white rounded-2xl font-bold text-sm hover:bg-stone-800 transition-colors"
                   >
                     Learn More
                   </button>
                 </>
               ) : (
                 <div className="animate-pulse space-y-4">
                   <div className="h-8 bg-stone-100 rounded w-1/2"></div>
                   <div className="h-4 bg-stone-100 rounded w-full"></div>
                   <div className="h-20 bg-stone-100 rounded-2xl w-full"></div>
                 </div>
               )}
            </section>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
               <button
                onClick={() => setCurrentView('tests')}
                className="bg-emerald-600 text-white p-5 rounded-3xl shadow-sm hover:bg-emerald-700 transition-all group text-left"
               >
                  <div className="bg-white/20 p-2 rounded-xl w-fit mb-3 group-hover:rotate-12 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path></svg>
                  </div>
                  <h3 className="font-bold text-lg">Test Center</h3>
                  <p className="text-emerald-50 text-xs mt-1">Track your progress</p>
               </button>
               <button
                onClick={() => setCurrentView('phrasebook')}
                className="bg-indigo-600 text-white p-5 rounded-3xl shadow-sm hover:bg-indigo-700 transition-all group text-left"
               >
                  <div className="bg-white/20 p-2 rounded-xl w-fit mb-3 group-hover:rotate-12 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  </div>
                  <h3 className="font-bold text-lg">Phrasebook</h3>
                  <p className="text-indigo-50 text-xs mt-1">Useful expressions</p>
               </button>
            </div>
            
            <button
              onClick={() => setCurrentView('phonetics')}
              className="w-full bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex items-center gap-4 hover:border-amber-500 transition-all group"
            >
              <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 1 0-9-9c0 1.488.36 2.89 1 4.127L3 21l4.873-1c1.236.64 2.64 1 4.127 1Z"/><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 15h.01"/></svg>
              </div>
              <div className="text-left">
                <h3 className="font-black text-stone-800">Learn the Sounds</h3>
                <p className="text-xs text-stone-400">Master Luganda pronunciation rules</p>
              </div>
            </button>

            {/* Alphabet Section */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-stone-800 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-amber-500 rounded-full"></span>
                    Luganda Alphabet
                  </h3>
               </div>
               <div className="flex flex-wrap gap-2">
                  {LUGANDA_ALPHABET.map((letter) => (
                    <button
                      key={letter}
                      onClick={() => {
                        setSearchQuery(letter);
                        setSearchLang('luganda');
                        handleSearch();
                      }}
                      className="w-10 h-10 bg-stone-50 border border-stone-100 rounded-xl flex items-center justify-center font-black text-stone-700 hover:bg-amber-500 hover:text-white transition-all active:scale-90"
                    >
                      {letter}
                    </button>
                  ))}
               </div>
            </section>

            {/* Numbers Section */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-stone-800 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-emerald-500 rounded-full"></span>
                    Counting in Luganda
                  </h3>
               </div>
               <div className="grid grid-cols-2 gap-3">
                  {LUGANDA_NUMBERS.map((n) => (
                    <div
                      key={n.num}
                      className="flex items-center justify-between p-3 bg-stone-50 border border-stone-100 rounded-2xl group hover:border-emerald-500 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-black text-xs">{n.num}</span>
                        <span className="font-bold text-stone-800 text-sm">{n.word}</span>
                      </div>
                      <AudioPlayer text={n.word} />
                    </div>
                  ))}
               </div>
            </section>
          </div>
        )}

        {currentView === 'phonetics' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-black text-stone-800">Pronunciation Guide</h2>
            <p className="text-stone-500 text-sm leading-relaxed">
              Luganda is a tonal Bantu language. Its spelling is phonemic, meaning each letter or cluster usually represents exactly one sound.
            </p>

            {/* Vowels Section */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                <h3 className="font-black text-xl text-stone-800">Vowels</h3>
              </div>
              <p className="text-stone-500 text-sm mb-4">There are 5 basic vowels. When doubled, they are held for twice as long.</p>
              <div className="space-y-3">
                {[
                  { l: 'A / AA', s: 'Ah (like Father)', ex: 'Baba', t: 'Father' },
                  { l: 'E / EE', s: 'Eh (like Bed)', ex: 'Mmele', t: 'Food' },
                  { l: 'I / II', s: 'Ee (like See)', ex: 'Bibili', t: 'Two' },
                  { l: 'O / OO', s: 'Oh (like More)', ex: 'Mukolo', t: 'Ceremony' },
                  { l: 'U / UU', s: 'Oo (like Food)', ex: 'Muzungu', t: 'White person' },
                ].map((v, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-100">
                    <div className="flex gap-4 items-center">
                      <span className="font-black text-amber-600 text-lg w-12">{v.l}</span>
                      <div>
                        <p className="text-sm font-bold text-stone-800">{v.s}</p>
                        <p className="text-[10px] text-stone-400">Example: <span className="text-stone-600 italic font-medium">{v.ex}</span> ({v.t})</p>
                      </div>
                    </div>
                    <AudioPlayer text={v.ex} />
                  </div>
                ))}
              </div>

              {/* Vowel Gemination Block */}
              <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-black text-amber-700 text-sm uppercase tracking-wider">Vowel Gemination</h4>
                  <AudioPlayer text="Abaana" />
                </div>
                <p className="text-xs text-amber-800 font-medium leading-relaxed">
                  When a vowel is doubled (e.g., <span className="font-bold">aa</span>, <span className="font-bold">ee</span>), it is held for twice the duration of a single vowel. This length distinction is crucial as it can change the entire meaning of a word.
                </p>
                <p className="text-[10px] text-amber-600 mt-2 font-bold italic">Example: Abaana (Children)</p>
              </div>
            </section>

            {/* Consonants Section */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                <h3 className="font-black text-xl text-stone-800">Consonants</h3>
              </div>
              <p className="text-stone-500 text-sm mb-4">Standard Luganda consonants and common clusters. Notice the hard and soft distinctions.</p>
              
              {/* Common Confusion Alert */}
              <div className="mb-6 p-4 bg-stone-900 text-white rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                  <h4 className="text-xs font-black uppercase tracking-widest text-amber-500">Learner's Tip</h4>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Don't confuse <span className="text-white font-bold">K</span> with <span className="text-white font-bold">KY</span>, or <span className="text-white font-bold">G</span> with <span className="text-white font-bold">GY</span>. These are distinct phonemes. Pronouncing "Kyalo" as "Kalo" significantly changes the meaning!
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { l: 'B', s: 'Standard "B" as in "Boy"', ex: 'Baba', t: 'Father' },
                  { l: 'G', s: 'Always HARD as in "Gate". Never soft like "Giant"', ex: 'Genda', t: 'Go' },
                  { l: 'K', s: 'Standard "K" as in "Keep"', ex: 'Kola', t: 'Work' },
                  { l: 'M', s: 'Standard "M" as in "Mother"', ex: 'Maama', t: 'Mother' },
                  { l: 'N', s: 'Standard "N" as in "No"', ex: 'Nva', t: 'Relish' },
                  { l: 'P', s: 'Standard "P" as in "Park"', ex: 'Paapa', t: 'Pope' },
                  { l: 'S', s: 'Always "S" as in "Sun", never like "Z"', ex: 'Soma', t: 'Read' },
                  { l: 'T', s: 'Standard "T" as in "Top"', ex: 'Tula', t: 'Sit' },
                  { l: 'W', s: 'Standard "W" as in "Win"', ex: 'Wano', t: 'Here' },
                  { l: 'Y', s: 'Standard "Y" as in "Yes"', ex: 'Yiga', t: 'Learn' },
                  { l: 'KY', s: 'Sounds like "CH" in "Church". Do not pronounce the K and Y separately.', ex: 'Kyalo', t: 'Village' },
                  { l: 'GY', s: 'Sounds like "J" in "Job" or "Judge". A single palatal sound.', ex: 'Gyangu', t: 'Come' }
                ].map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-100">
                    <div className="flex gap-4 items-center">
                      <span className="font-black text-indigo-600 text-lg w-12">{c.l}</span>
                      <div>
                        <p className="text-sm font-bold text-stone-800">{c.s}</p>
                        <p className="text-[10px] text-stone-400">Example: <span className="text-stone-600 italic font-medium">{c.ex}</span> ({c.t})</p>
                      </div>
                    </div>
                    <AudioPlayer text={c.ex} />
                  </div>
                ))}
              </div>
            </section>

            {/* Unique Digraphs Section */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                <h3 className="font-black text-xl text-stone-800">Unique Digraphs</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                 <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="flex justify-between items-start mb-2">
                       <h4 className="font-black text-emerald-700 text-lg">NG' / ŋ</h4>
                       <AudioPlayer text="ŋoŋo" />
                    </div>
                    <p className="text-sm text-emerald-800 font-medium">A nasal sound like the 'ng' in "singer" (not "finger"). Usually found at the start of words.</p>
                    <p className="text-xs text-emerald-600 mt-2 italic font-bold">Example: Ng'ombe (Cow)</p>
                 </div>
                 <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <div className="flex justify-between items-start mb-2">
                       <h4 className="font-black text-indigo-700 text-lg">NY / ɲ</h4>
                       <AudioPlayer text="Nyabo" />
                    </div>
                    <p className="text-sm text-indigo-800 font-medium">Sounds like the 'ny' in "canyon" or Spanish 'ñ'.</p>
                    <p className="text-xs text-indigo-600 mt-2 italic font-bold">Example: Nyabo (Madam)</p>
                 </div>
              </div>
            </section>

            {/* The L/R Rule */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-6 bg-red-500 rounded-full"></div>
                <h3 className="font-black text-xl text-stone-800">The L vs R Rule</h3>
              </div>
              <p className="text-stone-500 text-sm leading-relaxed mb-4">
                In Luganda, 'L' and 'R' are essentially the same sound but written differently based on context.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                   <div className="w-6 h-6 bg-stone-100 rounded-full flex items-center justify-center flex-shrink-0 text-stone-400 font-bold text-xs">1</div>
                   <p className="text-sm text-stone-700">Use <span className="font-black text-red-600">R</span> if preceded by 'E' or 'I'.</p>
                </div>
                <div className="flex items-start gap-3">
                   <div className="w-6 h-6 bg-stone-100 rounded-full flex items-center justify-center flex-shrink-0 text-stone-400 font-bold text-xs">2</div>
                   <p className="text-sm text-stone-700">Use <span className="font-black text-red-600">L</span> in all other cases (start of word or after A, O, U).</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                   <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-stone-800 text-sm">Kulaba</p>
                        <p className="text-[10px] text-stone-400">Starts with L</p>
                      </div>
                      <AudioPlayer text="Kulaba" />
                   </div>
                   <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-stone-800 text-sm">Emere</p>
                        <p className="text-[10px] text-stone-400">After E, use R</p>
                      </div>
                      <AudioPlayer text="Emere" />
                   </div>
                </div>
              </div>
            </section>

            {/* Gemination */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
                <h3 className="font-black text-xl text-stone-800">Doubled Consonants</h3>
              </div>
              <p className="text-stone-500 text-sm leading-relaxed mb-4">
                When a consonant is doubled (e.g., <span className="font-bold text-stone-800">tt</span>, <span className="font-bold text-stone-800">dd</span>), it indicates a brief pause or "stalling" of the sound, making it stronger.
              </p>
              <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex items-center justify-between">
                 <div>
                    <h4 className="font-black text-purple-700">Example: OKUTTA</h4>
                    <p className="text-xs text-purple-600 mt-1 font-medium">Listen for the 'hard' stop on the T.</p>
                 </div>
                 <AudioPlayer text="Okutta" />
              </div>
            </section>
          </div>
        )}

        {currentView === 'tests' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-3xl font-black text-stone-800">Learning Center</h2>
            
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-200">
                <p className="text-stone-400 text-[10px] font-bold uppercase mb-1">Average Score</p>
                <p className="text-3xl font-black text-amber-600">{calculateAverageScore()}%</p>
                <div className="w-full bg-stone-100 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-amber-500 h-full transition-all duration-1000" style={{ width: `${calculateAverageScore()}%` }}></div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-200">
                <p className="text-stone-400 text-[10px] font-bold uppercase mb-1">Tests Completed</p>
                <p className="text-3xl font-black text-emerald-600">{testHistory.length}</p>
                <p className="text-[10px] text-stone-400 mt-2 font-medium">Keep it up!</p>
              </div>
            </div>

            {/* Start New Test Section */}
            <section>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-red-500 rounded-full"></span>
                Start New Assessment
              </h3>
              <div className="space-y-3">
                {[
                  { title: "Vocabulary Challenge", type: "Vocabulary", icon: "📚", color: "bg-blue-50 text-blue-600" },
                  { title: "Grammar Mastery", type: "Grammar", icon: "✍️", color: "bg-purple-50 text-purple-600" },
                  { title: "Phrase Conversation", type: "Phrases", icon: "💬", color: "bg-orange-50 text-orange-600" }
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => startQuiz(item.title)}
                    className="w-full bg-white p-4 rounded-3xl border border-stone-200 shadow-sm flex items-center gap-4 hover:border-amber-500 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <div className={`${item.color} w-12 h-12 rounded-2xl flex items-center justify-center text-xl`}>
                      {item.icon}
                    </div>
                    <div className="text-left flex-1">
                      <h4 className="font-black text-stone-800">{item.title}</h4>
                      <p className="text-xs text-stone-400">Test your {item.type.toLowerCase()} skills</p>
                    </div>
                    <div className="text-stone-300">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Test History */}
            <section>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                Performance History
              </h3>
              {testHistory.length === 0 ? (
                <div className="bg-stone-100 p-8 rounded-3xl border-2 border-dashed border-stone-200 text-center text-stone-400">
                  <p className="text-sm">No tests completed yet. Your progress will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {testHistory.map((test) => (
                    <div key={test.id} className="bg-white p-4 rounded-2xl border border-stone-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-stone-800 text-sm">{test.type}</p>
                        <p className="text-[10px] text-stone-400">{test.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="text-right">
                           <p className="font-black text-lg text-stone-800">{test.score}/{test.total}</p>
                           <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Completed</p>
                         </div>
                         <div className={`w-2 h-2 rounded-full ${test.score / test.total >= 0.8 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {currentView === 'phrasebook' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-stone-800">
                {activePhraseCategory ? activePhraseCategory : 'Phrasebook'}
              </h2>
              {activePhraseCategory && (
                <button 
                  onClick={() => setActivePhraseCategory(null)}
                  className="text-stone-500 text-sm font-bold flex items-center gap-1 hover:text-amber-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
                  Back
                </button>
              )}
            </div>

            {!activePhraseCategory ? (
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((cat, idx) => (
                  <button
                    key={cat}
                    onClick={() => handleCategorySelect(cat)}
                    className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm text-left hover:border-amber-500 hover:bg-amber-50 transition-all group"
                  >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 transition-colors ${idx % 2 === 0 ? 'bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white' : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"></path><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"></path></svg>
                    </div>
                    <span className="font-black text-stone-800 block text-sm leading-tight uppercase tracking-wide">{cat}</span>
                    <p className="text-[10px] text-stone-400 mt-1">Common phrases</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {loadingPhrases ? (
                  <div className="space-y-4">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="h-20 bg-stone-100 rounded-2xl animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  categoryPhrases.map((phrase, i) => (
                    <div 
                      key={i} 
                      className="bg-white p-5 rounded-3xl border border-stone-200 flex justify-between items-center shadow-sm group hover:border-amber-500 transition-colors"
                    >
                      <div className="pr-4">
                        <p className="font-black text-lg text-stone-800 leading-tight mb-2">{phrase.luganda}</p>
                        <div className="flex items-center gap-2">
                           <div className="w-1 h-1 bg-amber-500 rounded-full"></div>
                           <p className="text-stone-500 text-sm italic font-medium">{phrase.english}</p>
                        </div>
                      </div>
                      <AudioPlayer text={phrase.luganda} />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {currentView === 'search' && (
          <div className="space-y-6">
            {searching ? (
              <div className="flex flex-col items-center justify-center py-20 text-stone-400">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-600 border-t-transparent mb-4"></div>
                <p className="font-medium">Searching our dictionary...</p>
              </div>
            ) : searchResult ? (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-4xl font-black text-stone-800">{searchResult.word}</h2>
                      <button
                        onClick={() => toggleFavorite(searchResult)}
                        className={`p-1.5 rounded-full transition-colors ${favorites.some(f => f.word === searchResult.word) ? 'text-red-500' : 'text-stone-300 hover:text-red-400'}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={favorites.some(f => f.word === searchResult.word) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                      </button>
                    </div>
                    {searchResult.pronunciation && (
                      <p className="text-stone-400 text-sm font-medium mt-1">/ {searchResult.pronunciation} /</p>
                    )}
                  </div>
                  <AudioPlayer text={searchResult.word} />
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="bg-stone-100 text-stone-600 text-[10px] font-bold uppercase px-3 py-1 rounded-full">{searchResult.partOfSpeech}</span>
                  {searchResult.nounClass && (
                    <span className="bg-amber-100 text-amber-700 text-[10px] font-bold uppercase px-3 py-1 rounded-full">{searchResult.nounClass}</span>
                  )}
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Translation</h3>
                    <p className="text-2xl font-bold text-amber-600">{searchResult.translation}</p>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Definition</h3>
                    <p className="text-stone-700 leading-relaxed">{searchResult.definition}</p>
                  </div>

                  {searchResult.examples.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Example Sentences</h3>
                      <div className="space-y-4">
                        {searchResult.examples.map((ex, i) => (
                          <div key={i} className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                            <p className="font-bold text-stone-800 text-sm mb-1">{ex.luganda}</p>
                            <p className="text-stone-500 text-xs italic">{ex.english}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-stone-400">
                <div className="bg-stone-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path></svg>
                </div>
                <p>No results found. Try another word!</p>
              </div>
            )}
          </div>
        )}

        {currentView === 'favorites' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-stone-800">My Favorites</h2>
            {favorites.length === 0 ? (
              <div className="text-center py-20 text-stone-400">
                <div className="bg-stone-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                </div>
                <p>You haven't saved any words yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {favorites.map((fav, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setSearchQuery(fav.word);
                      handleSearch();
                    }}
                    className="bg-white p-4 rounded-2xl border border-stone-200 flex justify-between items-center shadow-sm cursor-pointer hover:border-amber-500 transition-all"
                  >
                    <div>
                      <p className="font-black text-xl text-stone-800">{fav.word}</p>
                      <p className="text-amber-600 text-sm font-bold">{fav.translation}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(fav);
                      }}
                      className="text-red-500 p-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentView === 'quiz' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-stone-800">{activeTestType}</h2>
              <button
                onClick={() => setCurrentView('tests')}
                className="text-stone-400 hover:text-stone-600 font-bold text-sm"
              >
                Quit
              </button>
            </div>

            {searching ? (
              <div className="flex flex-col items-center justify-center py-20 text-stone-400">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-600 border-t-transparent mb-4"></div>
                <p className="font-medium">Curating your test questions...</p>
              </div>
            ) : quizFinished ? (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-200 text-center">
                <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                </div>
                <h3 className="text-3xl font-black text-stone-800 mb-2">Test Complete!</h3>
                <p className="text-stone-500 mb-8 text-lg">You scored <span className="text-amber-600 font-black">{quizScore} / {quizzes.length}</span></p>
                <div className="space-y-3">
                  <button
                    onClick={() => startQuiz(activeTestType)}
                    className="w-full py-4 bg-amber-600 text-white rounded-2xl font-bold shadow-lg hover:bg-amber-700 transition-all"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => setCurrentView('tests')}
                    className="w-full py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all"
                  >
                    Back to Center
                  </button>
                </div>
              </div>
            ) : quizzes[currentQuizIndex] && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${((currentQuizIndex + 1) / quizzes.length) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-bold text-stone-400">{currentQuizIndex + 1} / {quizzes.length}</span>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
                  <h3 className="text-xl font-bold text-stone-800 mb-6 leading-tight">{quizzes[currentQuizIndex].question}</h3>
                  <div className="space-y-3">
                    {quizzes[currentQuizIndex].options.map((option, idx) => {
                      const isCorrect = option === quizzes[currentQuizIndex].correctAnswer;
                      return (
                        <button
                          key={idx}
                          disabled={showExplanation}
                          onClick={() => handleAnswer(option)}
                          className={`w-full p-4 rounded-2xl text-left border-2 font-bold transition-all ${
                            showExplanation
                              ? isCorrect
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                : 'bg-stone-50 border-stone-200 text-stone-400 opacity-50'
                              : 'bg-white border-stone-100 text-stone-800 hover:border-amber-500 hover:bg-amber-50'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {showExplanation && (
                  <div className="bg-stone-900 text-white rounded-3xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div>
                      <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Expert Explanation</h4>
                      <p className="text-sm text-stone-300 leading-relaxed">{quizzes[currentQuizIndex].explanation}</p>
                    </div>
                    <button
                      onClick={nextQuiz}
                      className="w-full py-3 bg-white text-stone-900 rounded-xl font-bold hover:bg-stone-100 transition-colors"
                    >
                      {currentQuizIndex === quizzes.length - 1 ? 'Finish Assessment' : 'Next Question'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-stone-200 px-3 py-3 flex justify-between items-center z-40 pb-safe">
        <NavItem view="home" label="Home" icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>} />
        <NavItem view="search" label="Search" icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>} />
        <NavItem view="phonetics" label="Sounds" icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 1 0-9-9c0 1.488.36 2.89 1 4.127L3 21l4.873-1c1.236.64 2.64 1 4.127 1Z"/><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 15h.01"/></svg>} />
        <NavItem view="phrasebook" label="Phrases" icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>} />
        <NavItem view="tests" label="Learn" icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path></svg>} />
        <NavItem view="favorites" label="Saved" icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>} />
      </nav>
    </div>
  );
};

export default App;
