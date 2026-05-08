// tests/profile-smoke-test.js
// Browser-driven smoke tests for src/lib/profile.js.
// Open /tests/profile-smoke-test.html, click Run.

(() => {
  const out = document.getElementById('out');
  const runBtn = document.getElementById('run');
  const wipeBtn = document.getElementById('wipe');
  const P = () => window.Slatework && window.Slatework.Profile;
  const lines = [];
  const log = (cls, msg) => lines.push(`<span class="${cls}">${cls.toUpperCase()}</span>  ${msg}`);
  const pass = (m) => log('pass', m);
  const fail = (m) => log('fail', m);
  const assertEq = (actual, expected, label) => {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) pass(label);
    else fail(`${label} — expected ${e}, got ${a}`);
  };
  const assert = (cond, label) => cond ? pass(label) : fail(label);

  function clearStorage() {
    try { localStorage.removeItem('slatework.profiles.v1'); } catch (_) {}
  }

  function run() {
    lines.length = 0;
    clearStorage();
    if (!P()) { fail('Slatework.Profile not loaded'); render(); return; }

    // 1. Empty state
    assertEq(P().getTutor(), null, 'getTutor() empty -> null');
    assertEq(P().getStudents(), [], 'getStudents() empty -> []');
    assertEq(P().getCurrentStudent(), null, 'getCurrentStudent() empty -> null');
    assert(!P().hasAnyProfile(), 'hasAnyProfile() empty -> false');

    // 2. setTutor + getTutor
    const t = P().setTutor({country: 'GB', name: 'Sarah Chen', email: 'a@b.com'});
    assert(t && t.country === 'GB', 'setTutor() returns the tutor record');
    assertEq(P().getTutor().country, 'GB', 'getTutor() persists country');
    assertEq(P().getTutor().currency, 'GBP', 'tutor.currency derived from country');
    assert(P().hasAnyProfile(), 'hasAnyProfile() true after setTutor');

    // 3. setTutor rejects invalid country
    assertEq(P().setTutor({country: 'ZZ', name: 'X'}), null, 'setTutor() rejects unknown country');

    // 4. addStudent
    const lily = P().addStudent({
      nickname: 'Lily', target: 'English', source: 'Cantonese',
      level: 'A1', mode: 'one_to_one', exam: ''
    });
    assert(lily && /lily-/.test(lily.id), 'addStudent() returns student with id slug');
    assertEq(lily.audience_profile, 'young_learner', 'A1 derives young_learner');
    assertEq(P().getStudents().length, 1, 'students list grows');
    assertEq(P().getCurrentStudent().id, lily.id, 'first student becomes current');

    // 5. addStudent without nickname rejected
    assertEq(P().addStudent({level: 'B1'}), null, 'addStudent() rejects missing nickname');

    // 6. updateStudent + audience re-derivation
    const updated = P().updateStudent(lily.id, {level: 'B2'});
    assertEq(updated.audience_profile, 'adult', 'B2 update re-derives adult');

    // 7. exam overrides audience
    const examUpdate = P().updateStudent(lily.id, {level: 'B2', exam: 'GCSE Spanish'});
    assertEq(examUpdate.audience_profile, 'exam_prep', 'non-empty exam -> exam_prep');

    // 8. deriveAudience pure function
    assertEq(P().deriveAudience({level: 'A1', mode: 'classroom', exam: ''}), 'young_learner', 'derive A1');
    assertEq(P().deriveAudience({level: 'B1', mode: 'one_to_one', exam: ''}), 'teen', 'derive B1');
    assertEq(P().deriveAudience({level: 'C1', mode: 'one_to_one', exam: ''}), 'adult', 'derive C1');
    assertEq(P().deriveAudience({level: 'A2', mode: 'one_to_one', exam: 'IELTS'}), 'exam_prep', 'derive exam beats level');

    // 9. add second student, switch current
    const carlos = P().addStudent({
      nickname: 'Carlos', target: 'Spanish', source: 'English',
      level: 'C1', mode: 'one_to_one'
    });
    assertEq(P().getStudents().length, 2, 'two students stored');
    assert(P().setCurrentStudent(carlos.id), 'setCurrentStudent(carlos)');
    assertEq(P().getCurrentStudent().id, carlos.id, 'current is carlos');

    // 10. setCurrentStudent rejects unknown id
    assert(!P().setCurrentStudent('does-not-exist'), 'setCurrentStudent rejects unknown id');

    // 11. delete student clears current if needed
    P().deleteStudent(carlos.id);
    assertEq(P().getCurrentStudent(), null, 'deleting current clears current_student_id');
    assertEq(P().getStudents().length, 1, 'only lily remains');

    // 12. JSON export/import round-trip
    const exported = P().exportAsJson();
    P().clearAll();
    assertEq(P().getStudents(), [], 'clearAll wiped students');
    assert(P().importFromJson(exported), 'importFromJson returns true');
    assertEq(P().getStudents().length, 1, 'imported students restored');

    // 13. Schema mismatch rejected
    const bad = JSON.stringify({schema: 999, tutor: null, students: []});
    assert(!P().importFromJson(bad), 'importFromJson rejects wrong schema');

    // 14. Preferences counter + dismiss
    P().clearAll();
    assert(P().shouldShowContextualOffer(), 'fresh state shows offer');
    P().bumpContextualOfferShown();
    P().bumpContextualOfferShown();
    P().bumpContextualOfferShown();
    assert(!P().shouldShowContextualOffer(), 'three shows -> stop showing');
    P().clearAll();
    P().dismissContextualOffer();
    assert(!P().shouldShowContextualOffer(), 'dismiss -> stop showing');

    // 15. Fail-open: simulate unavailable storage by stubbing setItem to throw
    P().clearAll();
    const realSet = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => { throw new Error('quota'); };
    try {
      const failResult = P().setTutor({country: 'US'});
      assertEq(failResult, null, 'setTutor returns null when write fails');
    } finally {
      localStorage.setItem = realSet;
    }

    // tidy
    P().clearAll();
    render();
  }

  function render() {
    out.innerHTML = lines.join('\n');
    const failures = lines.filter(l => l.includes('class="fail"')).length;
    out.innerHTML += `\n\n${failures === 0 ? '✓ ALL PASS' : '✗ ' + failures + ' FAILED'}`;
  }

  runBtn.addEventListener('click', run);
  wipeBtn.addEventListener('click', () => { clearStorage(); location.reload(); });
})();
