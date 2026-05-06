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
    let highestPartial = null;
    let lowestPartial = null;
    let lowestNo = null;
    let answeredCount = 0;
    for (const s of STATEMENTS) {
      const a = answers[s.id];
      if (a !== 'yes' && a !== 'no' && a !== 'partial') continue;
      answeredCount++;
      if (a === 'yes') {
        if (highestYes == null || ORDER.indexOf(s.level) > ORDER.indexOf(highestYes)) highestYes = s.level;
      } else if (a === 'partial') {
        if (highestPartial == null || ORDER.indexOf(s.level) > ORDER.indexOf(highestPartial)) highestPartial = s.level;
        if (lowestPartial == null || ORDER.indexOf(s.level) < ORDER.indexOf(lowestPartial)) lowestPartial = s.level;
      } else if (a === 'no') {
        if (lowestNo == null || ORDER.indexOf(s.level) < ORDER.indexOf(lowestNo)) lowestNo = s.level;
      }
    }

    if (answeredCount < 3) {
      return { level: null, confidence: null, notes: 'Answer at least 3 of the statements above to place the student.', insufficient: true };
    }

    // Detect inconsistency: highest "yes" is at a higher level than lowest "no".
    const inconsistent = highestYes && lowestNo && ORDER.indexOf(lowestNo) < ORDER.indexOf(highestYes);

    // No yes at all — fall back to lowest partial as floor (low confidence).
    if (highestYes == null) {
      if (lowestPartial != null) {
        return {
          level: lowestPartial,
          confidence: 'low',
          notes: `Only partial confirmation at ${lowestPartial}; treat as a tentative floor and re-check the lower-level Can-Dos in the next session.`
        };
      }
      return { level: 'A0', confidence: 'low', notes: 'Not enough confirmed Can-Do statements to place — start at the very beginning.' };
    }

    // Partial above the highest yes nudges the placement up but keeps confidence low.
    let placed = highestYes;
    let confidence = lowestNo && ORDER.indexOf(lowestNo) <= ORDER.indexOf(highestYes) ? 'low' : 'medium';
    if (highestPartial && ORDER.indexOf(highestPartial) > ORDER.indexOf(highestYes)) {
      placed = highestPartial;
      confidence = 'low';
    }

    let notes = lowestNo ? `Confirmed up to ${highestYes}; ceiling around ${lowestNo}.` : `Confirmed at ${highestYes}; ceiling not yet probed.`;
    if (inconsistent) {
      notes = `Answers seem inconsistent — re-ask the lower-level statements before relying on this placement. Confirmed at ${highestYes}, but a lower-level statement (${lowestNo}) was answered No.`;
      confidence = 'low';
    } else if (highestPartial && ORDER.indexOf(highestPartial) > ORDER.indexOf(highestYes)) {
      notes = `Confirmed at ${highestYes}; partial signal at ${highestPartial} suggests the ceiling is higher — confidence kept low pending more probing.`;
    }

    return { level: placed, confidence, notes };
  }

  window.Slatework = window.Slatework || {};
  window.Slatework.cefrStatements = statements;
  window.Slatework.cefrPlace = place;
})();
