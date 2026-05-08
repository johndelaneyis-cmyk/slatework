# Slatework.Profile API reference

Source: `src/lib/profile.js` · Spec: `docs/superpowers/specs/2026-05-09-profile-architecture-and-ux-cleanup-design.md`

## Tutor
| Method | Returns | Notes |
|---|---|---|
| `getTutor()` | `{country, currency, name, email, business_name, set_at}` or `null` | |
| `setTutor({country, name?, email?, business_name?})` | tutor object or `null` | Country must be in `COUNTRY_ALLOWLIST` |
| `clearTutor()` | `bool` | Does NOT delete students |

## Students
| Method | Returns | Notes |
|---|---|---|
| `getStudents()` | array (copy) | Safe to mutate caller-side; reads re-fetch fresh |
| `getStudent(id)` | object or `null` | |
| `getCurrentStudent()` | object or `null` | |
| `setCurrentStudent(id\|null)` | `bool` | Validates id exists |
| `clearCurrentStudent()` | `bool` | Alias for `setCurrentStudent(null)` |
| `addStudent({nickname, target, source, level, mode, exam?, audience_profile?, notes?, level_set_via?})` | new student or `null` | First student becomes current automatically |
| `updateStudent(id, partial)` | merged student or `null` | Re-derives audience if level/mode/exam change |
| `deleteStudent(id)` | `bool` | Clears `current_student_id` if it matches |

## Bulk + audience
| Method | Returns | Notes |
|---|---|---|
| `hasAnyProfile()` | `bool` | true if tutor OR any student |
| `exportAsJson()` | string | Pretty-printed |
| `importFromJson(s)` | `bool` | Rejects schema mismatch |
| `clearAll()` | `bool` | Wipes the localStorage key |
| `deriveAudience({level, mode, exam})` | `'young_learner'\|'teen'\|'adult'\|'exam_prep'` | Pure |

## Preferences
| Method | Returns | Notes |
|---|---|---|
| `getPreferences()` | copy of preferences | |
| `bumpContextualOfferShown()` | `bool` | Increment shown counter |
| `dismissContextualOffer()` | `bool` | Sets dismissed flag |
| `shouldShowContextualOffer()` | `bool` | False if dismissed OR shown >= 3 times |

## Constants
- `Slatework.Profile.COUNTRY_ALLOWLIST` — frozen `['US','GB','CA','AU','NZ','IE','HK']`
- `Slatework.Profile.SCHEMA_VERSION` — `1`

## Storage
- Key: `slatework.profiles.v1`
- Failure mode: any localStorage error returns null/empty/false; site continues to work.
