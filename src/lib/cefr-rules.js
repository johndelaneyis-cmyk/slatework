// Deterministic CEFR placement based on Can-Do statements.
// Each statement maps to a CEFR level. The student's highest "yes" answer is the floor;
// the lowest "no" answer above that is the ceiling. Output is the highest "yes" level.

(() => {
  const STATEMENTS = [
    { id: 'a1_intro',    level: 'A1', q: 'Can the student introduce themselves and answer simple questions about who they are?' },
    { id: 'a1_basics',   level: 'A1', q: 'Can they understand and use basic phrases needed in daily situations (greetings, ordering, asking prices)?' },
    { id: 'a2_routine',  level: 'A2', q: 'Can they describe their family, daily routine, and what they did last weekend in simple connected sentences?' },
    { id: 'a2_short',    level: 'A2', q: 'Can they read short signs, menus, and ads and pick out the relevant information?' },
    { id: 'b1_opinion',  level: 'B1', q: 'Can they give a brief, prepared opinion on a familiar topic (a film, a city, a hobby)?' },
    { id: 'b1_travel',   level: 'B1', q: 'Can they handle most situations that arise while travelling — booking, asking for help, explaining a problem?' },
    { id: 'b2_argue',    level: 'B2', q: 'Can they argue for or against a position on a topic they know well, anticipating likely counter-arguments?' },
    { id: 'b2_news',     level: 'B2', q: 'Can they understand most TV news, podcasts, and articles on current events without needing a glossary?' },
    { id: 'c1_nuance',   level: 'C1', q: 'Can they express ideas with idiomatic nuance, switching register depending on whom they are speaking to?' },
    { id: 'c1_academic', level: 'C1', q: 'Can they read long, complex texts (literature, technical material) and summarise them accurately?' },
    { id: 'c2_native',   level: 'C2', q: 'Can they pick up subtle differences of meaning even in complex situations and write at a near-native standard?' }
  ];

  const ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  function statements() { return STATEMENTS.slice(); }

  function place(answers) {
    // answers: { [id]: 'yes'|'no'|'partial' }
    let highestYes = null;
    let lowestNo = null;
    for (const s of STATEMENTS) {
      const a = answers[s.id];
      if (a === 'yes') {
        if (highestYes == null || ORDER.indexOf(s.level) > ORDER.indexOf(highestYes)) highestYes = s.level;
      } else if (a === 'no') {
        if (lowestNo == null || ORDER.indexOf(s.level) < ORDER.indexOf(lowestNo)) lowestNo = s.level;
      }
    }
    if (highestYes == null) return { level: 'A0', confidence: 'low', notes: 'Not enough confirmed Can-Do statements to place — start at the very beginning.' };
    return {
      level: highestYes,
      confidence: lowestNo && ORDER.indexOf(lowestNo) <= ORDER.indexOf(highestYes) ? 'low' : 'medium',
      notes: lowestNo ? `Confirmed up to ${highestYes}; ceiling around ${lowestNo}.` : `Confirmed at ${highestYes}; ceiling not yet probed.`
    };
  }

  window.Slatework = window.Slatework || {};
  window.Slatework.cefrStatements = statements;
  window.Slatework.cefrPlace = place;
})();
