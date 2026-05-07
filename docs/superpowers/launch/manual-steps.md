# Manual user steps for the May 7-14 launch

These are the steps I (Claude) cannot do for you. Follow these in order today, Thu May 7.

---

## Step 1: Cloudflare Email Routing alias (~30 seconds)

**Goal:** Add `reddit@slatework.tools` (and optionally `hn@slatework.tools`) as forwarding aliases to your real inbox.

1. Go to https://dash.cloudflare.com → select the `slatework.tools` domain
2. Sidebar → Email → Email Routing
3. Click "Routing rules" tab
4. "Create address" → enter `reddit` as the custom address (left side), pick "Send to an email" + your real inbox on the right
5. Repeat for `hn` if you want a separate alias for HN

Verification: send a test email to `reddit@slatework.tools` from your phone — confirm it lands in your inbox.

---

## Step 2: Reddit account (~3 minutes)

**Goal:** Create a project-specific Reddit account, not tied to justpromptit.

1. Open an incognito window (so it doesn't conflict with your work-Reddit cookies)
2. Go to https://reddit.com/register
3. Email: `reddit@slatework.tools`
4. Username: try in this order, take the first that's available:
   - `slatework_dev`
   - `slatework_maker`
   - `slate_work`
   - `by_slatework`
5. Pick a strong password (save it in your password manager — you'll need it next Tuesday)
6. Skip the "interests" onboarding
7. Profile → Settings → About → Bio: *"Building free tools for independent language tutors at slatework.tools."* Save.
8. Subscribe to: `r/languagelearning`, `r/ESL_Teachers`, `r/languageteachers`, `r/Tutor`, `r/teaching`, `r/duolingo` — so the home feed surfaces relevant threads

Do NOT post or comment yet — that comes Friday.

---

## Step 3: HN account (~2 minutes, optional but recommended)

**Goal:** Have an HN account with at least one week of (any) activity before posting Show HN.

1. https://news.ycombinator.com/signup
2. Username: `slatework_dev` if available, else same fallbacks as Reddit
3. Email: `hn@slatework.tools`
4. Password — save it
5. Set the "about" field on your profile (optional): *"Building free tools for independent language tutors. https://slatework.tools"*

Comment on 1-2 random HN threads this week (genuine substance, no self-promo) just to show the account isn't brand-new on submission day.

---

## Step 4: Seasoning, Fri May 8 → Mon May 11

**Time budget: 30 min/day.**

Each day, open Reddit, look at the home feed, and find 1-3 threads where you can write a substantive comment. Examples of good thread shapes:

- "How much should I pay for [language] tutoring?" — answer with the country/platform reasoning you know.
- "italki vs Preply?" — compare honestly, mention tier fees, mention private rate ceiling.
- "What CEFR level am I?" — explain Can-Do statements; don't offer to assess.
- "Do I need to register self-employed in [country]?" — country-specific.

**Hard rules during seasoning:**
- DO NOT mention `slatework.tools` in any comment
- DO NOT use phrases like "I built a tool…" or "I'm working on…"
- DO answer the question, then leave
- DO upvote helpful comments (builds your engagement signal to Reddit)

**Karma target:** 50-100 comment karma by Mon evening. Without this, r/ESL_Teachers and r/languagelearning auto-mod removes your launch post.

---

## Step 5: Mod outreach for r/languagelearning (Mon May 11)

**Goal:** Get explicit approval before submitting to the big sub.

1. Go to `r/languagelearning` → about → "Message the mods"
2. Send a short message:

```
Subject: Permission for "Resource" post — free tutor toolkit

Hi mods,

I've built a free toolkit for independent language tutors at slatework.tools 
— ten tools, country-aware for 7 markets, no signup or platform fee. I'd like 
to submit a "Resource" post on Tue or Wed this week.

I've been commenting on the sub for the past few days (u/slatework_dev) and 
want to be respectful of the rules. Would a Resource flair post be welcome, 
or would you prefer I post elsewhere?

Happy to share the draft for your review before posting.

Thanks,
Darren
```

3. Wait for reply. If approved, schedule the post for Wed (so the r/languageteachers + r/ESL_Teachers posts go up Tue first as low-stakes tests).

---

## Step 6: Tue May 12 — Reddit launch

1. **8:45am UK:** open `posts/r-languageteachers.md` and copy the title + body
2. **9:00am UK:** submit to r/languageteachers, flair "Resource" (or whatever the sub uses)
3. **9:00am-11:00am UK:** check every 15 min for comments, reply substantively
4. **11:00am UK:** read the first 3 comments — anything new in the framing? Update r/ESL_Teachers post if needed.
5. **2:00pm UK:** open `posts/r-eslteachers.md`, post to r/ESL_Teachers
6. **2:00pm-6:00pm UK:** monitor both threads. Reply to every comment within 30 min.
7. **Evening:** if r/languagelearning mod replied with approval, schedule that post for Wed afternoon UK; otherwise hold it.

---

## Step 7: Wed May 13 — Show HN

1. **1:55pm UK:** confirm `https://slatework.tools` returns 200, AI endpoints respond, `/privacy` is current
2. **2:00pm UK sharp:** open `posts/show-hn.md`, copy title + URL + body, submit at https://news.ycombinator.com/submit
3. **2:00pm-8:00pm UK:** be present. Refresh every 10 min for first hour, every 30 min for next 5 hours.
4. **First 90 minutes:** the first substantial reply is the most important. Reply with specifics, not ack-and-thank.

---

## Step 8: Thu May 14 — IndieHackers

1. Anytime: open `posts/indiehackers.md`, copy to https://www.indiehackers.com/post (find the right category — likely "Show IH" or "Maker stories")
2. Monitor for ~24h, reply to comments

---

## Step 9: Fri May 15 — Quiet day

No new posts. Read all comments across all four venues. Note recurring questions, country requests, bug reports. This becomes the input for step D (marketing infra).

---

## What I'll be doing in parallel

I (Claude) can help with:

- Drafting comment replies for tough threads — paste me the comment, I'll suggest a reply
- Adjusting the post drafts after Tue/Wed feedback — I can rewrite tone or framing
- Tracking metrics in a simple log — comments / country requests / bug reports / sentiment
- Drafting the first newsletter from real comment patterns — feeds step D
- Adding requested country packs (India, Singapore, Philippines, etc.) — JSON only, fast

Just paste the URL or the comment text and I'll go.

---

## What to do if a post fails

**Definition of "fails":** removed by moderator, or stuck at 1 point with no comments after 4 hours.

- **r/languageteachers:** if removed, DM mods, ask why, edit, ask permission to repost. Don't argue.
- **r/ESL_Teachers:** if removed, the framing is wrong. Skip and post to r/Tutor or r/teaching instead.
- **Show HN:** if it stalls (≤2 points after 4h), HN allows one resubmit after ~6h (different URL/title hash). Wait 6 hours, tighten the title, resubmit. Don't resubmit identical content.
- **IH:** posts rarely "fail" — low engagement is more common than removal. If <3 comments after 24h, ping me — we'll write a follow-up post in 4 weeks with the v0.2 milestone.

**Definition of "succeeds":**
- Reddit: 20+ upvotes, 5+ substantive comments, no removal
- Show HN: front page (~30 points) for any duration
- IH: 5+ comments, 1+ "this is great" reaction
